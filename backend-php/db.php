<?php
require_once __DIR__ . '/config.php';

class DB {
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            try {
                $dsn = DB_DRIVER === 'sqlite'
                    ? "sqlite:" . DB_PATH
                    : "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                self::$pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                if (DB_DRIVER === 'sqlite') {
                    self::$pdo->exec("PRAGMA foreign_keys = ON");
                    self::$pdo->exec("CREATE TABLE IF NOT EXISTS PublicSiteConfig (
                        clinicId TEXT NOT NULL PRIMARY KEY,
                        configJson TEXT NOT NULL,
                        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
                    )");
                }
            } catch (PDOException $e) {
                header('Content-Type: application/json');
                http_response_code(500);
                error_log('Database connection failed: ' . $e->getMessage());
                echo json_encode(['error' => 'Database connection failed. Contact support.']);
                exit;
            }
        }
        return self::$pdo;
    }
}
