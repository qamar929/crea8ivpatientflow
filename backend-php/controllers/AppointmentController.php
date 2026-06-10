<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/whatsappAutomationService.php';

class AppointmentController {
    private function resolveSpecialty($db, $serviceId, $staffId, $fallback = '') {
        if (!empty($fallback)) return $fallback;
        if (!empty($serviceId)) {
            $stmt = $db->prepare("SELECT specialty FROM Service WHERE id = ?");
            $stmt->execute([$serviceId]);
            $value = $stmt->fetchColumn();
            if (!empty($value)) return $value;
        }
        if (!empty($staffId)) {
            $stmt = $db->prepare("SELECT specialty FROM Staff WHERE id = ?");
            $stmt->execute([$staffId]);
            $value = $stmt->fetchColumn();
            if (!empty($value)) return $value;
        }
        return 'general';
    }

    private function checkConflict($db, $clinicId, $staffId, $date, $startTime, $endTime, $excludeId = null) {
        $sql = "SELECT * FROM Appointment 
                WHERE clinicId = ? 
                  AND staffId = ? 
                  AND date = ? 
                  AND status IN ('confirmed', 'pending') 
                  AND startTime < ? 
                  AND endTime > ?";
        $params = [$clinicId, $staffId, $date, $endTime, $startTime];
        if ($excludeId !== null) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function list($input, $user) {
        $date = $_GET['date'] ?? '';
        $staffId = $_GET['staffId'] ?? '';
        $specialty = $_GET['specialty'] ?? '';
        $status = $_GET['status'] ?? '';
        $branchId = $_GET['branchId'] ?? '';
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';

        $db = DB::getConnection();
        $where = ["a.clinicId = ?"];
        $params = [$user['clinicId']];

        if (!empty($date)) {
            $where[] = "a.date = ?";
            $params[] = $date;
        }
        if (!empty($staffId)) {
            $where[] = "a.staffId = ?";
            $params[] = $staffId;
        }
        if (!empty($specialty)) {
            $where[] = "a.specialty = ?";
            $params[] = $specialty;
        }
        if (!empty($status)) {
            $where[] = "a.status = ?";
            $params[] = $status;
        }
        if (!empty($branchId)) {
            $where[] = "a.branchId = ?";
            $params[] = $branchId;
        }
        if (!empty($from) && !empty($to)) {
            $where[] = "a.date >= ? AND a.date <= ?";
            $params[] = $from;
            $params[] = $to;
        }

        $whereSql = implode(" AND ", $where);
        
        $sql = "SELECT a.*, 
                       c.name as clientName, c.phone as clientPhone, c.avatarColor as clientAvatarColor, c.initials as clientInitials,
                       s.name as staffName, s.role as staffRole, s.avatarColor as staffAvatarColor,
                       srv.name as serviceName
                FROM Appointment a
                LEFT JOIN Client c ON a.clientId = c.id
                LEFT JOIN Staff s ON a.staffId = s.id
                LEFT JOIN Service srv ON a.serviceId = srv.id
                WHERE $whereSql
                ORDER BY a.date ASC, a.startTime ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $appointments = $stmt->fetchAll();

        // format to match prisma include structure
        $formatted = [];
        foreach ($appointments as $row) {
            $row['client'] = [
                'id' => $row['clientId'],
                'name' => $row['clientName'],
                'phone' => $row['clientPhone'],
                'avatarColor' => $row['clientAvatarColor'],
                'initials' => $row['clientInitials']
            ];
            $row['staff'] = [
                'id' => $row['staffId'],
                'name' => $row['staffName'],
                'role' => $row['staffRole'],
                'avatarColor' => $row['staffAvatarColor']
            ];
            $row['service'] = [
                'id' => $row['serviceId'],
                'name' => $row['serviceName']
            ];
            unset(
                $row['clientName'], $row['clientPhone'], $row['clientAvatarColor'], $row['clientInitials'],
                $row['staffName'], $row['staffRole'], $row['staffAvatarColor'], $row['serviceName']
            );
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $sql = "SELECT a.*,
                       c.name as clientName, c.phone as clientPhone, c.email as clientEmail, c.dob as clientDob, c.gender as clientGender, c.patientNo as clientPatientNo, c.avatarColor as clientAvatarColor, c.initials as clientInitials,
                       s.name as staffName, s.role as staffRole, s.avatarColor as staffAvatarColor,
                       srv.name as serviceName
                FROM Appointment a
                LEFT JOIN Client c ON a.clientId = c.id
                LEFT JOIN Staff s ON a.staffId = s.id
                LEFT JOIN Service srv ON a.serviceId = srv.id
                WHERE a.id = ? AND a.clinicId = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$id, $user['clinicId']]);
        $appt = $stmt->fetch();

        if (!$appt) {
            send_error('Appointment not found', 404);
        }

        $appt['client'] = [
            'id' => $appt['clientId'],
            'name' => $appt['clientName'],
            'phone' => $appt['clientPhone'],
            'email' => $appt['clientEmail'],
            'dob' => $appt['clientDob'],
            'gender' => $appt['clientGender'],
            'patientNo' => $appt['clientPatientNo'],
            'avatarColor' => $appt['clientAvatarColor'],
            'initials' => $appt['clientInitials']
        ];
        $appt['staff'] = [
            'id' => $appt['staffId'],
            'name' => $appt['staffName'],
            'role' => $appt['staffRole'],
            'avatarColor' => $appt['staffAvatarColor']
        ];
        $appt['service'] = [
            'id' => $appt['serviceId'],
            'name' => $appt['serviceName']
        ];
        unset(
            $appt['clientName'], $appt['clientPhone'], $appt['clientEmail'], $appt['clientDob'], $appt['clientGender'], $appt['clientPatientNo'], $appt['clientAvatarColor'], $appt['clientInitials'],
            $appt['staffName'], $appt['staffRole'], $appt['staffAvatarColor'], $appt['serviceName']
        );

        send_json($appt);
    }

