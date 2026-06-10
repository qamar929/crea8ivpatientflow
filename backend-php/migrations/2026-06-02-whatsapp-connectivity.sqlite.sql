ALTER TABLE WhatsAppSetting ADD COLUMN quietHoursStart TEXT DEFAULT '21:00';
ALTER TABLE WhatsAppSetting ADD COLUMN quietHoursEnd TEXT DEFAULT '09:00';
ALTER TABLE WhatsAppSetting ADD COLUMN lastWebhookAt TEXT;
ALTER TABLE WhatsAppSetting ADD COLUMN lastWebhookError TEXT;
ALTER TABLE WhatsAppSetting ADD COLUMN webhookFailureCount INTEGER DEFAULT 0;
ALTER TABLE WhatsAppConversation ADD COLUMN preferredLanguage TEXT DEFAULT 'en';
ALTER TABLE WhatsAppConversation ADD COLUMN internalNote TEXT;
ALTER TABLE WhatsAppConversation ADD COLUMN freeReplyUntil TEXT;
ALTER TABLE Client ADD COLUMN whatsappMarketingOptIn INTEGER DEFAULT 0;
ALTER TABLE Client ADD COLUMN whatsappConsentAt TEXT;
ALTER TABLE Client ADD COLUMN whatsappOptOutAt TEXT;
ALTER TABLE Branch ADD COLUMN whatsappPhoneNumberId TEXT;
ALTER TABLE Branch ADD COLUMN whatsappNumber TEXT;
CREATE TABLE IF NOT EXISTS WhatsAppQueue (id TEXT PRIMARY KEY, clinicId TEXT NOT NULL, clientId TEXT, conversationId TEXT, phone TEXT NOT NULL, payloadJson TEXT NOT NULL, purpose TEXT DEFAULT 'support', status TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0, lastError TEXT, nextRetryAt TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS WhatsAppWebhookLog (id TEXT PRIMARY KEY, clinicId TEXT, eventType TEXT NOT NULL, status TEXT DEFAULT 'received', details TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS WhatsAppMediaLibrary (id TEXT PRIMARY KEY, clinicId TEXT NOT NULL, name TEXT NOT NULL, mediaType TEXT NOT NULL, url TEXT NOT NULL, category TEXT DEFAULT 'brochure', isApproved INTEGER DEFAULT 1, createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO WhatsAppMediaLibrary(id,clinicId,name,mediaType,url,category) VALUES
('wam-001','clinic-smile-expert-001','Dental Aftercare Guide','document','https://example.com/dental-aftercare.pdf','aftercare'),
('wam-002','clinic-smile-expert-001','Smile Makeover Brochure','document','https://example.com/smile-makeover.pdf','brochure'),
('wam-003','clinic-smile-expert-001','Skin Treatment Offers','image','https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900','offer');
