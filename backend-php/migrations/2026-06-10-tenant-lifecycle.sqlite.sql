-- Crea8iv PatientFlow: tenant lifecycle, subscriptions, leads, support (SQLite)

ALTER TABLE Clinic ADD COLUMN slug TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN customDomain TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE Clinic ADD COLUMN clinicType TEXT NOT NULL DEFAULT 'dental';
ALTER TABLE Clinic ADD COLUMN trialEndsAt TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN suspendedAt TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN suspensionReason TEXT DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS UX_Clinic_Slug ON Clinic(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS UX_Clinic_CustomDomain ON Clinic(customDomain) WHERE customDomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS RegistrationLead (
  id TEXT NOT NULL PRIMARY KEY,
  clinicName TEXT NOT NULL,
  contactName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT DEFAULT NULL,
  city TEXT DEFAULT NULL,
  clinicType TEXT DEFAULT 'dental',
  branches INTEGER NOT NULL DEFAULT 1,
  message TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT DEFAULT NULL,
  clinicId TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS IX_RegistrationLead_Status ON RegistrationLead(status, createdAt);

CREATE TABLE IF NOT EXISTS Subscription (
  id TEXT NOT NULL PRIMARY KEY,
  clinicId TEXT NOT NULL,
  billingCycle TEXT NOT NULL,
  amountPKR REAL NOT NULL,
  startsAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_Subscription_Clinic ON Subscription(clinicId, expiresAt);

CREATE TABLE IF NOT EXISTS Payment (
  id TEXT NOT NULL PRIMARY KEY,
  clinicId TEXT NOT NULL,
  subscriptionId TEXT DEFAULT NULL,
  amountPKR REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  screenshotPath TEXT DEFAULT NULL,
  reference TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  verifiedBy TEXT DEFAULT NULL,
  verifiedAt TEXT DEFAULT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_Payment_Clinic ON Payment(clinicId, createdAt);
CREATE INDEX IF NOT EXISTS IX_Payment_Status ON Payment(status, createdAt);

CREATE TABLE IF NOT EXISTS SupportTicket (
  id TEXT NOT NULL PRIMARY KEY,
  clinicId TEXT NOT NULL,
  openedBy TEXT NOT NULL,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clinicId) REFERENCES Clinic(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_SupportTicket_Clinic ON SupportTicket(clinicId, status);

CREATE TABLE IF NOT EXISTS SupportMessage (
  id TEXT NOT NULL PRIMARY KEY,
  ticketId TEXT NOT NULL,
  senderType TEXT NOT NULL,
  senderId TEXT DEFAULT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticketId) REFERENCES SupportTicket(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS IX_SupportMessage_Ticket ON SupportMessage(ticketId, createdAt);
