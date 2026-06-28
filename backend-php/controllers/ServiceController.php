<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/dentalFinancialService.php';

class ServiceController {
    private function redactCosts($rows, $user) {
        $canSee = pf_can_view_business_financials($user);
        $isList = is_array($rows) && (empty($rows) || array_keys($rows) === range(0, count($rows) - 1));
        if ($isList) {
            foreach ($rows as &$row) if (!$canSee) unset($row['defaultProcedureCost']);
            return $rows;
        }
        if (!$canSee) unset($rows['defaultProcedureCost']);
        return $rows;
    }

    public function list($input, $user) {
        pf_dental_financials_ensure(DB::getConnection());
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

        send_json($this->redactCosts($services, $user));
    }

    public function getById($input, $user, $id) {
        pf_dental_financials_ensure(DB::getConnection());
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $service = $stmt->fetch();

        if (!$service) {
            send_error('Service not found', 404);
        }
        send_json($this->redactCosts($service, $user));
    }

    public function create($input, $user) {
        $db = DB::getConnection();
        pf_dental_financials_ensure($db);

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $specialty = $input['specialty'] ?? '';
        $category = $input['category'] ?? '';
        $price = floatval($input['price'] ?? 0);
        $duration = intval($input['duration'] ?? 0);
        if ($price < 0 || $duration <= 0) {
            send_error('Price cannot be negative and duration must be positive', 400);
        }
        $description = $input['description'] ?? null;
        $popular = !empty($input['popular']) ? 1 : 0;
        $isActive = 1;
        $defaultProcedureCost = array_key_exists('defaultProcedureCost', $input) ? floatval($input['defaultProcedureCost']) : null;
        if ($defaultProcedureCost !== null && $defaultProcedureCost < 0) {
            send_error('Default procedure cost cannot be negative', 400);
        }

        $stmt = $db->prepare("INSERT INTO Service (id, clinicId, name, specialty, category, price, defaultProcedureCost, duration, description, popular, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $name, $specialty, $category, $price, $defaultProcedureCost, $duration, $description, $popular, $isActive
        ]);

        $stmt = $db->prepare("SELECT * FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $createdService = $stmt->fetch();

        send_json($createdService, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        pf_dental_financials_ensure($db);
        $stmt = $db->prepare("SELECT id FROM Service WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Service not found', 404);
        }
        if ((isset($input['price']) && floatval($input['price']) < 0)
            || (isset($input['duration']) && intval($input['duration']) <= 0)
            || (isset($input['defaultProcedureCost']) && floatval($input['defaultProcedureCost']) < 0)) {
            send_error('Price cannot be negative and duration must be positive', 400);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'specialty', 'category', 'price', 'duration', 'description', 'popular', 'isActive', 'defaultProcedureCost'];
        foreach ($updatable as $key) {
            if (isset($input[$key])) {
                if ($key === 'defaultProcedureCost' && !pf_can_manage_procedure_costs($user)) {
                    send_error('Insufficient permissions', 403);
                }
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

        $stmt = $db->prepare("UPDATE Service SET isActive = 0 WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);

        send_json(['message' => 'Deactivated']);
    }
}
