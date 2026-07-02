<?php
require_once __DIR__ . '/../helpers.php';

// Serves patient uploads through short-lived signed URLs.
//
// Direct web access to uploads/ is denied (.htaccess); every file URL the API
// returns is signed: /api/v1/files/{b64url(relPath)}?exp={unix}&sig={hmac}.
// The signature covers "relPath|exp" with JWT_SECRET, so links can't be forged
// or extended, and a leaked link dies when exp passes.
class FileController {

    public function serve($input, $user, $token) {
        $exp = (int)($_GET['exp'] ?? 0);
        $sig = (string)($_GET['sig'] ?? '');
        $relPath = pf_b64url_decode((string)$token);

        // Validate signature BEFORE touching the filesystem.
        if ($relPath === false || $relPath === '' || $exp <= 0 || $sig === '') {
            send_error('Invalid file link', 404);
        }
        if (time() > $exp) {
            send_error('This file link has expired — reopen the page to get a fresh one', 410);
        }
        if (!hash_equals(pf_file_sig($relPath, $exp), $sig)) {
            send_error('Invalid file link', 404);
        }

        // Path-traversal hardening: no NUL/backslash/dot-dot, must stay in UPLOAD_DIR.
        if (strpos($relPath, "\0") !== false || strpos($relPath, '..') !== false || strpos($relPath, '\\') !== false || $relPath[0] === '/') {
            send_error('Invalid file link', 404);
        }
        $full = realpath(UPLOAD_DIR . $relPath);
        $base = realpath(UPLOAD_DIR);
        if ($full === false || $base === false || strpos($full, $base . DIRECTORY_SEPARATOR) !== 0 || !is_file($full)) {
            send_error('File not found', 404);
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $full) ?: 'application/octet-stream';
        finfo_close($finfo);

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($full));
        header('Content-Disposition: inline; filename="' . basename($full) . '"');
        header('Cache-Control: private, max-age=300');
        header('X-Content-Type-Options: nosniff');
        readfile($full);
        exit;
    }
}
