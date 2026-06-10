<?php
require_once __DIR__ . '/../helpers.php';

function meta_secret_key() {
    return hash('sha256', JWT_SECRET, true);
}

function meta_encrypt_secret($value) {
    if (!$value) return null;
    $iv = random_bytes(16);
    $encrypted = openssl_encrypt($value, 'AES-256-CBC', meta_secret_key(), OPENSSL_RAW_DATA, $iv);
    return 'enc:' . base64_encode($iv . $encrypted);
}

function meta_decrypt_secret($value) {
    if (!$value || strpos($value, 'enc:') !== 0) return $value;
    $decoded = base64_decode(substr($value, 4), true);
    if ($decoded === false || strlen($decoded) < 17) return null;
    return openssl_decrypt(substr($decoded, 16), 'AES-256-CBC', meta_secret_key(), OPENSSL_RAW_DATA, substr($decoded, 0, 16));
}

function meta_whatsapp_error_message($status, $body) {
    $decoded = json_decode($body, true);
    $message = $decoded['error']['message'] ?? $body;
    $code = intval($decoded['error']['code'] ?? 0);
    if ($status === 401 || in_array($code, [190, 401], true)) return 'Access token invalid or expired. Please reconnect the Meta account.';
    if (stripos($message, 'phone') !== false) return 'Phone Number ID is missing or invalid. Check the Meta API settings.';
    if (stripos($message, 'template') !== false) return 'This template is not approved in Meta yet. Sync approved templates and try again.';
    return 'Meta WhatsApp request failed. ' . $message;
}

function meta_whatsapp_request($settings, $method, $path, $payload = null) {
    $accessToken = meta_decrypt_secret($settings['accessToken'] ?? null);
    if (!$accessToken) throw new Exception('Access token is missing. Add the permanent Meta access token first.');
    $version = $settings['apiVersion'] ?: 'v23.0';
    $url = "https://graph.facebook.com/$version/$path";
    $ch = curl_init($url);
    $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken, 'Content-Type: application/json'], CURLOPT_TIMEOUT => 20];
    if ($method === 'POST') $options += [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($payload)];
    curl_setopt_array($ch, $options);
    $body = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); $error = curl_error($ch); curl_close($ch);
    if ($error || $status >= 400) throw new Exception($error ?: meta_whatsapp_error_message($status, $body));
    return json_decode($body, true) ?: [];
}

function meta_whatsapp_send($settings, $to, $payload) {
    $accessToken = meta_decrypt_secret($settings['accessToken'] ?? null);
    if (!empty($settings['simulationMode'])) {
        return ['simulation' => true, 'messageId' => 'sim-' . generate_uuid(), 'status' => 'sent'];
    }
    if (empty($accessToken)) throw new Exception('Access token is missing. Add the permanent Meta access token first.');
    if (empty($settings['phoneNumberId'])) throw new Exception('Phone Number ID is missing. Add it in WhatsApp connectivity settings.');
    $payload = array_merge(['messaging_product' => 'whatsapp', 'recipient_type' => 'individual', 'to' => preg_replace('/\D+/', '', $to)], $payload);
    $decoded = meta_whatsapp_request($settings, 'POST', $settings['phoneNumberId'] . '/messages', $payload);
    return ['simulation' => false, 'messageId' => $decoded['messages'][0]['id'] ?? null, 'status' => 'sent', 'response' => $decoded];
}

function meta_whatsapp_health($settings) {
    if (!empty($settings['simulationMode'])) return ['status'=>'simulation','message'=>'Simulation mode is active. No live messages will be sent.'];
    if (empty($settings['phoneNumberId'])) return ['status'=>'error','message'=>'Phone Number ID is missing.'];
    if (empty($settings['accessToken'])) return ['status'=>'error','message'=>'Access token is missing.'];
    try {
        meta_whatsapp_request($settings, 'GET', $settings['phoneNumberId'] . '?fields=display_phone_number,verified_name');
        return ['status'=>'connected','message'=>'Meta Cloud API connection is healthy.'];
    } catch (Exception $e) {
        return ['status'=>'error','message'=>$e->getMessage()];
    }
}

function meta_whatsapp_templates($settings) {
    if (empty($settings['businessAccountId'])) throw new Exception('WhatsApp Business Account ID is missing.');
    return meta_whatsapp_request($settings, 'GET', $settings['businessAccountId'] . '/message_templates?fields=name,category,language,status,components&limit=200');
}
