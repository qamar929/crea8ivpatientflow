-- Industry Templates: additive, zero-downtime migration.
-- Existing tenants keep Healthcare behavior through runtime fallback when
-- ClinicFeatureSetting.industryTemplate is NULL.

CREATE TABLE IF NOT EXISTS `IndustryTemplate` (
  `templateKey` VARCHAR(80) PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `configJson` JSON NOT NULL,
  `isActive` TINYINT DEFAULT 1,
  `sortOrder` INT DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @industry_template_column_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ClinicFeatureSetting'
    AND COLUMN_NAME = 'industryTemplate'
);

SET @industry_template_column_sql = IF(
  @industry_template_column_missing,
  'ALTER TABLE `ClinicFeatureSetting` ADD COLUMN `industryTemplate` VARCHAR(80) DEFAULT NULL',
  'SELECT 1'
);

PREPARE industry_template_column_stmt FROM @industry_template_column_sql;
EXECUTE industry_template_column_stmt;
DEALLOCATE PREPARE industry_template_column_stmt;
