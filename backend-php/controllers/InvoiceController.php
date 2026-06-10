<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/pdfService.php';

class InvoiceController {
    private function generateInvoiceNo($prefix = 'INV') {
        $year = date('Y');
        $rand = rand(1000, 9999);
        return "$prefix-$year-$rand";
    }

    private function calculateTotals($items, $discountPercent = 0, $taxPercent = 0, $previousBalance = 0, $amountPaid = 0) {
        $parsedItems = is_array($items) ? $items : (json_decode($items, true) ?: []);
        $subtotal = 0;

        foreach ($parsedItems as &$item) {
            $qty = intval($item['qty'] ?? 1);
            $unitPrice = floatval($item['unitPrice'] ?? $item['price'] ?? 0);
            $item['qty'] = $qty;
            $item['unitPrice'] = $unitPrice;
            if (empty($item['description']) && !empty($item['name'])) {
                $item['description'] = $item['name'];
            }
            $subtotal += ($qty * $unitPrice);
        }

        $discountAmt = ($subtotal * floatval($discountPercent)) / 100;
        $taxAmt = (($subtotal - $discountAmt) * floatval($taxPercent)) / 100;
        $total = $subtotal - $discountAmt + $taxAmt;
        $grandTotal = $total + floatval($previousBalance);
        $paid = floatval($amountPaid);
        $balanceDue = max(0.0, $grandTotal - $paid);
        $status = 'pending';
        if ($balanceDue <= 0) {
            $status = 'paid';
        } else if ($paid > 0) {
            $status = 'partial';
        }

        return [
            'items' => $parsedItems,
            'subtotal' => $subtotal,
            'discount' => $discountAmt,
            'tax' => $taxAmt,
            'total' => $total,
            'grandTotal' => $grandTotal,
            'amountPaid' => $paid,
            'balanceDue' => $balanceDue,
            'status' => $status
        ];
    }

