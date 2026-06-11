<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class PackageController {
    private function assertClientInClinic($db, $clientId, $clinicId) {
        $stmt = $db->prepare("SELECT id FROM Client WHERE id = ? AND clinicId = ? AND status != 'inactive'");
        $stmt->execute([$clientId, $clinicId]);
        if (!$stmt->fetch()) {
            send_error('Client not found', 404);
        }
    }

    private function assertServiceInClinic($db, $serviceId, $clinicId) {
        $stmt = $db->prepare("SELECT id FROM Service WHERE id = ? AND clinicId = ? AND isActive = 1");
        $stmt->execute([$serviceId, $clinicId]);
        if (!$stmt->fetch()) {
            send_error('Package service not found for this clinic', 400);
        }
    }

    public function list($input, $user) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("SELECT * FROM Package WHERE clinicId = ? AND isActive = 1 ORDER BY name ASC");
        $stmt->execute([$user['clinicId']]);
        $packages = $stmt->fetchAll();

        foreach ($packages as &$pkg) {
            $stmtItems = $db->prepare("
                SELECT pi.*, 
                       s.id as serviceId, s.name as serviceName, s.price as servicePrice, s.duration as serviceDuration
                FROM PackageItem pi
                JOIN Service s ON pi.serviceId = s.id
                WHERE pi.packageId = ?
            ");
            $stmtItems->execute([$pkg['id']]);
            $items = $stmtItems->fetchAll();
            
            // Format to match prisma nesting
            foreach ($items as &$item) {
                $item['service'] = [
                    'id' => $item['serviceId'],
                    'name' => $item['serviceName'],
                    'price' => $item['servicePrice'],
                    'duration' => $item['serviceDuration']
                ];
                unset($item['serviceName'], $item['servicePrice'], $item['serviceDuration']);
            }
            $pkg['items'] = $items;
        }

        send_json($packages);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $name = $input['name'] ?? '';
        if (empty($name)) {
            send_error('Name is required', 400);
        }

        $description = $input['description'] ?? null;
        $totalPrice = floatval($input['totalPrice'] ?? 0);
        $validity = intval($input['validity'] ?? 0);
        $specialty = $input['specialty'] ?? '';
        $isActive = 1;

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("INSERT INTO Package (id, clinicId, name, description, totalPrice, validity, specialty, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id, $user['clinicId'], $name, $description, $totalPrice, $validity, $specialty, $isActive
            ]);

            $items = $input['items'] ?? [];
            if (!empty($items)) {
                foreach ($items as $item) {
                    $itemId = generate_uuid();
                    $serviceId = $item['serviceId'];
                    $sessions = intval($item['sessions'] ?? 1);
                    $this->assertServiceInClinic($db, $serviceId, $user['clinicId']);
                    
                    $stmtItem = $db->prepare("INSERT INTO PackageItem (id, packageId, serviceId, sessions) VALUES (?, ?, ?, ?)");
                    $stmtItem->execute([$itemId, $id, $serviceId, $sessions]);
                }
            }

            $db->commit();

            // Fetch package with items
            $stmt = $db->prepare("SELECT * FROM Package WHERE id = ?");
            $stmt->execute([$id]);
            $pkg = $stmt->fetch();

            $stmtItems = $db->prepare("
                SELECT pi.*, 
                       s.id as serviceId, s.name as serviceName, s.price as servicePrice, s.duration as serviceDuration
                FROM PackageItem pi
                JOIN Service s ON pi.serviceId = s.id
                WHERE pi.packageId = ?
            ");
            $stmtItems->execute([$id]);
            $createdItems = $stmtItems->fetchAll();

            foreach ($createdItems as &$item) {
                $item['service'] = [
                    'id' => $item['serviceId'],
                    'name' => $item['serviceName'],
                    'price' => $item['servicePrice'],
                    'duration' => $item['serviceDuration']
                ];
                unset($item['serviceName'], $item['servicePrice'], $item['serviceDuration']);
            }
            $pkg['items'] = $createdItems;

            send_json($pkg, 201);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Package WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Package not found', 404);
        }

        $fields = [];
        $params = [];

        $updatable = ['name', 'description', 'totalPrice', 'validity', 'specialty', 'isActive'];
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

        $sql = "UPDATE Package SET " . implode(", ", $fields) . " WHERE id = ? AND clinicId = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT id FROM Package WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        if (!$stmt->fetch()) {
            send_error('Package not found', 404);
        }

        $stmt = $db->prepare("UPDATE Package SET isActive = 0 WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);

        send_json(['message' => 'Deleted']);
    }

    public function purchase($input, $user, $id) {
        $clientId = $input['clientId'] ?? '';
        $amountPaid = isset($input['amountPaid']) ? floatval($input['amountPaid']) : null;

        if (empty($clientId)) {
            send_error('clientId is required', 400);
        }

        $db = DB::getConnection();
        
        // Find Package
        $stmt = $db->prepare("SELECT * FROM Package WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $pkg = $stmt->fetch();
        if (!$pkg) {
            send_error('Package not found', 404);
        }
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);

        // Get total sessions
        $stmtSessions = $db->prepare("SELECT SUM(sessions) FROM PackageItem WHERE packageId = ?");
        $stmtSessions->execute([$id]);
        $totalSessions = intval($stmtSessions->fetchColumn() ?: 0);

        $purchaseDate = date('Y-m-d');
        $expiryDate = date('Y-m-d', time() + intval($pkg['validity']) * 24 * 60 * 60);
        $finalAmountPaid = $amountPaid !== null ? $amountPaid : floatval($pkg['totalPrice']);

        try {
            $db->beginTransaction();

            $cpId = generate_uuid();
            $stmtInsert = $db->prepare("INSERT INTO ClientPackage (id, clientId, packageId, purchaseDate, expiryDate, totalSessions, amountPaid) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtInsert->execute([
                $cpId, $clientId, $id, $purchaseDate, $expiryDate, $totalSessions, $finalAmountPaid
            ]);

            // Update client total spent
            $stmtClient = $db->prepare("UPDATE Client SET totalSpent = totalSpent + ? WHERE id = ? AND clinicId = ?");
            $stmtClient->execute([$finalAmountPaid, $clientId, $user['clinicId']]);

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM ClientPackage WHERE id = ?");
            $stmtFetch->execute([$cpId]);
            $cp = $stmtFetch->fetch();

            send_json($cp, 201);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function getClientPackages($input, $user, $clientId) {
        $db = DB::getConnection();
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);
        
        $stmt = $db->prepare("
            SELECT cp.*,
                   p.name as packageName, p.description as packageDescription, p.totalPrice as packagePrice
            FROM ClientPackage cp
            JOIN Package p ON cp.packageId = p.id
            WHERE cp.clientId = ? AND p.clinicId = ?
            ORDER BY cp.purchaseDate DESC
        ");
        $stmt->execute([$clientId, $user['clinicId']]);
        $clientPackages = $stmt->fetchAll();

        foreach ($clientPackages as &$cp) {
            $cp['package'] = [
                'id' => $cp['packageId'],
                'name' => $cp['packageName'],
                'description' => $cp['packageDescription'],
                'totalPrice' => $cp['packagePrice']
            ];
            
            // Add package items
            $stmtItems = $db->prepare("
                SELECT pi.*, 
                       s.id as serviceId, s.name as serviceName, s.price as servicePrice, s.duration as serviceDuration
                FROM PackageItem pi
                JOIN Service s ON pi.serviceId = s.id
                WHERE pi.packageId = ?
            ");
            $stmtItems->execute([$cp['packageId']]);
            $items = $stmtItems->fetchAll();

            foreach ($items as &$item) {
                $item['service'] = [
                    'id' => $item['serviceId'],
                    'name' => $item['serviceName'],
                    'price' => $item['servicePrice'],
                    'duration' => $item['serviceDuration']
                ];
                unset($item['serviceName'], $item['servicePrice'], $item['serviceDuration']);
            }
            $cp['package']['items'] = $items;
            
            unset($cp['packageName'], $cp['packageDescription'], $cp['packagePrice']);
        }

        send_json($clientPackages);
    }
}
