CREATE TABLE IF NOT EXISTS `ClinicFeatureSetting` (
  `clinicId` VARCHAR(64) PRIMARY KEY,
  `whatsappEnabled` TINYINT DEFAULT 0,
  `whatsappMarketingEnabled` TINYINT DEFAULT 0,
  `whatsappAutomationEnabled` TINYINT DEFAULT 0,
  `aiEnabled` TINYINT DEFAULT 0,
  `aiAutoReplyEnabled` TINYINT DEFAULT 0,
  `aiHumanApprovalRequired` TINYINT DEFAULT 1,
  `monthlyAiTokenLimit` INT DEFAULT 0,
  `monthlyWhatsAppLimit` INT DEFAULT 0,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `FK_ClinicFeatureSetting_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
