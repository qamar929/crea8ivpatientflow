<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class InventoryController {
    public function list($input, $user) {
        $specialty = $_GET['specialty'] ?? '';
        $category = $_GET['category'] ?? '';
        $lowStock = $_GET['lowStock'] ?? '';

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
        $stmt = $db->prepare("SELECT * FROM InventoryItem WHERE $whereSql ORDER BY name ASC");
        $stmt->execute($params);
        $items = $stmt->fetchAll();

        // Client side filtering for low stock if required
        if ($lowStock === 'true') {
            $items = array_filter($items, function($i) {
                return floatval($i['quantity']) <= floatval($i['reorderLevel']);
            });
            // Reset array indices
            $items = array_values($items);
        }

        send_json($items);
    }

    public function getById($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM InventoryItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $item = $stmt->fetch();

        if (!$item) {
            send_error('Inventory item not found', 404);
        }
        send_json($item);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $category = $input['category'] ?? '';
        $specialty = $input['specialty'] ?? null;
        $quantity = floatval($input['quantity'] ?? 0);
        $unit = $input['unit'] ?? 'units';
        $reorderLevel = floatval($input['reorderLevel'] ?? 10);
        $costPerUnit = floatval($input['costPerUnit'] ?? 0);
        $supplier = $input['supplier'] ?? null;
        $expiryDate = $input['expiryDate'] ?? null;
        $isActive = 1;

        $stmt = $db->prepare("INSERT INTO InventoryItem (id, clinicId, name, category, specialty, quantity, unit, reorderLevel, costPerUnit, supplier, expiryDate, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $user['clinicId'], $name, $category, $specialty, $quantity, $unit, $reorderLevel, $costPerUnit, $supplier, $expiryDate, $isActive
        ]);

        $stmt = $db->prepare("SELECT * FROM InventoryItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $createdItem = $stmt->fetch();

        send_json($createdItem, 201);
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM InventoryItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Inventory item not found', 404);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'category', 'specialty', 'quantity', 'unit', 'reorderLevel', 'costPerUnit', 'supplier', 'expiryDate', 'isActive'];
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

        $sql = "UPDATE InventoryItem SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function adjustStock($input, $user, $id) {
        $type = $input['type'] ?? ''; // 'in' or 'out'
        $quantity = floatval($input['quantity'] ?? 0);
        $reason = $input['reason'] ?? null;

        if (!in_array($type, ['in', 'out'], true) || $quantity <= 0) {
            send_error('type must be in or out and quantity must be positive', 400);
        }

        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM InventoryItem WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $item = $stmt->fetch();

        if (!$item) {
            send_error('Inventory item not found', 404);
        }

        $currentQty = floatval($item['quantity']);
        if ($type === 'out' && $quantity > $currentQty) {
            send_error('Insufficient stock for this adjustment', 409);
        }
        $newQty = $type === 'in' ? $currentQty + $quantity : max(0.0, $currentQty - $quantity);

        try {
            $db->beginTransaction();

            // Update item quantity
            $stmtUpdate = $db->prepare("UPDATE InventoryItem SET quantity = ? WHERE id = ? AND clinicId = ?");
            $stmtUpdate->execute([$newQty, $id, $user['clinicId']]);

            // Log transaction
            $txId = generate_uuid();
            $stmtTx = $db->prepare("INSERT INTO InventoryTransaction (id, itemId, type, quantity, reason) VALUES (?, ?, ?, ?, ?)");
            $stmtTx->execute([$txId, $id, $type, $quantity, $reason]);

            $db->commit();
            send_json(['quantity' => $newQty]);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function getLowStock($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM InventoryItem WHERE clinicId = ? AND isActive = 1 AND quantity <= reorderLevel ORDER BY name ASC");
        $stmt->execute([$user['clinicId']]);
        $items = $stmt->fetchAll();
        send_json($items);
    }
}
