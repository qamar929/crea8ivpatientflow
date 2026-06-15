<?php

function tenant_features_ensure($db) {
    if (DB_DRIVER === 'sqlite') {
        $db->exec("CREATE TABLE IF NOT EXISTS ClinicFeatureSetting (
            clinicId TEXT PRIMARY KEY,
            whatsappEnabled INTEGER DEFAULT 0,
            whatsappMarketingEnabled INTEGER DEFAULT 0,
            whatsappAutomationEnabled INTEGER DEFAULT 0,
            aiEnabled INTEGER DEFAULT 0,
            aiAutoReplyEnabled INTEGER DEFAULT 0,
            aiHumanApprovalRequired INTEGER DEFAULT 1,
            monthlyAiTokenLimit INTEGER DEFAULT 0,
            monthlyWhatsAppLimit INTEGER DEFAULT 0,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )");
    } else {
        $db->exec("CREATE TABLE IF NOT EXISTS ClinicFeatureSetting (
            clinicId VARCHAR(64) PRIMARY KEY,
            whatsappEnabled TINYINT DEFAULT 0,
            whatsappMarketingEnabled TINYINT DEFAULT 0,
            whatsappAutomationEnabled TINYINT DEFAULT 0,
            aiEnabled TINYINT DEFAULT 0,
            aiAutoReplyEnabled TINYINT DEFAULT 0,
            aiHumanApprovalRequired TINYINT DEFAULT 1,
            monthlyAiTokenLimit INT DEFAULT 0,
            monthlyWhatsAppLimit INT DEFAULT 0,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT FK_ClinicFeatureSetting_Clinic FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}

function tenant_features_defaults($clinicId) {
    return [
        'clinicId' => $clinicId,
        'whatsappEnabled' => 0,
        'whatsappMarketingEnabled' => 0,
        'whatsappAutomationEnabled' => 0,
        'aiEnabled' => 0,
        'aiAutoReplyEnabled' => 0,
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
    $data = array_merge($current, [
        'whatsappEnabled' => !empty($input['whatsappEnabled']) ? 1 : 0,
        'whatsappMarketingEnabled' => !empty($input['whatsappMarketingEnabled']) ? 1 : 0,
        'whatsappAutomationEnabled' => !empty($input['whatsappAutomationEnabled']) ? 1 : 0,
        'aiEnabled' => !empty($input['aiEnabled']) ? 1 : 0,
        'aiAutoReplyEnabled' => !empty($input['aiAutoReplyEnabled']) ? 1 : 0,
        'aiHumanApprovalRequired' => array_key_exists('aiHumanApprovalRequired', $input) ? (!empty($input['aiHumanApprovalRequired']) ? 1 : 0) : 1,
        'monthlyAiTokenLimit' => max(0, intval($input['monthlyAiTokenLimit'] ?? $current['monthlyAiTokenLimit'] ?? 0)),
        'monthlyWhatsAppLimit' => max(0, intval($input['monthlyWhatsAppLimit'] ?? $current['monthlyWhatsAppLimit'] ?? 0)),
    ]);

    if (DB_DRIVER === 'sqlite') {
        $sql = "INSERT INTO ClinicFeatureSetting (clinicId, whatsappEnabled, whatsappMarketingEnabled, whatsappAutomationEnabled, aiEnabled, aiAutoReplyEnabled, aiHumanApprovalRequired, monthlyAiTokenLimit, monthlyWhatsAppLimit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(clinicId) DO UPDATE SET whatsappEnabled=excluded.whatsappEnabled, whatsappMarketingEnabled=excluded.whatsappMarketingEnabled, whatsappAutomationEnabled=excluded.whatsappAutomationEnabled, aiEnabled=excluded.aiEnabled, aiAutoReplyEnabled=excluded.aiAutoReplyEnabled, aiHumanApprovalRequired=excluded.aiHumanApprovalRequired, monthlyAiTokenLimit=excluded.monthlyAiTokenLimit, monthlyWhatsAppLimit=excluded.monthlyWhatsAppLimit, updatedAt=CURRENT_TIMESTAMP";
    } else {
        $sql = "INSERT INTO ClinicFeatureSetting (clinicId, whatsappEnabled, whatsappMarketingEnabled, whatsappAutomationEnabled, aiEnabled, aiAutoReplyEnabled, aiHumanApprovalRequired, monthlyAiTokenLimit, monthlyWhatsAppLimit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE whatsappEnabled=VALUES(whatsappEnabled), whatsappMarketingEnabled=VALUES(whatsappMarketingEnabled), whatsappAutomationEnabled=VALUES(whatsappAutomationEnabled), aiEnabled=VALUES(aiEnabled), aiAutoReplyEnabled=VALUES(aiAutoReplyEnabled), aiHumanApprovalRequired=VALUES(aiHumanApprovalRequired), monthlyAiTokenLimit=VALUES(monthlyAiTokenLimit), monthlyWhatsAppLimit=VALUES(monthlyWhatsAppLimit), updatedAt=CURRENT_TIMESTAMP";
    }
    $db->prepare($sql)->execute([
        $clinicId,
        $data['whatsappEnabled'],
        $data['whatsappMarketingEnabled'],
        $data['whatsappAutomationEnabled'],
        $data['aiEnabled'],
        $data['aiAutoReplyEnabled'],
        $data['aiHumanApprovalRequired'],
        $data['monthlyAiTokenLimit'],
        $data['monthlyWhatsAppLimit'],
    ]);
    return tenant_features_get($db, $clinicId);
}

function tenant_feature_bool($features, $key) {
    return !empty($features[$key]);
}
