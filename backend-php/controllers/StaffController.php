<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class StaffController {
    private function assertBranchInClinic($db, $branchId, $clinicId) {
        if (empty($branchId)) return;
        $stmt = $db->prepare("SELECT id FROM Branch WHERE id = ? AND clinicId = ? AND isActive = 1");
        $stmt->execute([$branchId, $clinicId]);
        if (!$stmt->fetch()) send_error('Branch not found for this clinic', 400);
    }

    public function list($input, $user) {
        $specialty = $_GET['specialty'] ?? '';
        $status = $_GET['status'] ?? '';
        $branchId = $_GET['branchId'] ?? '';

        $db = DB::getConnection();
        $where = ["clinicId = ?"];
        $params = [$user['clinicId']];

        if (!empty($specialty) && $specialty !== 'all') {
            $where[] = "specialty = ?";
            $params[] = $specialty;
        }
        if (!empty($status)) {
            $where[] = "status = ?";
            $params[] = $status;
        } else {
            // Hide soft-deleted (deactivated) staff from the default list
            $where[] = "status != 'inactive'";
        }
        if (!empty($branchId)) {
            $where[] = "branchId = ?";
            $params[] = $branchId;
        }

        $whereSql = implode(" AND ", $where);
        $stmt = $db->prepare("SELECT * FROM Staff WHERE $whereSql ORDER BY name ASC");
        $stmt->execute($params);
        $staff = $stmt->fetchAll();

        send_json($staff);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Staff WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $staff = $stmt->fetch();

        if (!$staff) {
            send_error('Staff member not found', 404);
        }
        send_json($staff);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $role = $input['role'] ?? '';
        $specialty = $input['specialty'] ?? '';
        $designation = $input['designation'] ?? $role;
        $phone = $input['phone'] ?? null;
        $email = $input['email'] ?? null;
        $loginEmail = $input['loginEmail'] ?? $email;
        $avatar = $input['avatar'] ?? null;
        
        if (empty($avatar) && !empty($name)) {
            $parts = explode(' ', $name);
            $avatar = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));
            $avatar = substr($avatar, 0, 2);
        }

        $avatarColor = $input['avatarColor'] ?? '#6366f1';
        $qualifications = $input['qualifications'] ?? null;
        $experience = $input['experience'] ?? null;
        $bio = $input['bio'] ?? null;
        $workingDays = $input['workingDays'] ?? 'Mon,Tue,Wed,Thu,Fri';
        $workingHours = $input['workingHours'] ?? '09:00-17:00';
        $status = $input['status'] ?? 'active';
        $rating = floatval($input['rating'] ?? 5.0);
        $compensationType = $input['compensationType'] ?? 'commission';
        $fixedSalary = floatval($input['fixedSalary'] ?? 0.0);
        $commissionRate = floatval($input['commissionRate'] ?? 0.0);

        $treatmentCommissionRates = $input['treatmentCommissionRates'] ?? '{}';
        if (is_array($treatmentCommissionRates)) {
            $treatmentCommissionRates = json_encode($treatmentCommissionRates);
        }

        $portalRole = $input['portalRole'] ?? null;
        if (empty($portalRole) && !empty($role)) {
            $portalRole = stripos($role, 'reception') !== false ? 'receptionist' : 'doctor';
        }

        $inviteStatus = 'ready';
        $lastInviteSent = null;
        if (!empty($input['sendCredentials'])) {
            $inviteStatus = 'sent';
            $lastInviteSent = date('Y-m-d H:i:s');
        }

        $branchId = $input['branchId'] ?? null;
        $this->assertBranchInClinic($db, $branchId, $user['clinicId']);

        $stmt = $db->prepare("INSERT INTO Staff (id, clinicId, branchId, name, role, designation, specialty, phone, email, avatar, avatarColor, qualifications, experience, bio, workingDays, workingHours, status, rating, compensationType, fixedSalary, commissionRate, treatmentCommissionRates, portalRole, loginEmail, inviteStatus, lastInviteSent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $id, $user['clinicId'], $branchId, $name, $role, $designation, $specialty, $phone, $email, $avatar, $avatarColor, $qualifications, $experience, $bio, $workingDays, $workingHours, $status, $rating, $compensationType, $fixedSalary, $commissionRate, $treatmentCommissionRates, $portalRole, $loginEmail, $inviteStatus, $lastInviteSent
        ]);

        $stmt = $db->prepare("SELECT * FROM Staff WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $createdStaff = $stmt->fetch();

        send_json($createdStaff, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Staff WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Staff member not found', 404);
        }
        if (array_key_exists('branchId', $input)) {
            $this->assertBranchInClinic($db, $input['branchId'], $user['clinicId']);
        }

        $fields = [];
        $params = [];

        $updatable = ['branchId', 'name', 'role', 'designation', 'specialty', 'phone', 'email', 'avatar', 'avatarColor', 'qualifications', 'experience', 'bio', 'workingDays', 'workingHours', 'status', 'rating', 'compensationType', 'fixedSalary', 'commissionRate', 'portalRole', 'loginEmail', 'inviteStatus'];
        foreach ($updatable as $key) {
            if (isset($input[$key])) {
                $fields[] = "$key = ?";
                $params[] = $input[$key];
            }
        }

        if (isset($input['treatmentCommissionRates'])) {
            $fields[] = "treatmentCommissionRates = ?";
            $params[] = is_array($input['treatmentCommissionRates']) ? json_encode($input['treatmentCommissionRates']) : $input['treatmentCommissionRates'];
        }

        if (empty($fields)) {
            send_error('No fields to update', 400);
        }

        $params[] = $id;
        $params[] = $user['clinicId'];

        $sql = "UPDATE Staff SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Staff WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Staff member not found', 404);
        }

        $stmt = $db->prepare("UPDATE Staff SET status = 'inactive' WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);

        send_json(['message' => 'Deactivated']);
    }

    public function getPerformance($input, $user, $id) {
        $db = DB::getConnection();
        
        $stmtCheck = $db->prepare("SELECT rating FROM Staff WHERE id = ? AND clinicId = ?");
        $stmtCheck->execute([$id, $user['clinicId']]);
        $rating = $stmtCheck->fetchColumn();
        if ($rating === false) {
            send_error('Staff member not found', 404);
        }

        $firstOfMonth = date('Y-m-01');

        // Total appointments count
        $stmtAll = $db->prepare("SELECT COUNT(*) FROM Appointment WHERE staffId = ? AND clinicId = ?");
        $stmtAll->execute([$id, $user['clinicId']]);
        $allAppts = intval($stmtAll->fetchColumn());

        // Month appointments count
        $stmtMonth = $db->prepare("SELECT COUNT(*) FROM Appointment WHERE staffId = ? AND clinicId = ? AND date >= ?");
        $stmtMonth->execute([$id, $user['clinicId'], $firstOfMonth]);
        $monthAppts = intval($stmtMonth->fetchColumn());

        // Total revenue
        $stmtRev = $db->prepare("
            SELECT SUM(i.total) 
            FROM Invoice i 
            JOIN Appointment a ON i.appointmentId = a.id 
            WHERE a.staffId = ? AND a.clinicId = ?
        ");
        $stmtRev->execute([$id, $user['clinicId']]);
        $revenue = floatval($stmtRev->fetchColumn() ?: 0);

        send_json([
            'allAppointments' => $allAppts,
            'monthAppointments' => $monthAppts,
            'revenue' => $revenue,
            'rating' => floatval($rating)
        ]);
    }
}
