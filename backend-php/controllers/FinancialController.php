<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class FinancialController {
    public function getSummary($input, $user) {
        $db = DB::getConnection();
        
        // Paid invoices
        $stmtPaid = $db->prepare("SELECT total FROM Invoice WHERE clinicId = ? AND status = 'paid'");
        $stmtPaid->execute([$user['clinicId']]);
        $paidInvoices = $stmtPaid->fetchAll();

        // Pending invoices
        $stmtPending = $db->prepare("SELECT total FROM Invoice WHERE clinicId = ? AND status = 'pending'");
        $stmtPending->execute([$user['clinicId']]);
        $pendingInvoices = $stmtPending->fetchAll();

        $totalRevenue = 0.0;
        foreach ($paidInvoices as $inv) {
            $totalRevenue += floatval($inv['total']);
        }

        $outstandingPayments = 0.0;
        foreach ($pendingInvoices as $inv) {
            $outstandingPayments += floatval($inv['total']);
        }

        send_json([
            'totalRevenue' => $totalRevenue,
            'totalExpenses' => 0,
            'netProfit' => $totalRevenue,
            'outstandingPayments' => $outstandingPayments,
            'revenueGrowth' => 0,
            'expenseGrowth' => 0,
            'profitGrowth' => 0
        ]);
    }

    public function getMonthly($input, $user) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("
            SELECT i.total, i.createdAt, a.specialty
            FROM Invoice i
            LEFT JOIN Appointment a ON i.appointmentId = a.id
            WHERE i.clinicId = ? AND i.status = 'paid'
        ");
        $stmt->execute([$user['clinicId']]);
        $invoices = $stmt->fetchAll();

        $monthly = [];
        foreach ($invoices as $inv) {
            $date = strtotime($inv['createdAt']);
            $month = date('M y', $date); // e.g. "Jun 26"
            
            if (!isset($monthly[$month])) {
                $monthly[$month] = [
                    'month' => $month,
                    'dental' => 0.0,
                    'total' => 0.0
                ];
            }
            
            $specialty = !empty($inv['specialty']) ? $inv['specialty'] : 'dental';
            if (!isset($monthly[$month][$specialty])) {
                $monthly[$month][$specialty] = 0.0;
            }
            
            $monthly[$month][$specialty] += floatval($inv['total']);
            $monthly[$month]['total'] += floatval($inv['total']);
        }

        // Return list of grouped values
        send_json(array_values($monthly));
    }

    public function getTransactions($input, $user) {
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $offset = ($page - 1) * $limit;

        $db = DB::getConnection();
        
        $sql = "SELECT i.*, 
                       c.name as clientName,
                       a.specialty, 
                       srv.name as serviceName
                FROM Invoice i
                LEFT JOIN Client c ON i.clientId = c.id
                LEFT JOIN Appointment a ON i.appointmentId = a.id
                LEFT JOIN Service srv ON a.serviceId = srv.id
                WHERE i.clinicId = ?
                ORDER BY i.createdAt DESC
                LIMIT ? OFFSET ?";
        
        $stmt = $db->prepare($sql);
        $stmt->bindValue(1, $user['clinicId']);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $invoices = $stmt->fetchAll();

        $formatted = [];
        foreach ($invoices as $row) {
            $row['client'] = ['name' => $row['clientName']];
            $row['appointment'] = [
                'specialty' => $row['specialty'],
                'service' => ['name' => $row['serviceName']]
            ];
            $row['items'] = json_decode($row['items'], true) ?: [];
            
            unset($row['clientName'], $row['specialty'], $row['serviceName']);
            $formatted[] = $row;
        }

        send_json($formatted);
    }
}
