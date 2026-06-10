<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class ServiceController {
    public function list($input, $user) {
        $specialty = $_GET['specialty'] ?? '';
        $category = $_GET['category'] ?? '';

        $db = DB::getConnection();
        $where = ["clinicId = ?", "isActive = 1"];
        $params = [$user['clinicId']];

        if (!empty($specialty)) {
            $where[] = "specialty = ?";
            $params[] = $specialty;
        }
        if (!empty($category)) {
            $where[] = "category = ?";
            $params[] = $category;
        }

        $whereSql = implode(" AND ", $where);
        $stmt = $db->prepare("SELECT * FROM Service WHERE $whereSql ORDER BY name ASC");
        $stmt->execute($params);
        $services = $stmt->fetchAll();

        send_json($services);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $service = $stmt->fetch();

        if (!$service) {
            send_error('Service not found', 404);
        }
        send_json($service);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $specialty = $input['specialty'] ?? '';
        $category = $input['category'] ?? '';
        $price = floatval($input['price'] ?? 0);
        $duration = intval($input['duration'] ?? 0);
        $description = $input['description'] ?? null;
        $popular = !empty($input['popular']) ? 1 : 0;
        $isActive = 1;

        $stmt = $db->prepare("INSERT INTO Service (id, clinicId, name, specialty, category, price, duration, description, popular, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $name, $specialty, $category, $price, $duration, $description, $popular, $isActive
        ]);

        $stmt = $db->prepare("SELECT * FROM Service WHERE id = ?");
        $stmt->execute([$id]);
        $createdService = $stmt->fetch();

        send_json($createdService, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Service not found', 404);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'specialty', 'category', 'price', 'duration', 'description', 'popular', 'isActive'];
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

        $sql = "UPDATE Service SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Service not found', 404);
        }

        $stmt = $db->prepare("UPDATE Service SET isActive = 0 WHERE id = ?");
        $stmt->execute([$id]);

        send_json(['message' => 'Deactivated']);
    }
}
