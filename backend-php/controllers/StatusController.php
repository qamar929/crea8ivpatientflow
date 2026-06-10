<?php
require_once __DIR__ . '/../helpers.php';

class StatusController {
    public function health($input, $user) {
        send_json([
            'status' => 'ok',
            'timestamp' => date('Y-m-d\TH:i:s\Z')
        ]);
    }
}