    private function recomputeClientTotals($db, $clinicId, $clientId) {
        if (empty($clientId)) {
            return;
        }

        $stmt = $db->prepare("
            SELECT invoiceNo, amountPaid, balanceDue, status, createdAt
            FROM Invoice
            WHERE clinicId = ? AND clientId = ? AND status != 'refunded'
            ORDER BY createdAt DESC
        ");
        $stmt->execute([$clinicId, $clientId]);
        $rows = $stmt->fetchAll();

        $totalSpent = 0;
        $outstandingBalance = 0;
        $latestInvoiceNo = null;

        foreach ($rows as $idx => $row) {
            $totalSpent += floatval($row['amountPaid'] ?? 0);
            $outstandingBalance += floatval($row['balanceDue'] ?? 0);
            if ($idx === 0) {
                $latestInvoiceNo = $row['invoiceNo'];
            }
        }

        $stmtUpdate = $db->prepare("UPDATE Client SET totalSpent = ?, outstandingBalance = ?, latestInvoiceNo = ? WHERE id = ? AND clinicId = ?");
        $stmtUpdate->execute([$totalSpent, $outstandingBalance, $latestInvoiceNo, $clientId, $clinicId]);
    }

    public function list($input, $user) {
        $status = $_GET['status'] ?? '';
        $clientId = $_GET['clientId'] ?? '';
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        $search = $_GET['search'] ?? '';

        $db = DB::getConnection();
        $where = ["i.clinicId = ?"];
        $params = [$user['clinicId']];

        if (!empty($status)) {
            $where[] = "i.status = ?";
            $params[] = $status;
        }
        if (!empty($clientId)) {
            $where[] = "i.clientId = ?";
            $params[] = $clientId;
        }
        if (!empty($from) && !empty($to)) {
            $where[] = "i.createdAt >= ? AND i.createdAt <= ?";
            $params[] = $from . ' 00:00:00';
            $params[] = $to . ' 23:59:59';
        }
        if (!empty($search)) {
            $where[] = "i.invoiceNo LIKE ?";
            $params[] = "%$search%";
        }

        $whereSql = implode(" AND ", $where);
        
        $sql = "SELECT i.*, 
                       c.name as clientName, c.phone as clientPhone
                FROM Invoice i
                LEFT JOIN Client c ON i.clientId = c.id
                WHERE $whereSql
                ORDER BY i.createdAt DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $invoices = $stmt->fetchAll();

        $formatted = [];
        foreach ($invoices as $row) {
            $row['client'] = [
                'id' => $row['clientId'],
                'name' => $row['clientName'],
                'phone' => $row['clientPhone']
            ];
            unset($row['clientName'], $row['clientPhone']);
            $row['items'] = json_decode($row['items'], true) ?: [];
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $sql = "SELECT i.*,
                       c.id as c_id, c.name as c_name, c.phone as c_phone, c.email as c_email, c.dob as c_dob, c.gender as c_gender, c.patientNo as c_patientNo, c.avatarColor as c_avatarColor, c.initials as c_initials, c.outstandingBalance as c_outstandingBalance,
                       a.id as a_id, a.date as a_date, a.startTime as a_startTime, a.endTime as a_endTime, a.status as a_status
                FROM Invoice i
                LEFT JOIN Client c ON i.clientId = c.id
                LEFT JOIN Appointment a ON i.appointmentId = a.id
                WHERE i.id = ? AND i.clinicId = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$id, $user['clinicId']]);
        $row = $stmt->fetch();

        if (!$row) {
            send_error('Invoice not found', 404);
        }

        $row['items'] = json_decode($row['items'], true) ?: [];
        $row['client'] = [
            'id' => $row['c_id'],
            'name' => $row['c_name'],
            'phone' => $row['c_phone'],
            'email' => $row['c_email'],
            'dob' => $row['c_dob'],
            'gender' => $row['c_gender'],
            'patientNo' => $row['c_patientNo'],
            'avatarColor' => $row['c_avatarColor'],
            'initials' => $row['c_initials'],
            'outstandingBalance' => floatval($row['c_outstandingBalance'])
        ];
        
        if ($row['appointmentId']) {
            $row['appointment'] = [
                'id' => $row['a_id'],
                'date' => $row['a_date'],
                'startTime' => $row['a_startTime'],
                'endTime' => $row['a_endTime'],
                'status' => $row['a_status']
            ];
        } else {
            $row['appointment'] = null;
        }

        unset(
            $row['c_id'], $row['c_name'], $row['c_phone'], $row['c_email'], $row['c_dob'], $row['c_gender'], $row['c_patientNo'], $row['c_avatarColor'], $row['c_initials'], $row['c_outstandingBalance'],
            $row['a_id'], $row['a_date'], $row['a_startTime'], $row['a_endTime'], $row['a_status']
        );

        send_json($row);
    }

