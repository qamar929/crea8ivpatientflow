<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class GalleryController {
    // Confirm the client belongs to the caller's clinic; 404 otherwise.
    private function assertClientInClinic($db, $clientId, $clinicId) {
        $stmt = $db->prepare("SELECT id FROM Client WHERE id = ? AND clinicId = ?");
        $stmt->execute([$clientId, $clinicId]);
        if (!$stmt->fetch()) send_error('Client not found', 404);
    }

    public function list($input, $user, $clientId) {
        $db = DB::getConnection();
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);

        $stmt = $db->prepare(
            "SELECT g.* FROM GalleryItem g
             JOIN Client c ON c.id = g.clientId
             WHERE g.clientId = ? AND c.clinicId = ?
             ORDER BY g.createdAt DESC"
        );
        $stmt->execute([$clientId, $user['clinicId']]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['isPrivate'] = !empty($item['isPrivate']);
        }
        send_json($items);
    }

    public function upload($input, $user, $clientId) {
        $db = DB::getConnection();
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);

        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            send_error('No file uploaded or file upload error', 400);
        }

        $file = $_FILES['image'];

        // Validate it really is an image (defense against arbitrary file upload)
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        if (!isset($allowed[$mime])) {
            send_error('Only JPG, PNG, WEBP or GIF images are allowed', 400);
        }
        if ($file['size'] > 8 * 1024 * 1024) {
            send_error('Image must be under 8 MB', 400);
        }

        $type = $input['type'] ?? 'before';
        $service = $input['service'] ?? null;
        $notes = $input['notes'] ?? null;
        $appointmentId = $input['appointmentId'] ?? null;
        $isPrivate = isset($input['isPrivate']) && $input['isPrivate'] === 'false' ? 0 : 1;
        if ($appointmentId) {
            $stmt = $db->prepare("SELECT id FROM Appointment WHERE id = ? AND clientId = ? AND clinicId = ?");
            $stmt->execute([$appointmentId, $clientId, $user['clinicId']]);
            if (!$stmt->fetch()) {
                send_error('Appointment not found for this client', 400);
            }
        }

        // Per-clinic directory keeps one tenant's files out of another's folder
        $clinicId = $user['clinicId'];
        $dir = UPLOAD_DIR . $clinicId . '/';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        // Server-generated filename + extension from the verified MIME type
        $filename = time() . '-' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
        $targetPath = $dir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            send_error('Failed to save uploaded file', 500);
        }

        $id = generate_uuid();
        $imageUrl = "/uploads/" . $clinicId . "/" . $filename;

        $stmt = $db->prepare("INSERT INTO GalleryItem (id, clientId, appointmentId, type, imageUrl, service, notes, isPrivate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id, $clientId, $appointmentId, $type, $imageUrl, $service, $notes, $isPrivate
        ]);

        $stmt = $db->prepare(
            "SELECT g.* FROM GalleryItem g
             JOIN Client c ON c.id = g.clientId
             WHERE g.id = ? AND c.clinicId = ?"
        );
        $stmt->execute([$id, $user['clinicId']]);
        $item = $stmt->fetch();
        $item['isPrivate'] = !empty($item['isPrivate']);

        send_json($item, 201);
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();

        // Only allow deleting items whose client belongs to the caller's clinic
        $stmt = $db->prepare(
            "SELECT g.imageUrl FROM GalleryItem g
             JOIN Client c ON c.id = g.clientId
             WHERE g.id = ? AND c.clinicId = ?"
        );
        $stmt->execute([$id, $user['clinicId']]);
        $imageUrl = $stmt->fetchColumn();
        if ($imageUrl === false) send_error('Gallery item not found', 404);

        // Resolve the file path safely under this clinic's upload dir
        if ($imageUrl) {
            $relative = ltrim(str_replace('/uploads/', '', $imageUrl), '/');
            $filePath = realpath(UPLOAD_DIR . $relative);
            $base = realpath(UPLOAD_DIR);
            if ($filePath && $base && strpos($filePath, $base) === 0 && is_file($filePath)) {
                @unlink($filePath);
            }
        }

        $stmt = $db->prepare("DELETE FROM GalleryItem WHERE id = ? AND clientId IN (SELECT id FROM Client WHERE clinicId = ?)");
        $stmt->execute([$id, $user['clinicId']]);
        send_json(['message' => 'Deleted']);
    }
}
