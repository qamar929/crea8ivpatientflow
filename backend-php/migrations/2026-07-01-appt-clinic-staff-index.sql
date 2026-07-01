-- Forward-looking index for per-staff appointment/revenue stats
-- (StaffController::list + getPerformance filter Appointment by clinicId + staffId).
-- Lets the COUNT/SUM seek directly instead of scanning, so staff stats stay fast
-- as a clinic grows to thousands of appointments.
--
-- Idempotent: guard against re-running (CREATE INDEX has no IF NOT EXISTS in MySQL 8).
SET @exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Appointment'
    AND INDEX_NAME = 'IX_Appt_Clinic_Staff'
);
SET @sql := IF(@exists = 0,
  'CREATE INDEX IX_Appt_Clinic_Staff ON Appointment (clinicId, staffId)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
