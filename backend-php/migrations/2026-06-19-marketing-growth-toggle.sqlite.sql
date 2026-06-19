-- Crea8iv PatientFlow: Marketing Growth feature toggle (SQLite)
-- SQLite has limited IF NOT EXISTS support for ADD COLUMN; local dev can use
-- tenant_features_ensure() which performs the column check safely.

ALTER TABLE ClinicFeatureSetting ADD COLUMN marketingEnabled INTEGER DEFAULT 0;
ALTER TABLE ClinicFeatureSetting ADD COLUMN metaLeadsEnabled INTEGER DEFAULT 0;
ALTER TABLE ClinicFeatureSetting ADD COLUMN importsEnabled INTEGER DEFAULT 0;
