-- The Smile Xperts Hostinger Go-Live Seed
-- Run after importing schema.sql and the MySQL migration files in backend-php/migrations.
-- This removes demo operational data and prepares the production clinic profile.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `WhatsAppSetting` (
  `clinicId` VARCHAR(64) PRIMARY KEY,
  `phoneNumberId` VARCHAR(120),
  `businessAccountId` VARCHAR(120),
  `accessToken` TEXT,
  `webhookVerifyToken` VARCHAR(255),
  `apiVersion` VARCHAR(20) DEFAULT 'v23.0',
  `simulationMode` TINYINT DEFAULT 1,
  `currency` VARCHAR(10) DEFAULT 'PKR',
  `quietHoursStart` VARCHAR(10) DEFAULT '21:00',
  `quietHoursEnd` VARCHAR(10) DEFAULT '09:00',
  `lastWebhookAt` DATETIME,
  `lastWebhookError` TEXT,
  `webhookFailureCount` INT DEFAULT 0,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppTemplate` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `category` VARCHAR(30) NOT NULL,
  `language` VARCHAR(20) DEFAULT 'en',
  `messageType` VARCHAR(30) DEFAULT 'template',
  `body` TEXT NOT NULL,
  `status` VARCHAR(30) DEFAULT 'draft',
  `purpose` VARCHAR(30) DEFAULT 'service',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppConversation` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `clientId` VARCHAR(64) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'open',
  `assignedTo` VARCHAR(64),
  `preferredLanguage` VARCHAR(10) DEFAULT 'en',
  `internalNote` TEXT,
  `freeReplyUntil` DATETIME,
  `lastMessageAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `unreadCount` INT DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `UX_WhatsAppConversation_Client` (`clinicId`, `clientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppMessage` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `conversationId` VARCHAR(64) NOT NULL,
  `clientId` VARCHAR(64) NOT NULL,
  `direction` VARCHAR(20) NOT NULL,
  `purpose` VARCHAR(30) DEFAULT 'support',
  `messageType` VARCHAR(30) DEFAULT 'text',
  `body` TEXT,
  `mediaUrl` TEXT,
  `templateName` VARCHAR(180),
  `metaMessageId` VARCHAR(255),
  `deliveryStatus` VARCHAR(30) DEFAULT 'queued',
  `sentBy` VARCHAR(64),
  `cost` DECIMAL(12,4) DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppAutomation` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `triggerType` VARCHAR(80) NOT NULL,
  `triggerValue` VARCHAR(120),
  `actionType` VARCHAR(80) DEFAULT 'send_template',
  `templateId` VARCHAR(64),
  `purpose` VARCHAR(30) DEFAULT 'service',
  `isActive` TINYINT DEFAULT 1,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppCampaign` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `segment` VARCHAR(80) NOT NULL,
  `templateId` VARCHAR(64),
  `mediaType` VARCHAR(30) DEFAULT 'text',
  `mediaUrl` TEXT,
  `offerCode` VARCHAR(100),
  `status` VARCHAR(30) DEFAULT 'draft',
  `scheduledAt` DATETIME,
  `sentCount` INT DEFAULT 0,
  `deliveredCount` INT DEFAULT 0,
  `readCount` INT DEFAULT 0,
  `responseCount` INT DEFAULT 0,
  `conversionCount` INT DEFAULT 0,
  `revenue` DECIMAL(14,2) DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppAutomationLog` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `automationId` VARCHAR(64) NOT NULL,
  `clientId` VARCHAR(64) NOT NULL,
  `contextKey` VARCHAR(180) NOT NULL,
  `messageId` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `UX_WhatsAppAutomationLog_Context` (`automationId`, `clientId`, `contextKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppQueue` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `clientId` VARCHAR(64),
  `conversationId` VARCHAR(64),
  `phone` VARCHAR(40) NOT NULL,
  `payloadJson` TEXT NOT NULL,
  `purpose` VARCHAR(30) DEFAULT 'support',
  `status` VARCHAR(30) DEFAULT 'pending',
  `attempts` INT DEFAULT 0,
  `lastError` TEXT,
  `nextRetryAt` DATETIME,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppWebhookLog` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64),
  `eventType` VARCHAR(60) NOT NULL,
  `status` VARCHAR(30) DEFAULT 'received',
  `details` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WhatsAppMediaLibrary` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `mediaType` VARCHAR(30) NOT NULL,
  `url` TEXT NOT NULL,
  `category` VARCHAR(60) DEFAULT 'brochure',
  `isApproved` TINYINT DEFAULT 1,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AIProviderSetting` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `apiKey` TEXT,
  `enabled` TINYINT DEFAULT 0,
  `model` VARCHAR(120),
  `monthlyTokenLimit` INT DEFAULT 0,
  `tokenUsage` INT DEFAULT 0,
  `costEstimate` DECIMAL(12,4) DEFAULT 0,
  `status` VARCHAR(40) DEFAULT 'not_configured',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `AIProviderSetting_clinic_provider` (`clinicId`, `provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MetaLeadSetting` (
  `clinicId` VARCHAR(64) PRIMARY KEY,
  `pageId` VARCHAR(120),
  `adAccountId` VARCHAR(120),
  `accessToken` TEXT,
  `webhookVerifyToken` VARCHAR(255),
  `syncEnabled` TINYINT DEFAULT 0,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `MetaLead` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `patientName` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(40),
  `email` VARCHAR(180),
  `source` VARCHAR(120) DEFAULT 'Meta Lead Ads',
  `campaignName` VARCHAR(180),
  `adName` VARCHAR(180),
  `formName` VARCHAR(180),
  `branchId` VARCHAR(64),
  `status` VARCHAR(40) DEFAULT 'new',
  `notes` TEXT,
  `clientId` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `MetaLead_clinic_status` (`clinicId`, `status`),
  INDEX `MetaLead_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ImportJob` (
  `id` VARCHAR(64) PRIMARY KEY,
  `clinicId` VARCHAR(64) NOT NULL,
  `sourceType` VARCHAR(60) NOT NULL,
  `fileName` VARCHAR(255),
  `entityType` VARCHAR(60) DEFAULT 'patients',
  `status` VARCHAR(40) DEFAULT 'draft',
  `totalRows` INT DEFAULT 0,
  `validRows` INT DEFAULT 0,
  `duplicateRows` INT DEFAULT 0,
  `importedRows` INT DEFAULT 0,
  `fieldMapping` TEXT,
  `validationNotes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `ImportJob_clinic_createdAt` (`clinicId`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_column_if_missing(IN target_table VARCHAR(64), IN target_column VARCHAR(64), IN column_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = target_table
      AND COLUMN_NAME = target_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', target_table, '` ADD COLUMN ', column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_column_if_missing('Branch', 'whatsappPhoneNumberId', '`whatsappPhoneNumberId` VARCHAR(120) NULL');
CALL add_column_if_missing('Branch', 'whatsappNumber', '`whatsappNumber` VARCHAR(40) NULL');
CALL add_column_if_missing('Client', 'whatsappMarketingOptIn', '`whatsappMarketingOptIn` TINYINT DEFAULT 0');
CALL add_column_if_missing('Client', 'whatsappConsentAt', '`whatsappConsentAt` DATETIME NULL');
CALL add_column_if_missing('Client', 'whatsappOptOutAt', '`whatsappOptOutAt` DATETIME NULL');
CALL add_column_if_missing('WhatsAppSetting', 'quietHoursStart', '`quietHoursStart` VARCHAR(10) DEFAULT ''21:00''');
CALL add_column_if_missing('WhatsAppSetting', 'quietHoursEnd', '`quietHoursEnd` VARCHAR(10) DEFAULT ''09:00''');
CALL add_column_if_missing('WhatsAppSetting', 'lastWebhookAt', '`lastWebhookAt` DATETIME NULL');
CALL add_column_if_missing('WhatsAppSetting', 'lastWebhookError', '`lastWebhookError` TEXT NULL');
CALL add_column_if_missing('WhatsAppSetting', 'webhookFailureCount', '`webhookFailureCount` INT DEFAULT 0');
CALL add_column_if_missing('WhatsAppConversation', 'preferredLanguage', '`preferredLanguage` VARCHAR(10) DEFAULT ''en''');
CALL add_column_if_missing('WhatsAppConversation', 'internalNote', '`internalNote` TEXT NULL');
CALL add_column_if_missing('WhatsAppConversation', 'freeReplyUntil', '`freeReplyUntil` DATETIME NULL');
DROP PROCEDURE IF EXISTS add_column_if_missing;

DELETE FROM `Notification`;
DELETE FROM `AuditLog`;
DELETE FROM `Feedback`;
DELETE FROM `GalleryItem`;
DELETE FROM `Invoice`;
DELETE FROM `Appointment`;
DELETE FROM `ClientPackage`;
DELETE FROM `PackageItem`;
DELETE FROM `Package`;
DELETE FROM `InventoryTransaction`;
DELETE FROM `InventoryItem`;
DELETE FROM `Campaign`;
DELETE FROM `WhatsAppCampaign`;
DELETE FROM `WhatsAppAutomationLog`;
DELETE FROM `WhatsAppQueue`;
DELETE FROM `WhatsAppMessage`;
DELETE FROM `WhatsAppConversation`;
DELETE FROM `WhatsAppWebhookLog`;
DELETE FROM `WhatsAppMediaLibrary`;
DELETE FROM `MetaLead`;
DELETE FROM `ImportJob`;
DELETE FROM `Client`;
DELETE FROM `Service`;
DELETE FROM `Staff`;
DELETE FROM `Branch`;
DELETE FROM `RefreshToken`;
DELETE FROM `User` WHERE `id` = 'u004' OR `email` IN ('regular@thesmileexpert.com', 'regular@thesmilexperts.com');

INSERT INTO `Clinic` (`id`, `name`, `tagline`, `logo`, `address`, `phone`, `whatsapp`, `email`, `website`, `registrationNo`, `invoicePrefix`, `invoiceFooter`, `paymentTerms`, `mission`, `vision`, `servicesOverview`, `primaryColor`, `secondaryColor`, `font`, `specialties`)
VALUES (
  'clinic-smile-expert-001',
  'The Smile Xperts',
  'Premier Multi-Specialty Dental Clinic & Implant Centre in F-8 Islamabad',
  'TSX',
  'Block 03, Flat No. 01, Street 33, Sector F-8/1, Islamabad.',
  '+92 310-5704555',
  '+92 310-5704555',
  'info@thesmilexperts.com',
  'https://thesmilexperts.com',
  '',
  'TSX',
  'Thank you for trusting The Smile Xperts. We always take care of your smile.',
  'Payment is due at the time of treatment unless a written plan is approved by clinic administration.',
  'To deliver advanced dental care with precision, comfort, transparent communication, and long-lasting results.',
  'To be Islamabad''s trusted multi-specialty dental clinic for expert-led family dentistry, orthodontics, implants, and smile aesthetics.',
  'Endodontics, orthodontics, prosthodontics, dental implants, general and aesthetic dentistry, preventive care, and oral surgery under one roof.',
  '#0f766e',
  '#134e4a',
  'Inter',
  'dental'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `tagline` = VALUES(`tagline`),
  `logo` = VALUES(`logo`),
  `address` = VALUES(`address`),
  `phone` = VALUES(`phone`),
  `whatsapp` = VALUES(`whatsapp`),
  `email` = VALUES(`email`),
  `website` = VALUES(`website`),
  `registrationNo` = VALUES(`registrationNo`),
  `invoicePrefix` = VALUES(`invoicePrefix`),
  `invoiceFooter` = VALUES(`invoiceFooter`),
  `paymentTerms` = VALUES(`paymentTerms`),
  `mission` = VALUES(`mission`),
  `vision` = VALUES(`vision`),
  `servicesOverview` = VALUES(`servicesOverview`),
  `primaryColor` = VALUES(`primaryColor`),
  `secondaryColor` = VALUES(`secondaryColor`),
  `font` = VALUES(`font`),
  `specialties` = VALUES(`specialties`);

INSERT INTO `Branch` (`id`, `clinicId`, `name`, `address`, `phone`, `isActive`, `whatsappNumber`)
VALUES ('branch-smile-xperts-f8', 'clinic-smile-expert-001', 'The Smile Xperts F-8 Islamabad', 'Block 03, Flat No. 01, Street 33, Sector F-8/1, Islamabad.', '+92 310-5704555', 1, '+92 310-5704555');

INSERT INTO `Staff` (`id`, `clinicId`, `branchId`, `name`, `role`, `designation`, `specialty`, `phone`, `email`, `avatar`, `avatarColor`, `qualifications`, `experience`, `bio`, `workingDays`, `workingHours`, `status`, `rating`, `compensationType`, `fixedSalary`, `commissionRate`, `treatmentCommissionRates`, `portalRole`, `loginEmail`, `inviteStatus`)
VALUES
('doc-mushtaq-ahmed', 'clinic-smile-expert-001', 'branch-smile-xperts-f8', 'Dr. Mushtaq Ahmed', 'Principal Dental Surgeon', 'Principal Dental Surgeon (Retd)', 'dental', '+92 310-5704555', 'info@thesmilexperts.com', 'MA', '#0f766e', 'BDS, RDS', 'Senior consultant', 'Principal Dental Surgeon (Retd) B.B.H. Rawalpindi and Chief Dental Surgeon (Retd) Services Hospital, Lahore.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-21:00', 'active', 5.00, 'commission', 0, 0, '{}', 'doctor', 'mushtaq@thesmilexperts.com', 'ready'),
('doc-osama-mushtaq', 'clinic-smile-expert-001', 'branch-smile-xperts-f8', 'Dr. Osama Mushtaq', 'Oral and Maxillofacial Surgeon', 'Consultant Oral and Maxillofacial Surgeon', 'dental', '+92 310-5704555', 'info@thesmilexperts.com', 'OM', '#2563eb', 'BDS, FCPS, CHPE, PGD', 'Consultant', 'Assistant Professor IIDH and Consultant Oral and Maxillofacial Surgeon.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-21:00', 'active', 5.00, 'commission', 0, 0, '{}', 'doctor', 'osama@thesmilexperts.com', 'ready'),
('doc-huda-ali-khan', 'clinic-smile-expert-001', 'branch-smile-xperts-f8', 'Dr. Huda Ali Khan', 'General Dentist', 'General Dentist', 'dental', '+92 310-5704555', 'info@thesmilexperts.com', 'HK', '#be3455', 'BDS, RDS', 'General dentistry', 'General dentist focused on comfortable, clear, and preventive patient care.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-21:00', 'active', 5.00, 'commission', 0, 0, '{}', 'doctor', 'huda@thesmilexperts.com', 'ready'),
('doc-maryam-mushtaq', 'clinic-smile-expert-001', 'branch-smile-xperts-f8', 'Dr. Maryam Mushtaq', 'Orthodontist', 'Consultant Orthodontist', 'dental', '+92 310-5704555', 'info@thesmilexperts.com', 'MM', '#7c3aed', 'BDS, FCPS, MHPE', 'Consultant', 'Consultant orthodontist for braces, aligners, retainers, and smile alignment planning.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-21:00', 'active', 5.00, 'commission', 0, 0, '{}', 'doctor', 'maryam@thesmilexperts.com', 'ready'),
('doc-talha-mushtaq', 'clinic-smile-expert-001', 'branch-smile-xperts-f8', 'Dr. Talha Mushtaq', 'Endodontist', 'Consultant Endodontist', 'dental', '+92 310-5704555', 'info@thesmilexperts.com', 'TM', '#f59e0b', 'BDS, MDS', 'Consultant', 'Consultant endodontist for root canal treatment, dental pain management, and tooth preservation.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-21:00', 'active', 5.00, 'commission', 0, 0, '{}', 'doctor', 'talha@thesmilexperts.com', 'ready');

INSERT INTO `User` (`id`, `clinicId`, `name`, `email`, `password`, `role`, `ledgerMode`, `staffId`, `isActive`, `twoFAEnabled`)
VALUES
('u001', 'clinic-smile-expert-001', 'Owner', 'owner@thesmilexperts.com', '$2a$12$8yjoCY6.jkDF0GXsQa84ROL9sgOW69v.7IMJiQqNOqUZZt6yRNLXe', 'owner', 'actual', 'doc-mushtaq-ahmed', 1, 0),
('u002', 'clinic-smile-expert-001', 'Reception Desk', 'reception@thesmilexperts.com', '$2a$12$Jtzc5HWi7dSkaKDXFQ1M6.pWr29l6v4b5v8PiANXq0QCtvffBCo.m', 'receptionist', 'actual', NULL, 1, 0),
('u003', 'clinic-smile-expert-001', 'Dental Staff', 'staff@thesmilexperts.com', '$2a$12$aLbWDWiD8s67K3pvJQURXecXEM5JyID0inGBROtVRxZ2j6fhDge5S', 'staff', 'actual', 'doc-osama-mushtaq', 1, 0)
ON DUPLICATE KEY UPDATE
  `clinicId` = VALUES(`clinicId`),
  `name` = VALUES(`name`),
  `email` = VALUES(`email`),
  `password` = VALUES(`password`),
  `role` = VALUES(`role`),
  `ledgerMode` = VALUES(`ledgerMode`),
  `staffId` = VALUES(`staffId`),
  `isActive` = VALUES(`isActive`),
  `twoFAEnabled` = VALUES(`twoFAEnabled`);

INSERT INTO `Service` (`id`, `clinicId`, `name`, `specialty`, `category`, `price`, `duration`, `description`, `popular`, `isActive`)
VALUES
('svc-endodontics', 'clinic-smile-expert-001', 'Endodontics', 'dental', 'Endodontics', 0, 45, 'Root canal and tooth-saving treatment by endodontic specialists.', 1, 1),
('svc-root-canal', 'clinic-smile-expert-001', 'Root Canal Treatment', 'dental', 'Endodontics', 0, 60, 'Pain-managed root canal care with clear aftercare guidance.', 1, 1),
('svc-orthodontics', 'clinic-smile-expert-001', 'Orthodontics (Braces / Aligners)', 'dental', 'Orthodontics', 0, 45, 'Braces, aligners, retainers, and smile alignment planning.', 1, 1),
('svc-prosthodontics', 'clinic-smile-expert-001', 'Prosthodontics', 'dental', 'Prosthodontics', 0, 45, 'Crowns, bridges, dentures, and restorative treatment planning.', 1, 1),
('svc-implants-surgery', 'clinic-smile-expert-001', 'Dental Implants & Oral Surgery', 'dental', 'Oral Surgery', 0, 60, 'Dental implants, oral surgery consultation, and surgical treatment planning.', 1, 1),
('svc-general-aesthetic', 'clinic-smile-expert-001', 'General & Aesthetic Dentistry', 'dental', 'General Dentistry', 0, 30, 'Routine dental care, aesthetic smile improvement, fillings, and consultations.', 1, 1),
('svc-preventive-care', 'clinic-smile-expert-001', 'Preventive Care', 'dental', 'Preventive Care', 0, 30, 'Checkups, scaling, polishing, hygiene guidance, and preventive dental care.', 1, 1),
('svc-routine-checkup', 'clinic-smile-expert-001', 'Routine Checkup', 'dental', 'Consultation', 0, 30, 'General oral health assessment for new and returning patients.', 0, 1),
('svc-new-patient-visit', 'clinic-smile-expert-001', 'New Patient Visit', 'dental', 'Consultation', 0, 30, 'First visit consultation with treatment discussion and appointment planning.', 0, 1),
('svc-specific-concern', 'clinic-smile-expert-001', 'Specific Concern Consultation', 'dental', 'Consultation', 0, 30, 'Focused consultation for pain, swelling, broken tooth, braces, implant, or cosmetic concerns.', 0, 1);

INSERT INTO `PublicSiteConfig` (`clinicId`, `configJson`, `updatedAt`)
VALUES ('clinic-smile-expert-001', '{"announcement":"Need help? +92 310-5704555","eyebrow":"Expert care for the smile you deserve","heroTitle":"A Higher Standard of Oral Care.","heroSubtitle":"Visit Islamabad''s premier Multi-Specialty Dental Clinic and Implant Centre in F-8. Expert care, conveniently located in the heart of F-8.","heroImage":"https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1400&q=85","aboutTitle":"Why Islamabad trusts The Smile Xperts","aboutText":"At The Smile Xperts, we combine advanced dental technology with personalized care to deliver exceptional results. Our experienced team focuses on precision, comfort, and long-term oral health.","hours":"Mon - Sat: 11:00 AM - 9:00 PM","bookingNote":"Fill out the form and our front desk team will contact you to confirm your slot.","googleMapsUrl":"https://maps.google.com/?q=Block%2003%20Flat%20No.%2001%20Street%2033%20Sector%20F-8%2F1%20Islamabad","googleBusinessUrl":"","seoTitle":"The Smile Xperts | Multi-Specialty Dental Clinic in F-8 Islamabad","seoDescription":"Book dental implants, orthodontics, root canal, prosthodontics, preventive care, and general aesthetic dentistry at The Smile Xperts Islamabad.","ogImage":"","socials":{"facebook":"","instagram":"","tiktok":"","youtube":""},"nav":[{"label":"Home","href":"#home"},{"label":"Services","href":"#services"},{"label":"Doctors","href":"#doctors"},{"label":"FAQs","href":"#faq"},{"label":"Appointment","href":"#book"},{"label":"Contact Us","href":"#map"}],"sections":{"offers":false,"services":true,"doctors":true,"gallery":true,"testimonials":true,"about":true,"faq":true,"map":true,"booking":true},"sectionOrder":["services","doctors","gallery","testimonials","about","faq","map","booking"],"offers":[],"faqs":[{"question":"What are your sterilization protocols?","answer":"Your safety is our priority. We strictly follow hospital-grade sterilization, autoclave cycles, and disposable barriers for every patient."},{"question":"How much do dental implants cost in Islamabad?","answer":"Dental implant cost depends on implant type, materials, bone condition, and individual treatment needs. Please book a consultation for an accurate estimate."},{"question":"Is the procedure painful?","answer":"Most procedures are performed with local anesthesia and careful comfort planning. The team explains every step before treatment."},{"question":"How long do implants last?","answer":"With good planning, hygiene, and follow-up care, implants can last many years. Your doctor will guide maintenance after treatment."}]}', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE `configJson` = VALUES(`configJson`), `updatedAt` = CURRENT_TIMESTAMP;

INSERT INTO `AIProviderSetting` (`id`, `clinicId`, `provider`, `model`, `enabled`, `status`)
VALUES
('ai-chatgpt-default', 'clinic-smile-expert-001', 'chatgpt', 'gpt-4o-mini', 0, 'not_configured'),
('ai-gemini-default', 'clinic-smile-expert-001', 'gemini', 'gemini-1.5-flash', 0, 'not_configured'),
('ai-claude-default', 'clinic-smile-expert-001', 'claude', 'claude-3-5-sonnet', 0, 'not_configured')
ON DUPLICATE KEY UPDATE `model` = VALUES(`model`), `enabled` = VALUES(`enabled`), `status` = VALUES(`status`);

INSERT INTO `WhatsAppSetting` (`clinicId`, `simulationMode`, `currency`, `quietHoursStart`, `quietHoursEnd`)
VALUES ('clinic-smile-expert-001', 1, 'PKR', '21:00', '09:00')
ON DUPLICATE KEY UPDATE `currency` = VALUES(`currency`), `quietHoursStart` = VALUES(`quietHoursStart`), `quietHoursEnd` = VALUES(`quietHoursEnd`);

SET FOREIGN_KEY_CHECKS = 1;
