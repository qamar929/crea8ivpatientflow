-- Crea8iv PatientFlow: Marketing Growth feature toggle (MySQL)
-- Safe to run repeatedly. Existing clinic data is not overwritten.

ALTER TABLE `ClinicFeatureSetting`
  ADD COLUMN IF NOT EXISTS `marketingEnabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `clinicId`;

ALTER TABLE `ClinicFeatureSetting`
  ADD COLUMN IF NOT EXISTS `metaLeadsEnabled` TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE `ClinicFeatureSetting`
  ADD COLUMN IF NOT EXISTS `importsEnabled` TINYINT(1) NOT NULL DEFAULT 0;
