<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

class ImportController {
    private function db() {
        $db = DB::getConnection();
        if (DB_DRIVER === 'sqlite') {
            $db->exec("CREATE TABLE IF NOT EXISTS ImportJob (
                id TEXT PRIMARY KEY,
                clinicId TEXT NOT NULL,
                sourceType TEXT NOT NULL,
                fileName TEXT,
                entityType TEXT DEFAULT 'patients',
                status TEXT DEFAULT 'draft',
                totalRows INTEGER DEFAULT 0,
                validRows INTEGER DEFAULT 0,
                duplicateRows INTEGER DEFAULT 0,
                importedRows INTEGER DEFAULT 0,
                fieldMapping TEXT,
                validationNotes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            )");
        } else {
            $db->exec("CREATE TABLE IF NOT EXISTS ImportJob (
                id VARCHAR(64) PRIMARY KEY,
                clinicId VARCHAR(64) NOT NULL,
                sourceType VARCHAR(60) NOT NULL,
                fileName VARCHAR(255),
                entityType VARCHAR(60) DEFAULT 'patients',
                status VARCHAR(40) DEFAULT 'draft',
                totalRows INT DEFAULT 0,
                validRows INT DEFAULT 0,
                duplicateRows INT DEFAULT 0,
                importedRows INT DEFAULT 0,
                fieldMapping TEXT,
                validationNotes TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX ImportJob_clinic_createdAt (clinicId, createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
        return $db;
    }

    private function requireFeature($db, $clinicId) {
        $features = tenant_features_get($db, $clinicId);
        if (empty($features['importsEnabled'])) {
            send_error('Contact Support to activate Import Center.', 403, ['code' => 'feature_inactive']);
        }
    }

    public function list($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT * FROM ImportJob WHERE clinicId = ? ORDER BY createdAt DESC");
        $stmt->execute([$user['clinicId']]);
        $jobs = $stmt->fetchAll();
        foreach ($jobs as &$job) {
            $job['fieldMapping'] = json_decode($job['fieldMapping'] ?? '{}', true) ?: [];
            $job['validationNotes'] = json_decode($job['validationNotes'] ?? '[]', true) ?: [];
        }
        send_json($jobs);
    }

    public function create($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $id = generate_uuid();
        $sourceType = $input['sourceType'] ?? 'csv';
        $entityType = $input['entityType'] ?? 'patients';
        $totalRows = intval($input['totalRows'] ?? 0);
        $validRows = intval($input['validRows'] ?? $totalRows);
        $duplicateRows = intval($input['duplicateRows'] ?? 0);
        $mapping = $input['fieldMapping'] ?? [];
        $notes = $input['validationNotes'] ?? [];
        $status = $input['status'] ?? 'preview_ready';

        $stmt = $db->prepare("INSERT INTO ImportJob (id, clinicId, sourceType, fileName, entityType, status, totalRows, validRows, duplicateRows, importedRows, fieldMapping, validationNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $user['clinicId'], $sourceType, $input['fileName'] ?? null, $entityType, $status, $totalRows, $validRows, $duplicateRows, 0, json_encode($mapping), json_encode($notes)]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'create', 'ImportJob', $id, null, $input);
        $this->list([], $user);
    }

    public function update($input, $user, $id) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $fields = [];
        $params = [];
        foreach (['sourceType','fileName','entityType','status','totalRows','validRows','duplicateRows','importedRows'] as $key) {
            if (array_key_exists($key, $input)) { $fields[] = "$key = ?"; $params[] = $input[$key]; }
        }
        if (array_key_exists('fieldMapping', $input)) { $fields[] = "fieldMapping = ?"; $params[] = json_encode($input['fieldMapping']); }
        if (array_key_exists('validationNotes', $input)) { $fields[] = "validationNotes = ?"; $params[] = json_encode($input['validationNotes']); }
        if (!$fields) send_error('No fields to update', 400);
        $params[] = $id; $params[] = $user['clinicId'];
        $stmt = $db->prepare("UPDATE ImportJob SET " . implode(', ', $fields) . " WHERE id = ? AND clinicId = ?");
        $stmt->execute($params);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'ImportJob', $id, null, $input);
        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $stmt = $db->prepare("UPDATE ImportJob SET status = 'archived' WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'archive', 'ImportJob', $id);
        send_json(['message' => 'Archived']);
    }
}
