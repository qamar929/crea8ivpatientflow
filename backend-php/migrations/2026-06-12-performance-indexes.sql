ALTER TABLE `Client` ADD INDEX `IX_Client_Clinic_Status_Created` (`clinicId`, `status`, `createdAt`);
ALTER TABLE `Client` ADD INDEX `IX_Client_Clinic_Name` (`clinicId`, `name`);

ALTER TABLE `Appointment` ADD INDEX `IX_Appt_Clinic_Date_Status_Staff` (`clinicId`, `date`, `status`, `staffId`);
ALTER TABLE `Appointment` ADD INDEX `IX_Appt_Clinic_Client_Date` (`clinicId`, `clientId`, `date`);

ALTER TABLE `Invoice` ADD INDEX `IX_Invoice_Clinic_Created` (`clinicId`, `createdAt`);
ALTER TABLE `Invoice` ADD INDEX `IX_Invoice_Clinic_Client_Created` (`clinicId`, `clientId`, `createdAt`);
ALTER TABLE `Invoice` ADD INDEX `IX_Invoice_Clinic_Status_Due` (`clinicId`, `status`, `dueDate`);

ALTER TABLE `InventoryItem` ADD INDEX `IX_Inventory_Clinic_Active_Qty` (`clinicId`, `isActive`, `quantity`);
