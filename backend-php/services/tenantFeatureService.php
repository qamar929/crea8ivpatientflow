<?php

function tenant_features_ensure($db) {
    $columns = [
        'marketingEnabled' => ['sqlite' => 'INTEGER DEFAULT 0', 'mysql' => 'TINYINT DEFAULT 0'],
        'metaLeadsEnabled' => ['sqlite' => 'INTEGER DEFAULT 0', 'mysql' => 'TINYINT DEFAULT 0'],
        'importsEnabled' => ['sqlite' => 'INTEGER DEFAULT 0', 'mysql' => 'TINYINT DEFAULT 0'],
        // Phase 4: AI Receptionist may auto-create appointments from chat (opt-in, default off).
        'aiAutoBookEnabled' => ['sqlite' => 'INTEGER DEFAULT 0', 'mysql' => 'TINYINT DEFAULT 0'],
    ];
    if (DB_DRIVER === 'sqlite') {
        $db->exec("CREATE TABLE IF NOT EXISTS ClinicFeatureSetting (
            clinicId TEXT PRIMARY KEY,
            marketingEnabled INTEGER DEFAULT 0,
            metaLeadsEnabled INTEGER DEFAULT 0,
            importsEnabled INTEGER DEFAULT 0,
            whatsappEnabled INTEGER DEFAULT 0,
            whatsappMarketingEnabled INTEGER DEFAULT 0,
            whatsappAutomationEnabled INTEGER DEFAULT 0,
            aiEnabled INTEGER DEFAULT 0,
            aiAutoReplyEnabled INTEGER DEFAULT 0,
            aiAutoBookEnabled INTEGER DEFAULT 0,
            aiHumanApprovalRequired INTEGER DEFAULT 1,
            monthlyAiTokenLimit INTEGER DEFAULT 0,
            monthlyWhatsAppLimit INTEGER DEFAULT 0,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )");
        $cols = $db->query("PRAGMA table_info(ClinicFeatureSetting)")->fetchAll();
        $names = array_column($cols, 'name');
        foreach ($columns as $name => $types) {
            if (!in_array($name, $names, true)) {
                $db->exec("ALTER TABLE ClinicFeatureSetting ADD COLUMN $name {$types['sqlite']}");
            }
        }
    } else {
        $db->exec("CREATE TABLE IF NOT EXISTS ClinicFeatureSetting (
            clinicId VARCHAR(64) PRIMARY KEY,
            marketingEnabled TINYINT DEFAULT 0,
            metaLeadsEnabled TINYINT DEFAULT 0,
            importsEnabled TINYINT DEFAULT 0,
            whatsappEnabled TINYINT DEFAULT 0,
            whatsappMarketingEnabled TINYINT DEFAULT 0,
            whatsappAutomationEnabled TINYINT DEFAULT 0,
            aiEnabled TINYINT DEFAULT 0,
            aiAutoReplyEnabled TINYINT DEFAULT 0,
            aiAutoBookEnabled TINYINT DEFAULT 0,
            aiHumanApprovalRequired TINYINT DEFAULT 1,
            monthlyAiTokenLimit INT DEFAULT 0,
            monthlyWhatsAppLimit INT DEFAULT 0,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT FK_ClinicFeatureSetting_Clinic FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        foreach ($columns as $name => $types) {
            $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ClinicFeatureSetting' AND COLUMN_NAME = ?");
            $stmt->execute([$name]);
            if (!(int)$stmt->fetchColumn()) {
                $db->exec("ALTER TABLE ClinicFeatureSetting ADD COLUMN $name {$types['mysql']}");
            }
        }
    }
}

function tenant_features_defaults($clinicId) {
    return [
        'clinicId' => $clinicId,
        'marketingEnabled' => 0,
        'metaLeadsEnabled' => 0,
        'importsEnabled' => 0,
        'whatsappEnabled' => 0,
        'whatsappMarketingEnabled' => 0,
        'whatsappAutomationEnabled' => 0,
        'aiEnabled' => 0,
        'aiAutoReplyEnabled' => 0,
        'aiAutoBookEnabled' => 0,
        'aiHumanApprovalRequired' => 1,
        'monthlyAiTokenLimit' => 0,
        'monthlyWhatsAppLimit' => 0,
    ];
}

function tenant_features_get($db, $clinicId) {
    tenant_features_ensure($db);
    $stmt = $db->prepare("SELECT * FROM ClinicFeatureSetting WHERE clinicId = ?");
    $stmt->execute([$clinicId]);
    $row = $stmt->fetch();
    if (!$row) return tenant_features_defaults($clinicId);
    return array_merge(tenant_features_defaults($clinicId), $row);
}

function tenant_features_save($db, $clinicId, $input) {
    tenant_features_ensure($db);
    $current = tenant_features_get($db, $clinicId);
    $boolValue = function($key, $default = 0) use ($input, $current) {
        if (array_key_exists($key, $input)) return !empty($input[$key]) ? 1 : 0;
        return !empty($current[$key] ?? $default) ? 1 : 0;
    };
    $data = array_merge($current, [
        'marketingEnabled' => $boolValue('marketingEnabled'),
        'metaLeadsEnabled' => $boolValue('metaLeadsEnabled'),
        'importsEnabled' => $boolValue('importsEnabled'),
        'whatsappEnabled' => $boolValue('whatsappEnabled'),
        'whatsappMarketingEnabled' => $boolValue('whatsappMarketingEnabled'),
        'whatsappAutomationEnabled' => $boolValue('whatsappAutomationEnabled'),
        'aiEnabled' => $boolValue('aiEnabled'),
        'aiAutoReplyEnabled' => $boolValue('aiAutoReplyEnabled'),
        'aiAutoBookEnabled' => $boolValue('aiAutoBookEnabled'),
        'aiHumanApprovalRequired' => $boolValue('aiHumanApprovalRequired', 1),
        'monthlyAiTokenLimit' => max(0, intval($input['monthlyAiTokenLimit'] ?? $current['monthlyAiTokenLimit'] ?? 0)),
        'monthlyWhatsAppLimit' => max(0, intval($input['monthlyWhatsAppLimit'] ?? $current['monthlyWhatsAppLimit'] ?? 0)),
    ]);

    if (DB_DRIVER === 'sqlite') {
        $sql = "INSERT INTO ClinicFeatureSetting (clinicId, marketingEnabled, metaLeadsEnabled, importsEnabled, whatsappEnabled, whatsappMarketingEnabled, whatsappAutomationEnabled, aiEnabled, aiAutoReplyEnabled, aiAutoBookEnabled, aiHumanApprovalRequired, monthlyAiTokenLimit, monthlyWhatsAppLimit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(clinicId) DO UPDATE SET marketingEnabled=excluded.marketingEnabled, metaLeadsEnabled=excluded.metaLeadsEnabled, importsEnabled=excluded.importsEnabled, whatsappEnabled=excluded.whatsappEnabled, whatsappMarketingEnabled=excluded.whatsappMarketingEnabled, whatsappAutomationEnabled=excluded.whatsappAutomationEnabled, aiEnabled=excluded.aiEnabled, aiAutoReplyEnabled=excluded.aiAutoReplyEnabled, aiAutoBookEnabled=excluded.aiAutoBookEnabled, aiHumanApprovalRequired=excluded.aiHumanApprovalRequired, monthlyAiTokenLimit=excluded.monthlyAiTokenLimit, monthlyWhatsAppLimit=excluded.monthlyWhatsAppLimit, updatedAt=CURRENT_TIMESTAMP";
    } else {
        $sql = "INSERT INTO ClinicFeatureSetting (clinicId, marketingEnabled, metaLeadsEnabled, importsEnabled, whatsappEnabled, whatsappMarketingEnabled, whatsappAutomationEnabled, aiEnabled, aiAutoReplyEnabled, aiAutoBookEnabled, aiHumanApprovalRequired, monthlyAiTokenLimit, monthlyWhatsAppLimit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE marketingEnabled=VALUES(marketingEnabled), metaLeadsEnabled=VALUES(metaLeadsEnabled), importsEnabled=VALUES(importsEnabled), whatsappEnabled=VALUES(whatsappEnabled), whatsappMarketingEnabled=VALUES(whatsappMarketingEnabled), whatsappAutomationEnabled=VALUES(whatsappAutomationEnabled), aiEnabled=VALUES(aiEnabled), aiAutoReplyEnabled=VALUES(aiAutoReplyEnabled), aiAutoBookEnabled=VALUES(aiAutoBookEnabled), aiHumanApprovalRequired=VALUES(aiHumanApprovalRequired), monthlyAiTokenLimit=VALUES(monthlyAiTokenLimit), monthlyWhatsAppLimit=VALUES(monthlyWhatsAppLimit), updatedAt=CURRENT_TIMESTAMP";
    }
    $db->prepare($sql)->execute([
        $clinicId,
        $data['marketingEnabled'],
        $data['metaLeadsEnabled'],
        $data['importsEnabled'],
        $data['whatsappEnabled'],
        $data['whatsappMarketingEnabled'],
        $data['whatsappAutomationEnabled'],
        $data['aiEnabled'],
        $data['aiAutoReplyEnabled'],
        $data['aiAutoBookEnabled'],
        $data['aiHumanApprovalRequired'],
        $data['monthlyAiTokenLimit'],
        $data['monthlyWhatsAppLimit'],
    ]);
    return tenant_features_get($db, $clinicId);
}

function tenant_feature_bool($features, $key) {
    return !empty($features[$key]);
}
