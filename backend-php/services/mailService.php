<?php
// Email delivery for auth + notifications.
// Production (Hostinger): PHP mail() delivers via the host's sendmail.
// Development / no mail config: messages are appended to logs/mail.log so
// the full email (including reset links) can be inspected locally.

// Delivery order:
//   1. SMTP (if SMTP_HOST configured) — reliable transactional delivery
//   2. PHP mail() (shared-host sendmail) — fallback
//   3. logs/mail.log — dev / last resort so reset links are never lost
function send_app_email($to, $subject, $htmlBody) {
    if (SMTP_HOST !== '') {
        $ok = smtp_send($to, $subject, $htmlBody, $err);
        if ($ok) return true;
        error_log("SMTP send failed for $to: $err");
        // fall through to mail()/log so the message isn't silently dropped
    }

    if (APP_ENV !== 'development' && function_exists('mail')) {
        $headers = implode("\r\n", [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>',
        ]);
        if (@mail($to, $subject, $htmlBody, $headers)) return true;
        error_log("mail() failed for $to: $subject");
    }

    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) mkdir($logDir, 0750, true);
    file_put_contents(
        $logDir . '/mail.log',
        sprintf("[%s] TO: %s\nSUBJECT: %s\n%s\n%s\n", date('Y-m-d H:i:s'), $to, $subject, $htmlBody, str_repeat('-', 60)),
        FILE_APPEND | LOCK_EX
    );
    return true;
}

// Minimal dependency-free SMTP client: STARTTLS (port 587) or implicit TLS
// (port 465) + AUTH LOGIN. Works with Hostinger SMTP, Gmail, or any relay.
function smtp_send($to, $subject, $htmlBody, &$err = null) {
    $host = SMTP_HOST; $port = SMTP_PORT ?: 587;
    $user = SMTP_USER; $pass = SMTP_PASS;
    $from = MAIL_FROM; $fromName = MAIL_FROM_NAME;

    $transport = ($port == 465) ? 'ssl://' : 'tcp://';
    $fp = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, 15);
    if (!$fp) { $err = "connect: $errstr ($errno)"; return false; }
    stream_set_timeout($fp, 15);

    $read = function () use ($fp) {
        $data = '';
        while ($line = fgets($fp, 515)) {
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        return $data;
    };
    $cmd = function ($c) use ($fp, $read) { fwrite($fp, $c . "\r\n"); return $read(); };
    $expect = function ($resp, $code) use (&$err) {
        if (strpos($resp, (string)$code) !== 0) { $err = trim($resp); return false; }
        return true;
    };

    if (!$expect($read(), 220)) { fclose($fp); return false; }
    $cmd('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'crea8ivmedia.com'));

    if ($port != 465) {
        if (!$expect($cmd('STARTTLS'), 220)) { fclose($fp); return false; }
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $err = 'STARTTLS failed'; fclose($fp); return false;
        }
        $cmd('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'crea8ivmedia.com'));
    }

    if ($user !== '') {
        if (!$expect($cmd('AUTH LOGIN'), 334)) { fclose($fp); return false; }
        if (!$expect($cmd(base64_encode($user)), 334)) { fclose($fp); return false; }
        if (!$expect($cmd(base64_encode($pass)), 235)) { fclose($fp); return false; }
    }

    if (!$expect($cmd('MAIL FROM:<' . $from . '>'), 250)) { fclose($fp); return false; }
    if (!$expect($cmd('RCPT TO:<' . $to . '>'), 250)) { fclose($fp); return false; }
    if (!$expect($cmd('DATA'), 354)) { fclose($fp); return false; }

    $headers =
        'From: ' . $fromName . ' <' . $from . ">\r\n" .
        'To: <' . $to . ">\r\n" .
        'Subject: ' . $subject . "\r\n" .
        "MIME-Version: 1.0\r\n" .
        "Content-Type: text/html; charset=UTF-8\r\n";
    // Dot-stuff any line beginning with "." per RFC 5321
    $body = preg_replace('/^\./m', '..', $htmlBody);
    $ok = $expect($cmd($headers . "\r\n" . $body . "\r\n."), 250);
    $cmd('QUIT');
    fclose($fp);
    return $ok;
}

function password_reset_email_html($name, $resetUrl, $ttlMinutes) {
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    return <<<HTML
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f766e;">Password Reset Request</h2>
  <p>Hi {$safeName},</p>
  <p>We received a request to reset your portal password. Click the button below to choose a new one. This link expires in {$ttlMinutes} minutes and can be used once.</p>
  <p style="margin:28px 0;">
    <a href="{$resetUrl}" style="background:#0f766e;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a>
  </p>
  <p style="color:#64748b;font-size:13px;">If the button doesn't work, copy this link into your browser:<br>{$resetUrl}</p>
  <p style="color:#64748b;font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
</div>
HTML;
}
