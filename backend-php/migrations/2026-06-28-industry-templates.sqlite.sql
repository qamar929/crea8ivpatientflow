-- Industry Templates: additive, zero-downtime migration.
-- Existing tenants keep Healthcare behavior through runtime fallback when
-- ClinicFeatureSetting.industryTemplate is NULL.

CREATE TABLE IF NOT EXISTS IndustryTemplate (
  templateKey TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  configJson TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ClinicFeatureSetting
  ADD COLUMN industryTemplate TEXT DEFAULT NULL;
