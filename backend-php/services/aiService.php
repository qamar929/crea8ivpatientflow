<?php
// Central AI helper. Resolves the super-admin's shared platform key
// (AIProviderSetting clinicId='platform') and runs a chat completion.
// Today only ChatGPT (OpenAI) is wired; gemini/claude can be added here.
require_once __DIR__ . '/metaWhatsAppService.php'; // meta_encrypt_secret / meta_decrypt_secret

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
        return trim($text);
    }

    throw new Exception('Configured AI provider (' . $provider['provider'] . ') is not supported yet.');
}
