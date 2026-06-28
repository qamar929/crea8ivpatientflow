-- Dental financials and treatment timeline: additive, zero-downtime migration.
-- No existing invoices, patients, appointments, or financial records are modified.

CREATE TABLE IF NOT EXISTS ExpenseCategory (
  id TEXT PRIMARY KEY,
  clinicId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clinicId, name),
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS IX_ExpenseCategory_Clinic_Active ON ExpenseCategory (clinicId, isActive);

CREATE TABLE IF NOT EXISTS Expense (
  id TEXT PRIMARY KEY,
  clinicId TEXT NOT NULL,
  branchId TEXT DEFAULT NULL,
  categoryId TEXT DEFAULT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  expenseDate TEXT NOT NULL,
  paymentMethod TEXT DEFAULT NULL,
  receiptUrl TEXT DEFAULT NULL,
  createdBy TEXT DEFAULT NULL,
  archivedAt TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE,
  FOREIGN KEY (branchId) REFERENCES Branch(id) ON DELETE SET NULL,
  FOREIGN KEY (categoryId) REFERENCES ExpenseCategory(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS IX_Expense_Clinic_Date ON Expense (clinicId, expenseDate);
CREATE INDEX IF NOT EXISTS IX_Expense_Clinic_Category ON Expense (clinicId, categoryId, expenseDate);
CREATE INDEX IF NOT EXISTS IX_Expense_Clinic_Branch ON Expense (clinicId, branchId, expenseDate);

CREATE TABLE IF NOT EXISTS InvoiceProcedureCost (
  id TEXT PRIMARY KEY,
  clinicId TEXT NOT NULL,
  invoiceId TEXT NOT NULL,
  invoiceItemIndex INTEGER NOT NULL DEFAULT 0,
  appointmentId TEXT DEFAULT NULL,
  clientId TEXT NOT NULL,
  serviceId TEXT DEFAULT NULL,
  patientCharge REAL NOT NULL DEFAULT 0,
  procedureCost REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  createdBy TEXT DEFAULT NULL,
  updatedBy TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (clinicId, invoiceId, invoiceItemIndex),
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE,
  FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE,
  FOREIGN KEY (appointmentId) REFERENCES Appointment(id) ON DELETE SET NULL,
  FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id) ON DELETE SET NULL,
  FOREIGN KEY (updatedBy) REFERENCES User(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS IX_ProcedureCost_Clinic_Service ON InvoiceProcedureCost (clinicId, serviceId);
CREATE INDEX IF NOT EXISTS IX_ProcedureCost_Clinic_Client ON InvoiceProcedureCost (clinicId, clientId);

CREATE TABLE IF NOT EXISTS TreatmentProcedureDetail (
  id TEXT PRIMARY KEY,
  clinicId TEXT NOT NULL,
  clientId TEXT NOT NULL,
  appointmentId TEXT DEFAULT NULL,
  invoiceId TEXT DEFAULT NULL,
  serviceId TEXT DEFAULT NULL,
  staffId TEXT DEFAULT NULL,
  procedureType TEXT NOT NULL,
  toothNumber TEXT DEFAULT NULL,
  jaw TEXT DEFAULT NULL,
  side TEXT DEFAULT NULL,
  canalType TEXT DEFAULT NULL,
  extractionType TEXT DEFAULT NULL,
  crownMaterial TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  followUpDate TEXT DEFAULT NULL,
  performedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdBy TEXT DEFAULT NULL,
  archivedAt TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE,
  FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE CASCADE,
  FOREIGN KEY (appointmentId) REFERENCES Appointment(id) ON DELETE SET NULL,
  FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE SET NULL,
  FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE SET NULL,
  FOREIGN KEY (staffId) REFERENCES Staff(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS IX_TreatmentDetail_Clinic_Client_Date ON TreatmentProcedureDetail (clinicId, clientId, performedAt);
CREATE INDEX IF NOT EXISTS IX_TreatmentDetail_Clinic_Staff_Date ON TreatmentProcedureDetail (clinicId, staffId, performedAt);

ALTER TABLE Service ADD COLUMN defaultProcedureCost REAL DEFAULT NULL;
