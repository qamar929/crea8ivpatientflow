-- Additive, zero-downtime migration for soft-archiving AI knowledge entries.
-- Run during a maintenance-safe deploy step; no rows are deleted or rewritten.

ALTER TABLE `ClinicKnowledge`
  ADD COLUMN `archivedAt` TIMESTAMP NULL DEFAULT NULL;
