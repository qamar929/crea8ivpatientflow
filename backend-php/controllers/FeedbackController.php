<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class FeedbackController {
    private function validateRatings($staffRating, $serviceRating, $overallRating) {
        foreach ([$staffRating, $serviceRating, $overallRating] as $rating) {
            if ($rating < 1 || $rating > 5) {
                send_error('Ratings must be between 1 and 5', 400);
            }
        }
    }

    private function assertClientInClinic($db, $clientId, $clinicId) {
        $stmt = $db->prepare("SELECT id FROM Client WHERE id = ? AND clinicId = ? AND status != 'inactive'");
        $stmt->execute([$clientId, $clinicId]);
        if (!$stmt->fetch()) {
            send_error('Client not found', 404);
        }
    }

    private function assertStaffInClinic($db, $staffId, $clinicId) {
        if (empty($staffId)) return;
        $stmt = $db->prepare("SELECT id FROM Staff WHERE id = ? AND clinicId = ?");
        $stmt->execute([$staffId, $clinicId]);
        if (!$stmt->fetch()) {
            send_error('Staff not found', 404);
        }
    }

    private function appointmentStaff($db, $appointmentId, $clinicId) {
        if (empty($appointmentId)) return null;
        $stmt = $db->prepare("SELECT staffId FROM Appointment WHERE id = ? AND clinicId = ?");
        $stmt->execute([$appointmentId, $clinicId]);
        $staffId = $stmt->fetchColumn();
        if ($staffId === false) {
            send_error('Appointment not found', 404);
        }
        return $staffId ?: null;
    }

    private function ensureArchiveColumn($db) {
        $type = DB_DRIVER === 'sqlite' ? 'TEXT DEFAULT NULL' : 'DATETIME NULL DEFAULT NULL';
        try { $db->exec("ALTER TABLE Feedback ADD COLUMN archivedAt $type"); } catch (Exception $ignored) {}
    }

    private function recalculateStaffRating($db, $staffId, $clinicId) {
        if (empty($staffId)) {
            return;
        }

        $this->ensureArchiveColumn($db);
        $stmtAvg = $db->prepare("SELECT AVG(overallRating) FROM Feedback WHERE staffId = ? AND clinicId = ? AND archivedAt IS NULL");
        $stmtAvg->execute([$staffId, $clinicId]);
        $avg = $stmtAvg->fetchColumn();
        $rating = $avg === null ? 0 : round(floatval($avg), 1);

        $stmtUpdate = $db->prepare("UPDATE Staff SET rating = ? WHERE id = ? AND clinicId = ?");
        $stmtUpdate->execute([$rating, $staffId, $clinicId]);
    }

    public function list($input, $user) {
        $staffId = $_GET['staffId'] ?? '';
        $minRating = $_GET['minRating'] ?? '';

        $db = DB::getConnection();
        $this->ensureArchiveColumn($db);
        $where = ["f.clinicId = ?", "f.archivedAt IS NULL"];
        $params = [$user['clinicId']];

        if (!empty($staffId)) {
            $where[] = "f.staffId = ?";
            $params[] = $staffId;
        }
        if (!empty($minRating)) {
            $where[] = "f.overallRating >= ?";
            $params[] = intval($minRating);
        }

        $whereSql = implode(" AND ", $where);
        
        $sql = "SELECT f.*,
                       c.name as clientName, c.avatarColor as clientAvatarColor, c.initials as clientInitials,
                       a.id as apptId, a.date as apptDate, a.startTime as apptStartTime, a.endTime as apptEndTime, a.status as apptStatus,
                       s.id as staffId, s.name as staffName, s.role as staffRole,
                       srv.id as serviceId, srv.name as serviceName
                FROM Feedback f
                LEFT JOIN Client c ON f.clientId = c.id AND c.clinicId = f.clinicId
                LEFT JOIN Appointment a ON f.appointmentId = a.id AND a.clinicId = f.clinicId
                LEFT JOIN Staff s ON f.staffId = s.id AND s.clinicId = f.clinicId
                LEFT JOIN Service srv ON a.serviceId = srv.id AND srv.clinicId = f.clinicId
                WHERE $whereSql
                ORDER BY f.createdAt DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $feedbacks = $stmt->fetchAll();

        // format to match prisma include structures
        $formatted = [];
        foreach ($feedbacks as $row) {
            $row['client'] = [
                'name' => $row['clientName'],
                'avatarColor' => $row['clientAvatarColor'],
                'initials' => $row['clientInitials']
            ];
            
            if ($row['appointmentId']) {
                $row['appointment'] = [
                    'id' => $row['apptId'],
                    'date' => $row['apptDate'],
                    'startTime' => $row['apptStartTime'],
                    'endTime' => $row['apptEndTime'],
                    'status' => $row['apptStatus'],
                    'staff' => [
                        'name' => $row['staffName'],
                        'role' => $row['staffRole']
                    ],
                    'service' => [
                        'name' => $row['serviceName']
                    ]
                ];
            } else {
                $row['appointment'] = null;
            }

            unset(
                $row['clientName'], $row['clientAvatarColor'], $row['clientInitials'],
                $row['apptId'], $row['apptDate'], $row['apptStartTime'], $row['apptEndTime'], $row['apptStatus'],
                $row['staffName'], $row['staffRole'], $row['serviceName']
            );
            $formatted[] = $row;
        }

        send_json($formatted);
    }

    public function create($input, $user) {
        $db = DB::getConnection();

        $id = generate_uuid();
        $clientId = $input['clientId'] ?? '';
        $appointmentId = $input['appointmentId'] ?? null;
        $staffRating = intval($input['staffRating'] ?? 5);
        $serviceRating = intval($input['serviceRating'] ?? 5);
        $overallRating = intval($input['overallRating'] ?? 5);
        $comment = $input['comment'] ?? null;
        $wouldRecommend = !isset($input['wouldRecommend']) || !empty($input['wouldRecommend']) ? 1 : 0;
        $isPublic = !empty($input['isPublic']) ? 1 : 0;
        $this->validateRatings($staffRating, $serviceRating, $overallRating);
        
        $staffId = $input['staffId'] ?? null;

        if (empty($clientId)) {
            send_error('clientId is required', 400);
        }
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);

        // If appointment provided, find staffId if not provided
        if (empty($staffId) && !empty($appointmentId)) {
            $staffId = $this->appointmentStaff($db, $appointmentId, $user['clinicId']);
        }
        $this->assertStaffInClinic($db, $staffId, $user['clinicId']);

        try {
            $db->beginTransaction();

            $stmt = $db->prepare("INSERT INTO Feedback (id, clinicId, clientId, appointmentId, staffRating, serviceRating, overallRating, comment, wouldRecommend, isPublic, staffId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id, $user['clinicId'], $clientId, $appointmentId, $staffRating, $serviceRating, $overallRating, $comment, $wouldRecommend, $isPublic, $staffId
            ]);

            $this->recalculateStaffRating($db, $staffId, $user['clinicId']);

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM Feedback WHERE id = ? AND clinicId = ?");
            $stmtFetch->execute([$id, $user['clinicId']]);
            $fb = $stmtFetch->fetch();

            send_json($fb, 201);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function update($input, $user, $id) {
        $db = DB::getConnection();

        $stmtExisting = $db->prepare("SELECT * FROM Feedback WHERE id = ? AND clinicId = ?");
        $stmtExisting->execute([$id, $user['clinicId']]);
        $existing = $stmtExisting->fetch();

        if (!$existing) {
            send_error('Feedback not found', 404);
        }

        $clientId = $input['clientId'] ?? $existing['clientId'];
        $appointmentId = array_key_exists('appointmentId', $input) ? ($input['appointmentId'] ?: null) : $existing['appointmentId'];
        $staffId = array_key_exists('staffId', $input) ? ($input['staffId'] ?: null) : $existing['staffId'];
        $staffRating = intval($input['staffRating'] ?? $existing['staffRating']);
        $serviceRating = intval($input['serviceRating'] ?? $existing['serviceRating']);
        $overallRating = intval($input['overallRating'] ?? $existing['overallRating']);
        $comment = array_key_exists('comment', $input) ? $input['comment'] : $existing['comment'];
        $wouldRecommend = array_key_exists('wouldRecommend', $input) ? (!empty($input['wouldRecommend']) ? 1 : 0) : intval($existing['wouldRecommend']);
        $isPublic = array_key_exists('isPublic', $input) ? (!empty($input['isPublic']) ? 1 : 0) : intval($existing['isPublic']);
        $this->validateRatings($staffRating, $serviceRating, $overallRating);

        if (empty($clientId)) {
            send_error('clientId is required', 400);
        }
        $this->assertClientInClinic($db, $clientId, $user['clinicId']);

        if (empty($staffId) && !empty($appointmentId)) {
            $staffId = $this->appointmentStaff($db, $appointmentId, $user['clinicId']);
        } elseif (!empty($appointmentId)) {
            $this->appointmentStaff($db, $appointmentId, $user['clinicId']);
        }
        $this->assertStaffInClinic($db, $staffId, $user['clinicId']);

        try {
            $db->beginTransaction();

            $stmtUpdate = $db->prepare("
                UPDATE Feedback
                SET clientId = ?, appointmentId = ?, staffRating = ?, serviceRating = ?, overallRating = ?, comment = ?, wouldRecommend = ?, isPublic = ?, staffId = ?
                WHERE id = ? AND clinicId = ?
            ");
            $stmtUpdate->execute([
                $clientId, $appointmentId, $staffRating, $serviceRating, $overallRating, $comment, $wouldRecommend, $isPublic, $staffId, $id, $user['clinicId']
            ]);

            $this->recalculateStaffRating($db, $existing['staffId'], $user['clinicId']);
            if ($staffId !== $existing['staffId']) {
                $this->recalculateStaffRating($db, $staffId, $user['clinicId']);
            }

            $db->commit();

            $stmtFetch = $db->prepare("SELECT * FROM Feedback WHERE id = ? AND clinicId = ?");
            $stmtFetch->execute([$id, $user['clinicId']]);
            send_json($stmtFetch->fetch());
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function remove($input, $user, $id) {
        $db = DB::getConnection();

        $stmtExisting = $db->prepare("SELECT staffId FROM Feedback WHERE id = ? AND clinicId = ?");
        $stmtExisting->execute([$id, $user['clinicId']]);
        $existing = $stmtExisting->fetch();

        if (!$existing) {
            send_error('Feedback not found', 404);
        }

        try {
            $db->beginTransaction();

            $this->ensureArchiveColumn($db);
            $stmtDelete = $db->prepare("UPDATE Feedback SET archivedAt = CURRENT_TIMESTAMP, isPublic = 0 WHERE id = ? AND clinicId = ?");
            $stmtDelete->execute([$id, $user['clinicId']]);

            $this->recalculateStaffRating($db, $existing['staffId'], $user['clinicId']);

            $db->commit();
            send_json(['message' => 'Archived']);
        } catch (Exception $e) {
            $db->rollBack();
            send_error($e->getMessage(), 500);
        }
    }

    public function getSummary($input, $user) {
        $db = DB::getConnection();
        
        $stmt = $db->prepare("SELECT * FROM Feedback WHERE clinicId = ?");
        $stmt->execute([$user['clinicId']]);
        $feedback = $stmt->fetchAll();

        $total = count($feedback);
        if ($total === 0) {
            send_json([
                'total' => 0,
                'avgOverall' => 0,
                'avgStaff' => 0,
                'avgService' => 0,
                'recommendRate' => 0
            ]);
        }

        $sumOverall = 0;
        $sumStaff = 0;
        $sumService = 0;
        $recommend = 0;

        foreach ($feedback as $f) {
            $sumOverall += intval($f['overallRating']);
            $sumStaff += intval($f['staffRating']);
            $sumService += intval($f['serviceRating']);
            if (!empty($f['wouldRecommend'])) {
                $recommend++;
            }
        }

        send_json([
            'total' => $total,
            'avgOverall' => $sumOverall / $total,
            'avgStaff' => $sumStaff / $total,
            'avgService' => $sumService / $total,
            'recommendRate' => round(($recommend / $total) * 100)
        ]);
    }
}
