<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class BranchController {
    public function list($input, $user) {
        $db = DB::getConnection();
        
        $sql = "SELECT b.*,
                       (SELECT COUNT(*) FROM Staff s WHERE s.branchId = b.id) as staffCount,
                       (SELECT COUNT(*) FROM Appointment a WHERE a.branchId = b.id) as appointmentCount
                FROM Branch b
                WHERE b.clinicId = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([$user['clinicId']]);
        $branches = $stmt->fetchAll();

        $formatted = [];
        foreach ($branches as $row) {
            $row['_count'] = [
                'staff' => intval($row['staffCount']),
                'appointments' => intval($row['appointmentCount'])
            ];
            $row['isActive'] = !empty($row['isActive']);
            unset($row['staffCount'], $row['appointmentCount']);
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $address = $input['address'] ?? null;
        $phone = $input['phone'] ?? null;
        $isActive = 1;

        $stmt = $db->prepare("INSERT INTO Branch (id, clinicId, name, address, phone, isActive) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $name, $address, $phone, $isActive
        ]);

        $stmt = $db->prepare("SELECT * FROM Branch WHERE id = ?");
        $stmt->execute([$id]);
        $branch = $stmt->fetch();
        $branch['isActive'] = !empty($branch['isActive']);

        send_json($branch, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Branch WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Branch not found', 404);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'address', 'phone', 'isActive'];
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

        $sql = "UPDATE Branch SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Branch WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Branch not found', 404);
        }

        $stmtCounts = $db->prepare("
            SELECT
                (SELECT COUNT(*) FROM Staff WHERE branchId = ?) as staffCount,
                (SELECT COUNT(*) FROM Appointment WHERE branchId = ?) as appointmentCount
        ");
        $stmtCounts->execute([$id, $id]);
        $counts = $stmtCounts->fetch();

        if (intval($counts['staffCount'] ?? 0) === 0 && intval($counts['appointmentCount'] ?? 0) === 0) {
            $stmtDelete = $db->prepare("DELETE FROM Branch WHERE id = ? AND clinicId = ?");
            $stmtDelete->execute([$id, $user['clinicId']]);
            send_json(['message' => 'Deleted', 'deleted' => true]);
        }

        $stmt = $db->prepare("UPDATE Branch SET isActive = 0 WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);

        send_json([
            'message' => 'Branch has linked records, so it was deactivated instead of permanently deleted.',
            'deleted' => false,
            'deactivated' => true
        ]);
    }
}
