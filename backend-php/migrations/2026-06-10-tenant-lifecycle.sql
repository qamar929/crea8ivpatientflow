-- Crea8iv PatientFlow: tenant lifecycle, subscriptions, leads, support (MySQL)

ALTER TABLE `Clinic`
  ADD COLUMN `slug` VARCHAR(63) DEFAULT NULL,
  ADD COLUMN `customDomain` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN `clinicType` VARCHAR(20) NOT NULL DEFAULT 'dental',
  ADD COLUMN `trialEndsAt` DATETIME DEFAULT NULL,
  ADD COLUMN `suspendedAt` DATETIME DEFAULT NULL,
  ADD COLUMN `suspensionReason` VARCHAR(255) DEFAULT NULL;

ALTER TABLE `Clinic` ADD UNIQUE KEY `UX_Clinic_Slug` (`slug`);
ALTER TABLE `Clinic` ADD UNIQUE KEY `UX_Clinic_CustomDomain` (`customDomain`);

CREATE TABLE IF NOT EXISTS `RegistrationLead` (
  `id` VARCHAR(36) NOT NULL,
  `clinicName` VARCHAR(255) NOT NULL,
  `contactName` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `clinicType` VARCHAR(30) DEFAULT 'dental',
  `branches` INT NOT NULL DEFAULT 1,
  `message` TEXT DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'new',
  `notes` TEXT DEFAULT NULL,
  `clinicId` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_RegistrationLead_Status` (`status`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Subscription` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `billingCycle` VARCHAR(10) NOT NULL,
  `amountPKR` DECIMAL(12,2) NOT NULL,
  `startsAt` DATETIME NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_Subscription_Clinic` (`clinicId`, `expiresAt`),
  CONSTRAINT `FK_Subscription_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Payment` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `subscriptionId` VARCHAR(36) DEFAULT NULL,
  `amountPKR` DECIMAL(12,2) NOT NULL,
  `method` VARCHAR(30) NOT NULL DEFAULT 'bank_transfer',
  `screenshotPath` VARCHAR(500) DEFAULT NULL,
  `reference` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'submitted',
  `verifiedBy` VARCHAR(36) DEFAULT NULL,
  `verifiedAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_Payment_Clinic` (`clinicId`, `createdAt`),
  KEY `IX_Payment_Status` (`status`, `createdAt`),
  CONSTRAINT `FK_Payment_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SupportTicket` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `openedBy` VARCHAR(36) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `priority` VARCHAR(10) NOT NULL DEFAULT 'normal',
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_SupportTicket_Clinic` (`clinicId`, `status`),
  CONSTRAINT `FK_SupportTicket_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `SupportMessage` (
  `id` VARCHAR(36) NOT NULL,
  `ticketId` VARCHAR(36) NOT NULL,
  `senderType` VARCHAR(10) NOT NULL,
  `senderId` VARCHAR(36) DEFAULT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_SupportMessage_Ticket` (`ticketId`, `createdAt`),
  CONSTRAINT `FK_SupportMessage_Ticket` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing live clinics stay active
UPDATE `Clinic` SET `status` = 'active' WHERE `status` IS NULL OR `status` = '';
