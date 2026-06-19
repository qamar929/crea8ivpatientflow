<?php
require_once __DIR__ . '/tenantFeatureService.php';

// ---------------------------------------------------------------------------
// Centralized package / plan definitions. A "package" is just a named preset
// of the existing ClinicFeatureSetting flags — so adding a new package later is
// a one-entry change here, and all the existing show/hide logic keeps working.
// ---------------------------------------------------------------------------
function pf_packages() {
    // Every AI-tier flag OFF for Core; ON for AI.
    $core = [
        'marketingEnabled' => false,
        'whatsappEnabled' => false,
        'whatsappMarketingEnabled' => false,
        'whatsappAutomationEnabled' => false,
        'aiEnabled' => false,
        'aiAutoReplyEnabled' => false,
        'metaLeadsEnabled' => false,
        'importsEnabled' => false,
        'monthlyWhatsAppLimit' => 0,
        'monthlyAiTokenLimit' => 0,
    ];
    $ai = [
        'marketingEnabled' => true,
        'whatsappEnabled' => true,
        'whatsappMarketingEnabled' => true,
        'whatsappAutomationEnabled' => true,
        'aiEnabled' => true,
        'aiAutoReplyEnabled' => true,
        'metaLeadsEnabled' => true,
        'importsEnabled' => true,
        'monthlyWhatsAppLimit' => 5000,
        'monthlyAiTokenLimit' => 1000000,
    ];
    return [
        'core' => ['key' => 'core', 'name' => 'PatientFlow Core', 'pricePKR' => 25000, 'flags' => $core],
        'ai'   => ['key' => 'ai',   'name' => 'PatientFlow AI',   'pricePKR' => 40000, 'flags' => $ai],
    ];
}

function pf_package_keys() { return array_keys(pf_packages()); }

function pf_ensure_platform_settings($db) {
    $sql = DB_DRIVER === 'sqlite'
        ? "CREATE TABLE IF NOT EXISTS PlatformSetting (settingKey TEXT PRIMARY KEY, settingValue TEXT, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)"
        : "CREATE TABLE IF NOT EXISTS PlatformSetting (settingKey VARCHAR(64) PRIMARY KEY, settingValue TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)";
    $db->exec($sql);
}

function pf_package_storage_key($clinicId) { return 'clinic_package:' . $clinicId; }

// Current package for a clinic. Defaults to 'core' when never assigned —
// i.e. existing clinics are Core unless a super admin changed them.
function pf_package_get($db, $clinicId) {
    try {
        $stmt = $db->prepare("SELECT settingValue FROM PlatformSetting WHERE settingKey = ?");
        $stmt->execute([pf_package_storage_key($clinicId)]);
        $key = $stmt->fetchColumn();
    } catch (Exception $e) { $key = false; }
    $key = $key ?: 'core';
    return array_key_exists($key, pf_packages()) ? $key : 'core';
}

// Assign a package: store the choice + apply its flag preset (one active package).
function pf_package_set($db, $clinicId, $key) {
    $packages = pf_packages();
    if (!isset($packages[$key])) throw new Exception('Unknown package: ' . $key);
    pf_ensure_platform_settings($db);

    $sql = DB_DRIVER === 'sqlite'
        ? "INSERT INTO PlatformSetting (settingKey, settingValue) VALUES (?, ?) ON CONFLICT(settingKey) DO UPDATE SET settingValue=excluded.settingValue, updatedAt=CURRENT_TIMESTAMP"
        : "INSERT INTO PlatformSetting (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue=VALUES(settingValue), updatedAt=CURRENT_TIMESTAMP";
    $db->prepare($sql)->execute([pf_package_storage_key($clinicId), $key]);

    // Apply the preset to the existing feature-flag table — this is what the
    // nav / routes / API guards already read, so visibility updates instantly.
    tenant_features_save($db, $clinicId, $packages[$key]['flags']);
    return $key;
}

// Path-prefix → required feature flag, for the centralized API gate.
function pf_feature_for_path($path) {
    $gates = [
        'api/v1/whatsapp'  => 'whatsappEnabled',
        'api/v1/campaigns' => 'marketingEnabled',
        'api/v1/ai'        => 'aiEnabled',
        'api/v1/meta'      => 'metaLeadsEnabled',
        'api/v1/import'    => 'importsEnabled',
    ];
    foreach ($gates as $prefix => $feature) {
        if (strpos($path, $prefix) === 0) return $feature;
    }
    return null;
}
