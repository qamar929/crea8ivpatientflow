-- Additive soft-archive columns for patient-facing records.
-- Existing rows remain active because archivedAt defaults to NULL.

ALTER TABLE `GalleryItem`
  ADD COLUMN `archivedAt` DATETIME NULL DEFAULT NULL;

ALTER TABLE `Feedback`
  ADD COLUMN `archivedAt` DATETIME NULL DEFAULT NULL;

ALTER TABLE `ConversationMemory`
  ADD COLUMN `archivedAt` TIMESTAMP NULL DEFAULT NULL;
