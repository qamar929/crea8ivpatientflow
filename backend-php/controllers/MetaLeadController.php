<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/metaWhatsAppService.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

class MetaLeadController {
    private function db() {
        $db = DB::getConnection();
        if (DB_DRIVER === 'sqlite') {
            $db->exec("CREATE TABLE IF NOT EXISTS MetaLeadSetting (
                clinicId TEXT PRIMARY KEY,
                pageId TEXT,
                adAccountId TEXT,
                accessToken TEXT,
                webhookVerifyToken TEXT,
                syncEnabled INTEGER DEFAULT 0,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )");
            $db->exec("CREATE TABLE IF NOT EXISTS MetaLead (
                id TEXT PRIMARY KEY,
                clinicId TEXT NOT NULL,
                patientName TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                source TEXT DEFAULT 'Meta Lead Ads',
                campaignName TEXT,
                adName TEXT,
                formName TEXT,
                branchId TEXT,
                status TEXT DEFAULT 'new',
                notes TEXT,
                clientId TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP
            )");
        } else {
            $db->exec("CREATE TABLE IF NOT EXISTS MetaLeadSetting (
                clinicId VARCHAR(64) PRIMARY KEY,
                pageId VARCHAR(120),
                adAccountId VARCHAR(120),
                accessToken TEXT,
                webhookVerifyToken VARCHAR(255),
                syncEnabled TINYINT DEFAULT 0,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $db->exec("CREATE TABLE IF NOT EXISTS MetaLead (
                id VARCHAR(64) PRIMARY KEY,
                clinicId VARCHAR(64) NOT NULL,
                patientName VARCHAR(180) NOT NULL,
                phone VARCHAR(40),
                email VARCHAR(180),
                source VARCHAR(120) DEFAULT 'Meta Lead Ads',
                campaignName VARCHAR(180),
                adName VARCHAR(180),
                formName VARCHAR(180),
                branchId VARCHAR(64),
                status VARCHAR(40) DEFAULT 'new',
                notes TEXT,
                clientId VARCHAR(64),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX MetaLead_clinic_status (clinicId, status),
                INDEX MetaLead_createdAt (createdAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
        return $db;
    }

    private function requireFeature($db, $clinicId) {
        $features = tenant_features_get($db, $clinicId);
        if (empty($features['metaLeadsEnabled'])) {
            send_error('Contact Support to activate Meta Leads.', 403, ['code' => 'feature_inactive']);
        }
    }

    public function settings($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT * FROM MetaLeadSetting WHERE clinicId = ?");
        $stmt->execute([$user['clinicId']]);
        $settings = $stmt->fetch() ?: ['clinicId' => $user['clinicId'], 'syncEnabled' => 0];
        $settings['hasAccessToken'] = !empty($settings['accessToken']);
        unset($settings['accessToken']);
        send_json($settings);
    }

    public function saveSettings($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $existing = $db->prepare("SELECT accessToken FROM MetaLeadSetting WHERE clinicId = ?");
        $existing->execute([$user['clinicId']]);
        $currentToken = $existing->fetchColumn();
        $token = !empty($input['accessToken']) ? meta_encrypt_secret($input['accessToken']) : $currentToken;
        $sync = !empty($input['syncEnabled']) ? 1 : 0;

        $sql = DB_DRIVER === 'sqlite'
            ? "INSERT INTO MetaLeadSetting (clinicId, pageId, adAccountId, accessToken, webhookVerifyToken, syncEnabled) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(clinicId) DO UPDATE SET pageId=excluded.pageId, adAccountId=excluded.adAccountId, accessToken=excluded.accessToken, webhookVerifyToken=excluded.webhookVerifyToken, syncEnabled=excluded.syncEnabled, updatedAt=CURRENT_TIMESTAMP"
            : "INSERT INTO MetaLeadSetting (clinicId, pageId, adAccountId, accessToken, webhookVerifyToken, syncEnabled) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE pageId=VALUES(pageId), adAccountId=VALUES(adAccountId), accessToken=VALUES(accessToken), webhookVerifyToken=VALUES(webhookVerifyToken), syncEnabled=VALUES(syncEnabled), updatedAt=CURRENT_TIMESTAMP";
        $stmt = $db->prepare($sql);
        $stmt->execute([$user['clinicId'], $input['pageId'] ?? null, $input['adAccountId'] ?? null, $token, $input['webhookVerifyToken'] ?? null, $sync]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'MetaLeadSetting', $user['clinicId'], null, ['syncEnabled' => $sync]);
        $this->settings([], $user);
    }

    public function list($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $status = $_GET['status'] ?? '';
        $where = ['clinicId = ?'];
        $params = [$user['clinicId']];
        if ($status) { $where[] = 'status = ?'; $params[] = $status; }
        $stmt = $db->prepare("SELECT * FROM MetaLead WHERE " . implode(' AND ', $where) . " ORDER BY createdAt DESC");
        $stmt->execute($params);
        send_json($stmt->fetchAll());
    }

    public function create($input, $user) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        if (empty($input['patientName'])) send_error('patientName is required', 400);
        $id = generate_uuid();
        $stmt = $db->prepare("INSERT INTO MetaLead (id, clinicId, patientName, phone, email, source, campaignName, adName, formName, branchId, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $user['clinicId'], $input['patientName'], $input['phone'] ?? null, $input['email'] ?? null, $input['source'] ?? 'Meta Lead Ads', $input['campaignName'] ?? null, $input['adName'] ?? null, $input['formName'] ?? null, $input['branchId'] ?? null, $input['status'] ?? 'new', $input['notes'] ?? null]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'create', 'MetaLead', $id, null, $input);
        $stmt = $db->prepare("SELECT * FROM MetaLead WHERE id = ?");
        $stmt->execute([$id]);
        send_json($stmt->fetch(), 201);
    }

    public function update($input, $user, $id) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $fields = [];
        $params = [];
        foreach (['patientName','phone','email','source','campaignName','adName','formName','branchId','status','notes'] as $key) {
            if (array_key_exists($key, $input)) { $fields[] = "$key = ?"; $params[] = $input[$key]; }
        }
        if (!$fields) send_error('No fields to update', 400);
        $params[] = $id; $params[] = $user['clinicId'];
        $stmt = $db->prepare("UPDATE MetaLead SET " . implode(', ', $fields) . " WHERE id = ? AND clinicId = ?");
        $stmt->execute($params);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'MetaLead', $id, null, $input);
        send_json(['message' => 'Updated']);
    }

    public function remove($input, $user, $id) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $stmt = $db->prepare("DELETE FROM MetaLead WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'delete', 'MetaLead', $id);
        send_json(['message' => 'Deleted']);
    }

    public function convert($input, $user, $id) {
        $db = $this->db();
        $this->requireFeature($db, $user['clinicId']);
        $stmt = $db->prepare("SELECT * FROM MetaLead WHERE id = ? AND clinicId = ?");
        $stmt->execute([$id, $user['clinicId']]);
        $lead = $stmt->fetch();
        if (!$lead) send_error('Lead not found', 404);
        if (!empty($lead['clientId'])) send_json(['message' => 'Already converted', 'clientId' => $lead['clientId']]);

        $clientId = generate_uuid();
        $countStmt = $db->prepare("SELECT COUNT(*) FROM Client WHERE clinicId = ?");
        $countStmt->execute([$user['clinicId']]);
        $patientNo = 'META-' . str_pad(intval($countStmt->fetchColumn()) + 1, 4, '0', STR_PAD_LEFT);
        $parts = preg_split('/\s+/', trim($lead['patientName']));
        $initials = strtoupper(substr($parts[0] ?? 'P', 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("INSERT INTO Client (id, clinicId, patientNo, name, phone, email, specialty, medicalHistory, avatarColor, initials, notes, referredBy) VALUES (?, ?, ?, ?, ?, ?, '[]', '[]', '#0f766e', ?, ?, ?)");
            $stmt->execute([$clientId, $user['clinicId'], $patientNo, $lead['patientName'], $lead['phone'], $lead['email'], substr($initials, 0, 2), $lead['notes'], 'Meta Lead Ads']);
            $stmt = $db->prepare("UPDATE MetaLead SET status = 'converted', clientId = ? WHERE id = ?");
            $stmt->execute([$clientId, $id]);
            $db->commit();
            log_audit($user['clinicId'], $user['id'] ?? null, 'create', 'Client', $clientId, null, ['fromLead' => $id]);
            send_json(['message' => 'Converted to patient', 'clientId' => $clientId], 201);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }
}
