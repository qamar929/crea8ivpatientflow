-- Auth security: password resets + login attempt tracking (MySQL)
CREATE TABLE IF NOT EXISTS PasswordReset (
  id VARCHAR(36) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  tokenHash CHAR(64) NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY IX_PasswordReset_TokenHash (tokenHash),
  KEY IX_PasswordReset_User (userId),
  CONSTRAINT FK_PasswordReset_User FOREIGN KEY (userId) REFERENCES `User` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS LoginAttempt (
  id BIGINT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) DEFAULT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY IX_LoginAttempt_Email (email, createdAt),
  KEY IX_LoginAttempt_IP (ip, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
