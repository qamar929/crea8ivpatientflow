ALTER TABLE WhatsAppSetting ADD COLUMN quietHoursStart VARCHAR(10) DEFAULT '21:00', ADD COLUMN quietHoursEnd VARCHAR(10) DEFAULT '09:00', ADD COLUMN lastWebhookAt DATETIME, ADD COLUMN lastWebhookError TEXT, ADD COLUMN webhookFailureCount INT DEFAULT 0;
ALTER TABLE WhatsAppConversation ADD COLUMN preferredLanguage VARCHAR(10) DEFAULT 'en', ADD COLUMN internalNote TEXT, ADD COLUMN freeReplyUntil DATETIME;
ALTER TABLE Client ADD COLUMN whatsappMarketingOptIn TINYINT DEFAULT 0, ADD COLUMN whatsappConsentAt DATETIME, ADD COLUMN whatsappOptOutAt DATETIME;
ALTER TABLE Branch ADD COLUMN whatsappPhoneNumberId VARCHAR(120), ADD COLUMN whatsappNumber VARCHAR(40);
CREATE TABLE IF NOT EXISTS WhatsAppQueue (id VARCHAR(64) PRIMARY KEY, clinicId VARCHAR(64) NOT NULL, clientId VARCHAR(64), conversationId VARCHAR(64), phone VARCHAR(40) NOT NULL, payloadJson TEXT NOT NULL, purpose VARCHAR(30) DEFAULT 'support', status VARCHAR(30) DEFAULT 'pending', attempts INT DEFAULT 0, lastError TEXT, nextRetryAt DATETIME, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS WhatsAppWebhookLog (id VARCHAR(64) PRIMARY KEY, clinicId VARCHAR(64), eventType VARCHAR(60) NOT NULL, status VARCHAR(30) DEFAULT 'received', details TEXT, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS WhatsAppMediaLibrary (id VARCHAR(64) PRIMARY KEY, clinicId VARCHAR(64) NOT NULL, name VARCHAR(180) NOT NULL, mediaType VARCHAR(30) NOT NULL, url TEXT NOT NULL, category VARCHAR(60) DEFAULT 'brochure', isApproved TINYINT DEFAULT 1, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT IGNORE INTO WhatsAppMediaLibrary(id,clinicId,name,mediaType,url,category) VALUES
('wam-001','clinic-smile-expert-001','Dental Aftercare Guide','document','https://example.com/dental-aftercare.pdf','aftercare'),
('wam-002','clinic-smile-expert-001','Smile Makeover Brochure','document','https://example.com/smile-makeover.pdf','brochure'),
('wam-003','clinic-smile-expert-001','Skin Treatment Offers','image','https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900','offer');
