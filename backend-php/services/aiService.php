<?php
// Central AI helper. Resolves the super-admin's shared platform key
// (AIProviderSetting clinicId='platform') and runs a chat completion.
// Today only ChatGPT (OpenAI) is wired; gemini/claude can be added here.
require_once __DIR__ . '/metaWhatsAppService.php'; // meta_encrypt_secret / meta_decrypt_secret
require_once __DIR__ . '/tenantFeatureService.php';

function ai_ensure_usage_table($db) {
    if (DB_DRIVER === 'sqlite') {
        $db->exec("CREATE TABLE IF NOT EXISTS AIUsageLog (
            id TEXT PRIMARY KEY,
            clinicId TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT,
            promptTokens INTEGER DEFAULT 0,
            completionTokens INTEGER DEFAULT 0,
            totalTokens INTEGER DEFAULT 0,
            purpose TEXT DEFAULT 'completion',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )");
        $db->exec("CREATE INDEX IF NOT EXISTS AIUsageLog_clinic_created ON AIUsageLog(clinicId, createdAt)");
    } else {
        $db->exec("CREATE TABLE IF NOT EXISTS AIUsageLog (
            id VARCHAR(64) PRIMARY KEY,
            clinicId VARCHAR(64) NOT NULL,
            provider VARCHAR(40) NOT NULL,
            model VARCHAR(120),
            promptTokens INT DEFAULT 0,
            completionTokens INT DEFAULT 0,
            totalTokens INT DEFAULT 0,
            purpose VARCHAR(80) DEFAULT 'completion',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX AIUsageLog_clinic_created (clinicId, createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
}

function ai_month_start() {
    return date('Y-m-01 00:00:00');
}

function ai_assert_tenant_quota($db, $clinicId) {
    if (!$clinicId) return;
    ai_ensure_usage_table($db);
    $features = tenant_features_get($db, $clinicId);
    $limit = (int)($features['monthlyAiTokenLimit'] ?? 0);
    if ($limit <= 0) return;
    $stmt = $db->prepare("SELECT COALESCE(SUM(totalTokens), 0) FROM AIUsageLog WHERE clinicId = ? AND createdAt >= ?");
    $stmt->execute([$clinicId, ai_month_start()]);
    if ((int)$stmt->fetchColumn() >= $limit) {
        throw new Exception('Monthly AI token limit reached for this clinic.');
    }
}

function ai_record_usage($db, $clinicId, $provider, $model, $usage, $purpose) {
    if (!$clinicId || empty($usage)) return;
    ai_ensure_usage_table($db);
    $prompt = (int)($usage['prompt_tokens'] ?? 0);
    $completion = (int)($usage['completion_tokens'] ?? 0);
    $total = (int)($usage['total_tokens'] ?? ($prompt + $completion));
    $db->prepare("INSERT INTO AIUsageLog (id, clinicId, provider, model, promptTokens, completionTokens, totalTokens, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([generate_uuid(), $clinicId, $provider, $model, $prompt, $completion, $total, $purpose ?: 'completion']);
    $db->prepare("UPDATE AIProviderSetting SET tokenUsage = COALESCE(tokenUsage, 0) + ? WHERE clinicId = 'platform' AND provider = ?")
       ->execute([$total, $provider]);
}

function ai_get_platform_provider($db) {
    try {
        $stmt = $db->query("SELECT provider, apiKey, model FROM AIProviderSetting
                            WHERE clinicId = 'platform' AND enabled = 1 AND apiKey IS NOT NULL AND apiKey <> ''
                            ORDER BY (provider = 'chatgpt') DESC LIMIT 1");
        return $stmt ? ($stmt->fetch() ?: null) : null;
    } catch (Exception $e) {
        return null;
    }
}

function ai_is_configured($db) {
    return ai_get_platform_provider($db) !== null;
}

// $messages: [['role'=>'system'|'user'|'assistant','content'=>'...'], ...]
// Returns the assistant text, or throws on error / not-configured.
function ai_complete($db, $messages, $opts = []) {
    $clinicId = $opts['clinicId'] ?? null;
    ai_assert_tenant_quota($db, $clinicId);

    $provider = ai_get_platform_provider($db);
    if (!$provider) {
        throw new Exception('AI is not configured. Ask the platform admin to add a key under Platform settings.');
    }

    // Keys are stored encrypted (enc:...); meta_decrypt_secret returns legacy
    // plaintext unchanged, so this is backward-compatible.
    $apiKey = meta_decrypt_secret($provider['apiKey']);
    if (!$apiKey) throw new Exception('AI key could not be read. Re-save it in Platform settings.');

    if ($provider['provider'] === 'chatgpt') {
        $model = $provider['model'] ?: 'gpt-4o-mini';
        $payload = [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => intval($opts['maxTokens'] ?? 220),
            'temperature' => $opts['temperature'] ?? 0.5,
        ];
        $ch = curl_init('https://api.openai.com/v1/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'],
            CURLOPT_TIMEOUT => 30,
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false) throw new Exception('AI request failed: ' . $err);
        $json = json_decode($body, true);
        if ($status >= 400) {
            $msg = $json['error']['message'] ?? ('AI provider error (HTTP ' . $status . ')');
            throw new Exception($msg);
        }
        $text = $json['choices'][0]['message']['content'] ?? '';
        if ($text === '') throw new Exception('AI returned an empty response.');
        ai_record_usage($db, $clinicId, $provider['provider'], $model, $json['usage'] ?? [], $opts['purpose'] ?? 'completion');
        return trim($text);
    }

    throw new Exception('Configured AI provider (' . $provider['provider'] . ') is not supported yet.');
}
