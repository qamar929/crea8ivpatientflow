-- Additive, zero-downtime migration for tenant-scoped AI usage metering.
-- Safe to run repeatedly. Does not modify or delete existing clinic data.

CREATE TABLE IF NOT EXISTS `AIUsageLog` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `model` VARCHAR(120),
  `promptTokens` INT DEFAULT 0,
  `completionTokens` INT DEFAULT 0,
  `totalTokens` INT DEFAULT 0,
  `purpose` VARCHAR(80) DEFAULT 'completion',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `AIUsageLog_clinic_created` (`clinicId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
