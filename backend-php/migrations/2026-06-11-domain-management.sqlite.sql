-- Self-service custom domain management: status, ownership token, SSL (SQLite)
ALTER TABLE Clinic ADD COLUMN domainStatus TEXT NOT NULL DEFAULT 'none';
ALTER TABLE Clinic ADD COLUMN domainToken TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN domainVerifiedAt TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN domainLastError TEXT DEFAULT NULL;
ALTER TABLE Clinic ADD COLUMN sslStatus TEXT NOT NULL DEFAULT 'none';

UPDATE Clinic SET domainStatus = 'connected', sslStatus = 'active'
  WHERE customDomain IS NOT NULL AND customDomain != '';
