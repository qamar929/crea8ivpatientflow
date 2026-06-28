-- Additive, zero-downtime migration for tenant-scoped AI usage metering.
-- Safe to run repeatedly. Does not modify or delete existing clinic data.

CREATE TABLE IF NOT EXISTS AIUsageLog (
  id TEXT PRIMARY KEY,
  clinicId TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  promptTokens INTEGER DEFAULT 0,
  completionTokens INTEGER DEFAULT 0,
  totalTokens INTEGER DEFAULT 0,
  purpose TEXT DEFAULT 'completion',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS AIUsageLog_clinic_created ON AIUsageLog(clinicId, createdAt);
