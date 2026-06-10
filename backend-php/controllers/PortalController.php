<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/pdfService.php';

class PortalController {
    public function login($input, $user) {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            send_error('Invalid credentials', 401);
        }

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Client WHERE portalEmail = ?");
        $stmt->execute([$email]);
        $client = $stmt->fetch();

        if (!$client || empty($client['portalPasswordHash'])) {
            send_error('Invalid credentials', 401);
        }

        if (!password_verify($password, $client['portalPasswordHash'])) {
            send_error('Invalid credentials', 401);
        }

        $tokenPayload = [
            'id' => $client['id'],
            'clinicId' => $client['clinicId'],
            'role' => 'client',
            'name' => $client['name']
        ];
        $token = jwt_sign_access($tokenPayload);

        send_json([
            'token' => $token,
            'client' => [
                'id' => $client['id'],
                'name' => $client['name'],
                'email' => $client['portalEmail'],
                'loyaltyPoints' => intval($client['loyaltyPoints']),
                'loyaltyTier' => $client['loyaltyTier']
            ]
        ]);
    }

    public function getMyAppointments($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("
            SELECT a.*,
                   s.name as staffName, s.role as staffRole,
                   srv.name as serviceName
            FROM Appointment a
            LEFT JOIN Staff s ON a.staffId = s.id
            LEFT JOIN Service srv ON a.serviceId = srv.id
            WHERE a.clientId = ?
            ORDER BY a.date DESC, a.startTime DESC
        ");
        $stmt->execute([$user['id']]);
        $appointments = $stmt->fetchAll();

        $formatted = [];
        foreach ($appointments as $row) {
            $row['staff'] = ['name' => $row['staffName'], 'role' => $row['staffRole']];
            $row['service'] = ['name' => $row['serviceName']];
            unset($row['staffName'], $row['staffRole'], $row['serviceName']);
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function bookAppointment($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $branchId = $input['branchId'] ?? null;
        $staffId = $input['staffId'] ?? '';
        $serviceId = $input['serviceId'] ?? null;
        $date = $input['date'] ?? '';
        $startTime = $input['startTime'] ?? '';
        $endTime = $input['endTime'] ?? '';
        $duration = intval($input['duration'] ?? 0);
        $price = floatval($input['price'] ?? 0);
        $specialty = $input['specialty'] ?? '';
        $notes = $input['notes'] ?? null;
        $room = $input['room'] ?? null;
        
        if (empty($staffId) || empty($date) || empty($startTime) || empty($endTime)) {
            send_error('staffId, date, startTime, and endTime are required', 400);
        }

        $stmt = $db->prepare("INSERT INTO Appointment (id, clinicId, branchId, clientId, staffId, serviceId, date, startTime, endTime, duration, status, room, notes, price, specialty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $branchId, $user['id'], $staffId, $serviceId, $date, $startTime, $endTime, $duration, $room, $notes, $price, $specialty
        ]);

        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ?");
        $stmt->execute([$id]);
        $appt = $stmt->fetch();

        send_json($appt, 201);
    }

    public function getMyInvoices($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Invoice WHERE clientId = ? ORDER BY createdAt DESC");
        $stmt->execute([$user['id']]);
        $invoices = $stmt->fetchAll();

        foreach ($invoices as &$inv) {
            $inv['items'] = json_decode($inv['items'], true) ?: [];
        }
        send_json($invoices);
    }

    public function downloadInvoice($input, $user, $id) {
        $db = DB::getConnection();
        
        // Find invoice
        $stmtInvoice = $db->prepare("SELECT * FROM Invoice WHERE id = ? AND clientId = ?");
        $stmtInvoice->execute([$id, $user['id']]);
        $invoice = $stmtInvoice->fetch();
        if (!$invoice) {
            send_error('Invoice not found', 404);
        }

        // Find client
        $stmtClient = $db->prepare("SELECT * FROM Client WHERE id = ?");
        $stmtClient->execute([$user['id']]);
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

    public function getMyPackages($input, $user) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("
            SELECT cp.*,
                   p.name as packageName, p.description as packageDescription, p.totalPrice as packagePrice
            FROM ClientPackage cp
            JOIN Package p ON cp.packageId = p.id
            WHERE cp.clientId = ?
        ");
        $stmt->execute([$user['id']]);
        $clientPackages = $stmt->fetchAll();

        foreach ($clientPackages as &$cp) {
            $cp['package'] = [
                'id' => $cp['packageId'],
                'name' => $cp['packageName'],
                'description' => $cp['packageDescription'],
                'totalPrice' => $cp['packagePrice']
            ];
            unset($cp['packageName'], $cp['packageDescription'], $cp['packagePrice']);
        }
        send_json($clientPackages);
    }

    public function submitFeedback($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $appointmentId = $input['appointmentId'] ?? null;
        $staffRating = intval($input['staffRating'] ?? 5);
        $serviceRating = intval($input['serviceRating'] ?? 5);
        $overallRating = intval($input['overallRating'] ?? 5);
        $comment = $input['comment'] ?? null;
        $wouldRecommend = !isset($input['wouldRecommend']) || !empty($input['wouldRecommend']) ? 1 : 0;
        $isPublic = !empty($input['isPublic']) ? 1 : 0;

        $staffId = null;
        if (!empty($appointmentId)) {
            $stmtAppt = $db->prepare("SELECT staffId FROM Appointment WHERE id = ?");
            $stmtAppt->execute([$appointmentId]);
            $staffId = $stmtAppt->fetchColumn() ?: null;
        }

        $stmt = $db->prepare("INSERT INTO Feedback (id, clinicId, clientId, appointmentId, staffRating, serviceRating, overallRating, comment, wouldRecommend, isPublic, staffId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $user['id'], $appointmentId, $staffRating, $serviceRating, $overallRating, $comment, $wouldRecommend, $isPublic, $staffId
        ]);

        $stmtFetch = $db->prepare("SELECT * FROM Feedback WHERE id = ?");
        $stmtFetch->execute([$id]);
        $fb = $stmtFetch->fetch();

        send_json($fb, 201);
    }
}
