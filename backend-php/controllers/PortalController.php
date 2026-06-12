<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/pdfService.php';

class PortalController {
    private function clientIp() {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = explode(',', $_SERVER[$key])[0];
                return substr(trim($ip), 0, 45);
            }
        }
        return 'unknown';
    }

    private function recordLoginAttempt($db, $email, $success) {
        $stmt = $db->prepare("INSERT INTO LoginAttempt (email, ip, success, createdAt) VALUES (?, ?, ?, ?)");
        $stmt->execute(['portal:' . strtolower($email), $this->clientIp(), $success ? 1 : 0, date('Y-m-d H:i:s')]);
    }

    private function assertNotRateLimited($db, $email) {
        $windowEmail = date('Y-m-d H:i:s', time() - 15 * 60);
        $stmt = $db->prepare("SELECT COUNT(*) FROM LoginAttempt WHERE email = ? AND success = 0 AND createdAt > ?");
        $stmt->execute(['portal:' . strtolower($email), $windowEmail]);
        if ((int)$stmt->fetchColumn() >= LOGIN_MAX_ATTEMPTS_EMAIL) {
            send_error('Too many failed attempts. Please try again in 15 minutes.', 429);
        }

        $windowIp = date('Y-m-d H:i:s', time() - 60 * 60);
        $stmt = $db->prepare("SELECT COUNT(*) FROM LoginAttempt WHERE ip = ? AND success = 0 AND createdAt > ?");
        $stmt->execute([$this->clientIp(), $windowIp]);
        if ((int)$stmt->fetchColumn() >= LOGIN_MAX_ATTEMPTS_IP) {
            send_error('Too many requests from this network. Please try again later.', 429);
        }
    }

    private function assertClinicRecord($db, $table, $id, $clinicId, $extraWhere = '') {
        if ($id === null || $id === '') return;
        $sql = "SELECT * FROM $table WHERE id = ? AND clinicId = ?" . $extraWhere;
        $stmt = $db->prepare($sql);
        $stmt->execute([$id, $clinicId]);
        $row = $stmt->fetch();
        if (!$row) {
            send_error('Selected record is unavailable', 400);
        }
        return $row;
    }

    public function login($input, $user) {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            send_error('Invalid credentials', 401);
        }

        $db = DB::getConnection();
        $this->assertNotRateLimited($db, $email);
        $stmt = $db->prepare("SELECT * FROM Client WHERE portalEmail = ?");
        $stmt->execute([$email]);
        $client = $stmt->fetch();

        if (!$client || empty($client['portalPasswordHash'])) {
            $this->recordLoginAttempt($db, $email, false);
            send_error('Invalid credentials', 401);
        }

        if (!password_verify($password, $client['portalPasswordHash'])) {
            $this->recordLoginAttempt($db, $email, false);
            send_error('Invalid credentials', 401);
        }
        $this->recordLoginAttempt($db, $email, true);

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
            WHERE a.clientId = ? AND a.clinicId = ?
            ORDER BY a.date DESC, a.startTime DESC
        ");
        $stmt->execute([$user['id'], $user['clinicId']]);
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
        $price = 0;
        $specialty = $input['specialty'] ?? '';
        $notes = $input['notes'] ?? null;
        $room = $input['room'] ?? null;
        
        if (empty($staffId) || empty($date) || empty($startTime) || empty($endTime)) {
            send_error('staffId, date, startTime, and endTime are required', 400);
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
            send_error('Invalid date, startTime, or endTime format', 400);
        }
        if (strtotime("$date $startTime") <= time() || strtotime("$date $endTime") <= strtotime("$date $startTime")) {
            send_error('Please choose a valid future appointment slot.', 400);
        }

        $staff = $this->assertClinicRecord($db, 'Staff', $staffId, $user['clinicId'], " AND status = 'active'");
        if (!empty($branchId)) {
            $this->assertClinicRecord($db, 'Branch', $branchId, $user['clinicId'], " AND isActive = 1");
        }
        if (!empty($serviceId)) {
            $service = $this->assertClinicRecord($db, 'Service', $serviceId, $user['clinicId'], " AND isActive = 1");
            $duration = $duration > 0 ? $duration : intval($service['duration'] ?? 0);
            $price = floatval($service['price'] ?? 0);
            $specialty = $service['specialty'] ?: $specialty;
        } else {
            $specialty = $staff['specialty'] ?: $specialty ?: 'general';
        }

        $stmtConflict = $db->prepare("SELECT COUNT(*) FROM Appointment WHERE clinicId = ? AND staffId = ? AND date = ? AND status IN ('confirmed', 'pending') AND startTime < ? AND endTime > ?");
        $stmtConflict->execute([$user['clinicId'], $staffId, $date, $endTime, $startTime]);
        if (intval($stmtConflict->fetchColumn()) > 0) {
            send_error('This slot has just been booked. Please choose another time.', 409);
        }

        $stmt = $db->prepare("INSERT INTO Appointment (id, clinicId, branchId, clientId, staffId, serviceId, date, startTime, endTime, duration, status, room, notes, price, specialty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $branchId, $user['id'], $staffId, $serviceId, $date, $startTime, $endTime, $duration, $room, $notes, $price, $specialty
        ]);

        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $appt = $stmt->fetch();

        send_json($appt, 201);
    }

    public function getMyInvoices($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Invoice WHERE clientId = ? AND clinicId = ? ORDER BY createdAt DESC");
        $stmt->execute([$user['id'], $user['clinicId']]);
        $invoices = $stmt->fetchAll();

        foreach ($invoices as &$inv) {
            $inv['items'] = json_decode($inv['items'], true) ?: [];
        }
        send_json($invoices);
    }

    public function downloadInvoice($input, $user, $id) {
        $db = DB::getConnection();
        
        // Find invoice
        $stmtInvoice = $db->prepare("SELECT * FROM Invoice WHERE id = ? AND clientId = ? AND clinicId = ?");
        $stmtInvoice->execute([$id, $user['id'], $user['clinicId']]);
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
            WHERE cp.clientId = ? AND cp.clinicId = ? AND p.clinicId = ?
        ");
        $stmt->execute([$user['id'], $user['clinicId'], $user['clinicId']]);
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
            $stmtAppt = $db->prepare("SELECT staffId FROM Appointment WHERE id = ? AND clientId = ? AND clinicId = ?");
            $stmtAppt->execute([$appointmentId, $user['id'], $user['clinicId']]);
            $staffId = $stmtAppt->fetchColumn() ?: null;
            if ($staffId === null) {
                send_error('Appointment not found', 404);
            }
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
