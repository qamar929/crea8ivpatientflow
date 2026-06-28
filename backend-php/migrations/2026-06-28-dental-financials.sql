-- Dental financials and treatment timeline: additive, zero-downtime migration.
-- No existing invoices, patients, appointments, or financial records are modified.

CREATE TABLE IF NOT EXISTS `ExpenseCategory` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `type` VARCHAR(40) NOT NULL DEFAULT 'general',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ExpenseCategory_Clinic_Name` (`clinicId`, `name`),
  KEY `IX_ExpenseCategory_Clinic_Active` (`clinicId`, `isActive`),
  CONSTRAINT `FK_ExpenseCategory_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Expense` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `branchId` VARCHAR(36) DEFAULT NULL,
  `categoryId` VARCHAR(36) DEFAULT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DOUBLE NOT NULL DEFAULT 0,
  `expenseDate` DATE NOT NULL,
  `paymentMethod` VARCHAR(100) DEFAULT NULL,
  `receiptUrl` TEXT DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `archivedAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_Expense_Clinic_Date` (`clinicId`, `expenseDate`),
  KEY `IX_Expense_Clinic_Category` (`clinicId`, `categoryId`, `expenseDate`),
  KEY `IX_Expense_Clinic_Branch` (`clinicId`, `branchId`, `expenseDate`),
  CONSTRAINT `FK_Expense_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Expense_Branch` FOREIGN KEY (`branchId`) REFERENCES `Branch` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Expense_Category` FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Expense_User` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InvoiceProcedureCost` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `invoiceId` VARCHAR(36) NOT NULL,
  `invoiceItemIndex` INT NOT NULL DEFAULT 0,
  `appointmentId` VARCHAR(36) DEFAULT NULL,
  `clientId` VARCHAR(36) NOT NULL,
  `serviceId` VARCHAR(36) DEFAULT NULL,
  `patientCharge` DOUBLE NOT NULL DEFAULT 0,
  `procedureCost` DOUBLE NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `updatedBy` VARCHAR(36) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ProcedureCost_Invoice_Item` (`clinicId`, `invoiceId`, `invoiceItemIndex`),
  KEY `IX_ProcedureCost_Clinic_Service` (`clinicId`, `serviceId`),
  KEY `IX_ProcedureCost_Clinic_Client` (`clinicId`, `clientId`),
  CONSTRAINT `FK_ProcedureCost_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ProcedureCost_Invoice` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ProcedureCost_Appointment` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ProcedureCost_Client` FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ProcedureCost_Service` FOREIGN KEY (`serviceId`) REFERENCES `Service` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ProcedureCost_CreatedBy` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ProcedureCost_UpdatedBy` FOREIGN KEY (`updatedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TreatmentProcedureDetail` (
  `id` VARCHAR(36) NOT NULL,
  `clinicId` VARCHAR(36) NOT NULL,
  `clientId` VARCHAR(36) NOT NULL,
  `appointmentId` VARCHAR(36) DEFAULT NULL,
  `invoiceId` VARCHAR(36) DEFAULT NULL,
  `serviceId` VARCHAR(36) DEFAULT NULL,
  `staffId` VARCHAR(36) DEFAULT NULL,
  `procedureType` VARCHAR(120) NOT NULL,
  `toothNumber` VARCHAR(40) DEFAULT NULL,
  `jaw` VARCHAR(20) DEFAULT NULL,
  `side` VARCHAR(20) DEFAULT NULL,
  `canalType` VARCHAR(80) DEFAULT NULL,
  `extractionType` VARCHAR(80) DEFAULT NULL,
  `crownMaterial` VARCHAR(120) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `followUpDate` DATE DEFAULT NULL,
  `performedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdBy` VARCHAR(36) DEFAULT NULL,
  `archivedAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IX_TreatmentDetail_Clinic_Client_Date` (`clinicId`, `clientId`, `performedAt`),
  KEY `IX_TreatmentDetail_Clinic_Staff_Date` (`clinicId`, `staffId`, `performedAt`),
  CONSTRAINT `FK_TreatmentDetail_Clinic` FOREIGN KEY (`clinicId`) REFERENCES `Clinic` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_TreatmentDetail_Client` FOREIGN KEY (`clientId`) REFERENCES `Client` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_TreatmentDetail_Appointment` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_TreatmentDetail_Invoice` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_TreatmentDetail_Service` FOREIGN KEY (`serviceId`) REFERENCES `Service` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_TreatmentDetail_Staff` FOREIGN KEY (`staffId`) REFERENCES `Staff` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_TreatmentDetail_User` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @service_default_cost_missing = (
  SELECT COUNT(*) = 0
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Service'
    AND COLUMN_NAME = 'defaultProcedureCost'
);

SET @service_default_cost_sql = IF(
  @service_default_cost_missing,
  'ALTER TABLE `Service` ADD COLUMN `defaultProcedureCost` DOUBLE DEFAULT NULL',
  'SELECT 1'
);

PREPARE service_default_cost_stmt FROM @service_default_cost_sql;
EXECUTE service_default_cost_stmt;
DEALLOCATE PREPARE service_default_cost_stmt;
