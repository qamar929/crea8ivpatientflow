-- Auth security: password resets + login attempt tracking (SQLite)
CREATE TABLE IF NOT EXISTS PasswordReset (
  id TEXT NOT NULL PRIMARY KEY,
  userId TEXT NOT NULL,
  tokenHash TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  usedAt TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_PasswordReset_TokenHash ON PasswordReset(tokenHash);
CREATE INDEX IF NOT EXISTS IX_PasswordReset_User ON PasswordReset(userId);

CREATE TABLE IF NOT EXISTS LoginAttempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT DEFAULT NULL,
  ip TEXT DEFAULT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS IX_LoginAttempt_Email ON LoginAttempt(email, createdAt);
CREATE INDEX IF NOT EXISTS IX_LoginAttempt_IP ON LoginAttempt(ip, createdAt);
