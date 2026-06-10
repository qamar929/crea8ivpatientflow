<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class NotificationController {
    public function list($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("SELECT * FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 30");
        $stmt->execute([$user['id']]);
        $notifications = $stmt->fetchAll();
        
        foreach ($notifications as &$n) {
            $n['read'] = !empty($n['read']);
        }
        send_json($notifications);
    }

    public function markRead($input, $user, $id) {
        $db = DB::getConnection();
        $stmt = $db->prepare("UPDATE Notification SET `read` = 1 WHERE id = ?");
        $stmt->execute([$id]);
        send_json(['message' => 'Marked as read']);
    }

    public function markAllRead($input, $user) {
        $db = DB::getConnection();
        $stmt = $db->prepare("UPDATE Notification SET `read` = 1 WHERE userId = ? AND `read` = 0");
        $stmt->execute([$user['id']]);
        send_json(['message' => 'All marked as read']);
    }
}
