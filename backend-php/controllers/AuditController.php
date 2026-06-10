<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

class AuditController {
    public function list($input, $user) {
        $action = $_GET['action'] ?? '';
        $entity = $_GET['entity'] ?? '';
        $userId = $_GET['userId'] ?? '';
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = ($page - 1) * $limit;

        $db = DB::getConnection();
        $where = ["a.clinicId = ?"];
        $params = [$user['clinicId']];

        if (!empty($action)) {
            $where[] = "a.action = ?";
            $params[] = $action;
        }
        if (!empty($entity)) {
            $where[] = "a.entity = ?";
            $params[] = $entity;
        }
        if (!empty($userId)) {
            $where[] = "a.userId = ?";
            $params[] = $userId;
        }
        if (!empty($from) && !empty($to)) {
            $where[] = "a.createdAt >= ? AND a.createdAt <= ?";
            $params[] = $from . ' 00:00:00';
            $params[] = $to . ' 23:59:59';
        }

        $whereSql = implode(" AND ", $where);
        
        // Count total
        $countStmt = $db->prepare("SELECT COUNT(*) FROM AuditLog a WHERE $whereSql");
        $countStmt->execute($params);
        $total = intval($countStmt->fetchColumn());

        // Get logs
        $sql = "SELECT a.*, 
                       u.name as userName, u.role as userRole
                FROM AuditLog a
                LEFT JOIN User u ON a.userId = u.id
                WHERE $whereSql
                ORDER BY a.createdAt DESC
                LIMIT $limit OFFSET $offset";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        // format to match prisma include structures
        $formatted = [];
        foreach ($logs as $row) {
            $row['user'] = $row['userId'] ? [
                'name' => $row['userName'],
                'role' => $row['userRole']
            ] : null;
            
            unset($row['userName'], $row['userRole']);
            $formatted[] = $row;
        }

        send_json([
            'logs' => $formatted,
            'total' => $total
        ]);
    }
}
