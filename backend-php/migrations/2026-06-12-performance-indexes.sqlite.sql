CREATE INDEX IF NOT EXISTS IX_Client_Clinic_Status_Created ON Client(clinicId, status, createdAt);
CREATE INDEX IF NOT EXISTS IX_Client_Clinic_Name ON Client(clinicId, name);

CREATE INDEX IF NOT EXISTS IX_Appt_Clinic_Date_Status_Staff ON Appointment(clinicId, date, status, staffId);
CREATE INDEX IF NOT EXISTS IX_Appt_Clinic_Client_Date ON Appointment(clinicId, clientId, date);

CREATE INDEX IF NOT EXISTS IX_Invoice_Clinic_Created ON Invoice(clinicId, createdAt);
CREATE INDEX IF NOT EXISTS IX_Invoice_Clinic_Client_Created ON Invoice(clinicId, clientId, createdAt);
CREATE INDEX IF NOT EXISTS IX_Invoice_Clinic_Status_Due ON Invoice(clinicId, status, dueDate);

CREATE INDEX IF NOT EXISTS IX_Inventory_Clinic_Active_Qty ON InventoryItem(clinicId, isActive, quantity);
