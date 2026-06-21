CREATE TABLE IF NOT EXISTS ClinicFeatureSetting (
  clinicId TEXT PRIMARY KEY,
  whatsappEnabled INTEGER DEFAULT 0,
  whatsappMarketingEnabled INTEGER DEFAULT 0,
  whatsappAutomationEnabled INTEGER DEFAULT 0,
  aiEnabled INTEGER DEFAULT 0,
  aiAutoReplyEnabled INTEGER DEFAULT 0,
  aiHumanApprovalRequired INTEGER DEFAULT 1,
  monthlyAiTokenLimit INTEGER DEFAULT 0,
  monthlyWhatsAppLimit INTEGER DEFAULT 0,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