    public function create($input, $user) {
        $db = DB::getConnection();
        
        $id = generate_uuid();
        $branchId = $input['branchId'] ?? null;
        $clientId = $input['clientId'] ?? '';
        $staffId = $input['staffId'] ?? '';
        $serviceId = $input['serviceId'] ?? null;
        $date = $input['date'] ?? '';
        $startTime = $input['startTime'] ?? '';
        $endTime = $input['endTime'] ?? '';
        $duration = intval($input['duration'] ?? 0);
        $price = floatval($input['price'] ?? 0);
        $specialty = $this->resolveSpecialty($db, $serviceId, $staffId, $input['specialty'] ?? '');
        $room = $input['room'] ?? null;
        $notes = $input['notes'] ?? null;
        $status = $input['status'] ?? 'pending';

        if (empty($clientId) || empty($staffId) || empty($date) || empty($startTime) || empty($endTime)) {
            send_error('clientId, staffId, date, startTime, and endTime are required', 400);
        }

        // Conflict check
        $conflicts = $this->checkConflict($db, $user['clinicId'], $staffId, $date, $startTime, $endTime);
        if (!empty($conflicts)) {
            send_error('Time slot conflict: staff already has an appointment in this period', 409, ['conflicts' => $conflicts]);
        }

        // Get Client name for QR code
        $stmtClient = $db->prepare("SELECT name FROM Client WHERE id = ?");
        $stmtClient->execute([$clientId]);
        $clientName = $stmtClient->fetchColumn() ?: 'Client';

        $qrCode = generate_qr_data_url($id, $clientName, $date, $startTime);

        $stmt = $db->prepare("INSERT INTO Appointment (id, clinicId, branchId, clientId, staffId, serviceId, date, startTime, endTime, duration, status, room, notes, price, specialty, qrCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $branchId, $clientId, $staffId, $serviceId, $date, $startTime, $endTime, $duration, $status, $room, $notes, $price, $specialty, $qrCode
        ]);

        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ?");
        $stmt->execute([$id]);
        $appt = $stmt->fetch();

