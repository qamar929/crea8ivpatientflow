<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../services/tenantFeatureService.php';

class AIHubController {
    private function db() {
        $db = DB::getConnection();
        if (DB_DRIVER === 'sqlite') {
            $db->exec("CREATE TABLE IF NOT EXISTS AIProviderSetting (
                id TEXT PRIMARY KEY,
                clinicId TEXT NOT NULL,
                provider TEXT NOT NULL,
                apiKey TEXT,
                enabled INTEGER DEFAULT 0,
                model TEXT,
                monthlyTokenLimit INTEGER DEFAULT 0,
                tokenUsage INTEGER DEFAULT 0,
                costEstimate REAL DEFAULT 0,
                status TEXT DEFAULT 'not_configured',
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            )");
            $db->exec("CREATE UNIQUE INDEX IF NOT EXISTS AIProviderSetting_clinic_provider ON AIProviderSetting(clinicId, provider)");
        } else {
            $db->exec("CREATE TABLE IF NOT EXISTS AIProviderSetting (
                id VARCHAR(64) PRIMARY KEY,
                clinicId VARCHAR(64) NOT NULL,
                provider VARCHAR(40) NOT NULL,
                apiKey TEXT,
                enabled TINYINT DEFAULT 0,
                model VARCHAR(120),
                monthlyTokenLimit INT DEFAULT 0,
                tokenUsage INT DEFAULT 0,
                costEstimate DECIMAL(12,4) DEFAULT 0,
                status VARCHAR(40) DEFAULT 'not_configured',
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY AIProviderSetting_clinic_provider (clinicId, provider)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        }
        return $db;
    }

    private function defaults($clinicId) {
        return [
            ['id' => generate_uuid(), 'clinicId' => $clinicId, 'provider' => 'chatgpt', 'model' => 'gpt-4o-mini', 'enabled' => 0, 'status' => 'not_configured'],
            ['id' => generate_uuid(), 'clinicId' => $clinicId, 'provider' => 'gemini', 'model' => 'gemini-1.5-flash', 'enabled' => 0, 'status' => 'not_configured'],
            ['id' => generate_uuid(), 'clinicId' => $clinicId, 'provider' => 'claude', 'model' => 'claude-3-5-sonnet', 'enabled' => 0, 'status' => 'not_configured'],
        ];
    }

    private function ensureDefaultsForClinic($db, $clinicId) {
        foreach ($this->defaults($clinicId) as $provider) {
            $sql = DB_DRIVER === 'sqlite'
                ? "INSERT OR IGNORE INTO AIProviderSetting (id, clinicId, provider, model, enabled, status) VALUES (?, ?, ?, ?, ?, ?)"
                : "INSERT IGNORE INTO AIProviderSetting (id, clinicId, provider, model, enabled, status) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $db->prepare($sql);
            $stmt->execute([$provider['id'], $provider['clinicId'], $provider['provider'], $provider['model'], $provider['enabled'], $provider['status']]);
        }
    }

    private function providerStatus($row) {
        if (empty($row['enabled'])) return 'disabled';
        if (empty($row['apiKey'])) return 'missing_key';
        return 'ready';
    }

    public function overview($input, $user) {
        $db = $this->db();
        $this->ensureDefaultsForClinic($db, 'platform');
        $this->ensureDefaultsForClinic($db, $user['clinicId']);
        $features = tenant_features_get($db, $user['clinicId']);

        $stmt = $db->prepare("SELECT * FROM AIProviderSetting WHERE clinicId = 'platform' ORDER BY provider");
        $stmt->execute();
        $providers = $stmt->fetchAll();
        foreach ($providers as &$provider) {
            $provider['hasApiKey'] = !empty($provider['apiKey']);
            $provider['enabled'] = !empty($provider['enabled']) && !empty($features['aiEnabled']);
            $provider['health'] = $this->providerStatus($provider);
            if (empty($features['aiEnabled'])) $provider['health'] = 'disabled_by_plan';
            unset($provider['apiKey']);
        }

        $enabled = array_filter($providers, fn($p) => !empty($p['enabled']));
        $ready = array_filter($providers, fn($p) => $p['health'] === 'ready');

        send_json([
            'providers' => $providers,
            'managedByPlatform' => true,
            'features' => [
                'aiEnabled' => !empty($features['aiEnabled']),
                'aiAutoReplyEnabled' => !empty($features['aiAutoReplyEnabled']),
                'aiHumanApprovalRequired' => !empty($features['aiHumanApprovalRequired']),
                'monthlyAiTokenLimit' => intval($features['monthlyAiTokenLimit'] ?? 0),
            ],
            'metrics' => [
                'enabledProviders' => count($enabled),
                'readyProviders' => count($ready),
                'tokenUsage' => array_sum(array_map(fn($p) => intval($p['tokenUsage'] ?? 0), $providers)),
                'costEstimate' => array_sum(array_map(fn($p) => floatval($p['costEstimate'] ?? 0), $providers)),
                'failoverReady' => count($ready) >= 2,
            ],
            'capabilities' => [
                'Auto Reply', 'Lead Qualification', 'Patient FAQs', 'Appointment Assistance',
                'Treatment Information', 'Lead Nurturing', 'Follow-Up Messaging',
                'Content Generation', 'Review Request Generation'
            ]
        ]);
    }

    public function saveProvider($input, $user, $provider) {
        if ((getenv('ALLOW_CLINIC_AI_KEYS') ?: '0') !== '1') {
            send_error('AI providers are managed by the platform superadmin for this SaaS.', 403);
        }
        $db = $this->db();
        $provider = strtolower($provider);
        if (!in_array($provider, ['chatgpt', 'gemini', 'claude'])) send_error('Unsupported AI provider', 400);
        $enabled = !empty($input['enabled']) ? 1 : 0;
        $apiKey = array_key_exists('apiKey', $input) && $input['apiKey'] !== '' ? $input['apiKey'] : null;
        $model = $input['model'] ?? null;
        $monthlyTokenLimit = intval($input['monthlyTokenLimit'] ?? 0);
        $status = $enabled ? ($apiKey ? 'ready' : 'missing_key') : 'disabled';
        $id = generate_uuid();

        $existing = $db->prepare("SELECT apiKey FROM AIProviderSetting WHERE clinicId = ? AND provider = ?");
        $existing->execute([$user['clinicId'], $provider]);
        $currentKey = $existing->fetchColumn();
        if ($apiKey === null && $currentKey) $apiKey = $currentKey;

        if (DB_DRIVER === 'sqlite') {
            $stmt = $db->prepare("INSERT INTO AIProviderSetting (id, clinicId, provider, apiKey, enabled, model, monthlyTokenLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(clinicId, provider) DO UPDATE SET apiKey=excluded.apiKey, enabled=excluded.enabled, model=excluded.model, monthlyTokenLimit=excluded.monthlyTokenLimit, status=excluded.status, updatedAt=CURRENT_TIMESTAMP");
        } else {
            $stmt = $db->prepare("INSERT INTO AIProviderSetting (id, clinicId, provider, apiKey, enabled, model, monthlyTokenLimit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE apiKey=VALUES(apiKey), enabled=VALUES(enabled), model=VALUES(model), monthlyTokenLimit=VALUES(monthlyTokenLimit), status=VALUES(status), updatedAt=CURRENT_TIMESTAMP");
        }
        $stmt->execute([$id, $user['clinicId'], $provider, $apiKey, $enabled, $model, $monthlyTokenLimit, $status]);
        log_audit($user['clinicId'], $user['id'] ?? null, 'update', 'AIProviderSetting', $provider, null, ['enabled' => $enabled, 'model' => $model, 'status' => $status]);
        $this->overview([], $user);
    }
}