    public function create($input, $user) {
        $clientId = $input['clientId'] ?? '';
        $appointmentId = $input['appointmentId'] ?? null;
        $items = $input['items'] ?? [];
        $discount = floatval($input['discount'] ?? 0);
        $tax = floatval($input['tax'] ?? 0);
        $paymentMethod = $input['paymentMethod'] ?? null;
        $notes = $input['notes'] ?? null;
        $dueDate = $input['dueDate'] ?? null;
        $amountPaid = floatval($input['amountPaid'] ?? 0);

        if (empty($clientId)) {
            send_error('clientId is required', 400);
        }

        $db = DB::getConnection();
        
        // Find client
        $stmtClient = $db->prepare("SELECT * FROM Client WHERE id = ? AND clinicId = ?");
        $stmtClient->execute([$clientId, $user['clinicId']]);
        $client = $stmtClient->fetch();

        if (!$client) {
            send_error('Client not found', 404);
        }

        // Find Clinic prefix
        $stmtClinic = $db->prepare("SELECT invoicePrefix FROM Clinic WHERE id = ?");
        $stmtClinic->execute([$user['clinicId']]);
        $prefix = $stmtClinic->fetchColumn() ?: 'INV';

        $previousBalance = floatval($client['outstandingBalance'] ?? 0);
        $totals = $this->calculateTotals($items, $discount, $tax, $previousBalance, $amountPaid);

        $invoiceId = generate_uuid();
        $invoiceNo = $this->generateInvoiceNo($prefix);

        try {
            $db->beginTransaction();

            $stmtInsert = $db->prepare("
                INSERT INTO Invoice (id, clinicId, clientId, appointmentId, invoiceNo, items, subtotal, previousBalance, discount, tax, total, grandTotal, amountPaid, balanceDue, status, paymentMethod, notes, dueDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtInsert->execute([
                $invoiceId, $user['clinicId'], $clientId, $appointmentId, $invoiceNo, json_encode($totals['items']), $totals['subtotal'], $previousBalance, $totals['discount'], $totals['tax'], $totals['total'], $totals['grandTotal'], $totals['amountPaid'], $totals['balanceDue'], $totals['status'], $paymentMethod, $notes, $dueDate
            ]);

            $this->recomputeClientTotals($db, $user['clinicId'], $clientId);

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM Invoice WHERE id = ?");
            $stmtFetch->execute([$invoiceId]);
            $createdInvoice = $stmtFetch->fetch();
            $createdInvoice['items'] = json_decode($createdInvoice['items'], true) ?: [];

            send_json($createdInvoice, 201);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();

        $stmtExisting = $db->prepare("SELECT * FROM Invoice WHERE id = ? AND clinicId = ?");
        $stmtExisting->execute([$id, $user['clinicId']]);
        $existing = $stmtExisting->fetch();

        if (!$existing) {
            send_error('Invoice not found', 404);
        }

        $clientId = $input['clientId'] ?? $existing['clientId'];
        $appointmentId = array_key_exists('appointmentId', $input) ? ($input['appointmentId'] ?: null) : $existing['appointmentId'];
        $items = array_key_exists('items', $input) ? $input['items'] : (json_decode($existing['items'], true) ?: []);
        $discountPercent = floatval($input['discountPercent'] ?? $input['discountRate'] ?? $input['discount'] ?? 0);
        $taxPercent = floatval($input['taxPercent'] ?? $input['taxRate'] ?? $input['tax'] ?? 0);
        $previousBalance = floatval($input['previousBalance'] ?? $existing['previousBalance']);
        $amountPaid = floatval($input['amountPaid'] ?? $existing['amountPaid']);
        $paymentMethod = array_key_exists('paymentMethod', $input) ? $input['paymentMethod'] : $existing['paymentMethod'];
        $notes = array_key_exists('notes', $input) ? $input['notes'] : $existing['notes'];
        $dueDate = array_key_exists('dueDate', $input) ? ($input['dueDate'] ?: null) : $existing['dueDate'];
        $status = $input['status'] ?? null;

        $stmtClient = $db->prepare("SELECT id FROM Client WHERE id = ? AND clinicId = ?");
        $stmtClient->execute([$clientId, $user['clinicId']]);
        if (!$stmtClient->fetch()) {
            send_error('Client not found', 404);
        }

        $totals = $this->calculateTotals($items, $discountPercent, $taxPercent, $previousBalance, $amountPaid);
        $finalStatus = $status ?: $totals['status'];
        $paidAt = $finalStatus === 'paid' ? ($existing['paidAt'] ?: date('Y-m-d H:i:s')) : null;

        try {
            $db->beginTransaction();

            $stmtUpdate = $db->prepare("
                UPDATE Invoice
                SET clientId = ?, appointmentId = ?, items = ?, subtotal = ?, previousBalance = ?, discount = ?, tax = ?, total = ?, grandTotal = ?, amountPaid = ?, balanceDue = ?, status = ?, paymentMethod = ?, notes = ?, dueDate = ?, paidAt = ?
                WHERE id = ? AND clinicId = ?
            ");
            $stmtUpdate->execute([
                $clientId,
                $appointmentId,
                json_encode($totals['items']),
                $totals['subtotal'],
                $previousBalance,
                $totals['discount'],
                $totals['tax'],
                $totals['total'],
                $totals['grandTotal'],
                $totals['amountPaid'],
                $totals['balanceDue'],
                $finalStatus,
                $paymentMethod,
                $notes,
                $dueDate,
                $paidAt,
                $id,
                $user['clinicId']
            ]);

            $this->recomputeClientTotals($db, $user['clinicId'], $existing['clientId']);
            if ($clientId !== $existing['clientId']) {
                $this->recomputeClientTotals($db, $user['clinicId'], $clientId);
            }

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM Invoice WHERE id = ?");
            $stmtFetch->execute([$id]);
            $updated = $stmtFetch->fetch();
            $updated['items'] = json_decode($updated['items'], true) ?: [];

            send_json($updated);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function markPaid($input, $user, $id) {
        $paymentMethod = $input['paymentMethod'] ?? null;
        $amountPaid = isset($input['amountPaid']) ? floatval($input['amountPaid']) : null;

        $db = DB::getConnection();
        
        $stmt = $db->prepare("SELECT * FROM Invoice WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $existing = $stmt->fetch();

        if (!$existing) {
            send_error('Invoice not found', 404);
        }

        $grandTotal = floatval($existing['grandTotal'] ?: $existing['total']);
        $paid = $amountPaid === null ? $grandTotal : $amountPaid;
        $balanceDue = max(0.0, $grandTotal - $paid);
        $status = $balanceDue <= 0 ? 'paid' : 'partial';
        $paidAt = $balanceDue <= 0 ? date('Y-m-d H:i:s') : null;

        $diffPaid = max(0.0, $paid - floatval($existing['amountPaid']));

        try {
            $db->beginTransaction();

            $stmtUpdate = $db->prepare("UPDATE Invoice SET status = ?, amountPaid = ?, balanceDue = ?, paymentMethod = ?, paidAt = ? WHERE id = ?");
            $stmtUpdate->execute([$status, $paid, $balanceDue, $paymentMethod, $paidAt, $id]);

            $this->recomputeClientTotals($db, $user['clinicId'], $existing['clientId']);

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM Invoice WHERE id = ?");
            $stmtFetch->execute([$id]);
            $updated = $stmtFetch->fetch();
            $updated['items'] = json_decode($updated['items'], true) ?: [];

            send_json($updated);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function refund($input, $user, $id) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("SELECT clientId, amountPaid FROM Invoice WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $invoice = $stmt->fetch();
        if (!$invoice) {
            send_error('Invoice not found', 404);
        }

        try {
            $db->beginTransaction();

            $stmtUpdate = $db->prepare("UPDATE Invoice SET status = 'refunded' WHERE id = ?");
            $stmtUpdate->execute([$id]);

            $this->recomputeClientTotals($db, $user['clinicId'], $invoice['clientId']);

            $db->commit();
            send_json(['message' => 'Refunded']);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();

        $stmt = $db->prepare("SELECT clientId FROM Invoice WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $invoice = $stmt->fetch();

        if (!$invoice) {
            send_error('Invoice not found', 404);
        }

        try {
            $db->beginTransaction();

            $stmtDelete = $db->prepare("DELETE FROM Invoice WHERE id = ? AND clinicId = ?");
            $stmtDelete->execute([$id, $user['clinicId']]);

            $this->recomputeClientTotals($db, $user['clinicId'], $invoice['clientId']);

            $db->commit();
            send_json(['message' => 'Deleted']);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function getPDF($input, $user, $id) {
        $db = DB::getConnection();
        
        // Find invoice
        $stmtInvoice = $db->prepare("SELECT * FROM Invoice WHERE id = ? AND clinicId = ?");
        $stmtInvoice->execute([$id, $user['clinicId']]);
        $invoice = $stmtInvoice->fetch();
        if (!$invoice) {
            send_error('Invoice not found', 404);
        }

        // Find client
        $stmtClient = $db->prepare("SELECT * FROM Client WHERE id = ?");
        $stmtClient->execute([$invoice['clientId']]);
        $client = $stmtClient->fetch();

        // Find clinic
        $stmtClinic = $db->prepare("SELECT * FROM Clinic WHERE id = ?");
        $stmtClinic->execute([$user['clinicId']]);
        $clinic = $stmtClinic->fetch();

        try {
            $pdfContent = generateInvoicePDF($invoice, $client, $clinic);
            
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $invoice['invoiceNo'] . '.pdf"');
            echo $pdfContent;
            exit;
        } catch (Exception $e) {
            send_error($e->getMessage(), 500);
        }
    }
}
