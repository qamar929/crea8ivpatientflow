-- Self-service custom domain management: status, ownership token, SSL (MySQL)
ALTER TABLE `Clinic`
  ADD COLUMN `domainStatus` VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN `domainToken` VARCHAR(64) DEFAULT NULL,
  ADD COLUMN `domainVerifiedAt` DATETIME DEFAULT NULL,
  ADD COLUMN `domainLastError` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN `sslStatus` VARCHAR(20) NOT NULL DEFAULT 'none';

-- Existing clinics that already had a customDomain set are treated as connected
UPDATE `Clinic` SET `domainStatus` = 'connected', `sslStatus` = 'active'
  WHERE `customDomain` IS NOT NULL AND `customDomain` != '';
