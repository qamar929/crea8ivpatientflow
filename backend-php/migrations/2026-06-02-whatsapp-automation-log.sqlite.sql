CREATE TABLE IF NOT EXISTS WhatsAppAutomationLog (id TEXT PRIMARY KEY, clinicId TEXT NOT NULL, automationId TEXT NOT NULL, clientId TEXT NOT NULL, contextKey TEXT NOT NULL, messageId TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS UX_WhatsAppAutomationLog_Context ON WhatsAppAutomationLog(automationId, clientId, contextKey);