        whatsapp_automation_dispatch_trigger($user['clinicId'], 'appointment_booked', $id, $clientId);
        send_json($appt, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $existing = $stmt->fetch();

        if (!$existing) {
            send_error('Appointment not found', 404);
        }

        $staffId = $input['staffId'] ?? $existing['staffId'];
        $serviceId = $input['serviceId'] ?? $existing['serviceId'];
        $date = $input['date'] ?? $existing['date'];
        $startTime = $input['startTime'] ?? $existing['startTime'];
        $endTime = $input['endTime'] ?? $existing['endTime'];

        // If time details updated, run conflict check
        if (isset($input['staffId']) || isset($input['date']) || isset($input['startTime']) || isset($input['endTime'])) {
            $conflicts = $this->checkConflict($db, $user['clinicId'], $staffId, $date, $startTime, $endTime, $id);
            if (!empty($conflicts)) {
                send_error('Time slot conflict', 409, ['conflicts' => $conflicts]);
            }
        }

        $fields = [];
        $params = [];
        if (!isset($input['specialty']) && (isset($input['serviceId']) || isset($input['staffId']))) {
            $input['specialty'] = $this->resolveSpecialty($db, $serviceId, $staffId, $existing['specialty'] ?? '');
        }
        $updatable = ['branchId', 'clientId', 'staffId', 'serviceId', 'date', 'startTime', 'endTime', 'duration', 'status', 'room', 'notes', 'price', 'specialty'];
        foreach ($updatable as $key) {
            if (isset($input[$key])) {
                $fields[] = "$key = ?";
                $params[] = $input[$key];
            }
        }

        if (empty($fields)) {
            send_error('No fields to update', 400);
        }

        $params[] = $id;
        $params[] = $user['clinicId'];

        $sql = "UPDATE Appointment SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ?");
        $stmt->execute([$id]);
        $appt = $stmt->fetch();

        send_json($appt);
    }

    public function cancel($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("UPDATE Appointment SET status = 'cancelled' WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        send_json(['message' => 'Cancelled']);
    }

    public function checkIn($input, $user, $id) {
        $db = DB::getConnection();
        
        // Find appointment
        $stmt = $db->prepare("SELECT * FROM Appointment WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $appt = $stmt->fetch();
        if (!$appt) {
            send_error('Appointment not found', 404);
        }

        // Perform check-in
        $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("UPDATE Appointment SET checkedIn = 1, checkinTime = ?, status = 'confirmed' WHERE id = ?");
        $stmt->execute([$now, $id]);

        // Award loyalty points
        $points = floor(floatval($appt['price']) / 100);
        if ($points > 0) {
            $stmt = $db->prepare("UPDATE Client SET loyaltyPoints = loyaltyPoints + ? WHERE id = ?");
            $stmt->execute([$points, $appt['clientId']]);
        }

        send_json(['message' => 'Checked in']);
    }

    public function getToday($input, $user) {
        $db = DB::getConnection();
        $today = date('Y-m-d');
        
        $sql = "SELECT a.*, 
                       c.name as clientName, c.avatarColor as clientAvatarColor, c.initials as clientInitials,
                       s.name as staffName,
                       srv.name as serviceName
                FROM Appointment a
                LEFT JOIN Client c ON a.clientId = c.id
                LEFT JOIN Staff s ON a.staffId = s.id
                LEFT JOIN Service srv ON a.serviceId = srv.id
                WHERE a.clinicId = ? AND a.date = ?
                ORDER BY a.startTime ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute([$user['clinicId'], $today]);
        $appointments = $stmt->fetchAll();

        $formatted = [];
        foreach ($appointments as $row) {
            $row['client'] = [
                'id' => $row['clientId'],
                'name' => $row['clientName'],
                'avatarColor' => $row['clientAvatarColor'],
                'initials' => $row['clientInitials']
            ];
            $row['staff'] = [
                'id' => $row['staffId'],
                'name' => $row['staffName']
            ];
            $row['service'] = [
                'id' => $row['serviceId'],
                'name' => $row['serviceName']
            ];
            unset(
                $row['clientName'], $row['clientAvatarColor'], $row['clientInitials'],
                $row['staffName'], $row['serviceName']
            );
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function getConflicts($input, $user) {
        $staffId = $_GET['staffId'] ?? '';
        $date = $_GET['date'] ?? '';
        $startTime = $_GET['startTime'] ?? '';
        $endTime = $_GET['endTime'] ?? '';

        if (empty($staffId) || empty($date) || empty($startTime) || empty($endTime)) {
            send_error('staffId, date, startTime, and endTime are required', 400);
        }

        $db = DB::getConnection();
        $conflicts = $this->checkConflict($db, $user['clinicId'], $staffId, $date, $startTime, $endTime);
        
        send_json([
            'hasConflict' => !empty($conflicts),
            'conflicts' => $conflicts
        ]);
    }
}
