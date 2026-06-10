UPDATE `Clinic` SET `specialties` = 'general,aesthetics,dental' WHERE `id` = 'clinic-smile-expert-001';

INSERT IGNORE INTO `Branch` (`id`, `clinicId`, `name`, `address`, `phone`, `isActive`) VALUES
('branch-smile-expert-isb', 'clinic-smile-expert-001', 'Islamabad Aesthetics & General Clinic', 'F-7 Markaz, Islamabad, Pakistan', '+92 51 111 764 533', 1);

INSERT IGNORE INTO `Staff` (`id`, `clinicId`, `branchId`, `name`, `role`, `designation`, `specialty`, `phone`, `email`, `avatar`, `avatarColor`, `qualifications`, `experience`, `bio`, `workingDays`, `workingHours`, `status`, `rating`) VALUES
('s101', 'clinic-smile-expert-001', 'branch-smile-expert-main', 'Dr. Zara Ahmed', 'General Physician', 'Family Medicine Consultant', 'general', '+92 300 5551001', 'zara@thesmileexpert.com', 'ZA', '#0f766e', 'MBBS, FCPS Family Medicine', '10 years', 'General physician focused on preventive care, family medicine, and clear treatment plans.', 'Mon,Tue,Wed,Thu,Fri,Sat', '10:00-18:00', 'active', 4.90),
('s102', 'clinic-smile-expert-001', 'branch-smile-expert-isb', 'Dr. Mahnoor Ali', 'Aesthetic Physician', 'Skin & Laser Specialist', 'aesthetics', '+92 300 5551002', 'mahnoor@thesmileexpert.com', 'MA', '#be3455', 'MBBS, Diploma Dermatology, Aesthetic Medicine Certification', '8 years', 'Aesthetic physician offering evidence-led skin, laser, and rejuvenation treatments.', 'Mon,Tue,Wed,Thu,Fri,Sat', '11:00-19:00', 'active', 4.90),
('s103', 'clinic-smile-expert-001', 'branch-smile-expert-main', 'Dr. Hira Salman', 'Dermatologist', 'Consultant Dermatologist', 'aesthetics', '+92 300 5551003', 'hira@thesmileexpert.com', 'HS', '#7c3aed', 'MBBS, FCPS Dermatology', '12 years', 'Consultant dermatologist for acne, pigmentation, hair loss, and medical skin concerns.', 'Mon,Wed,Fri,Sat', '12:00-18:00', 'active', 4.80);

INSERT IGNORE INTO `Service` (`id`, `clinicId`, `name`, `specialty`, `category`, `price`, `duration`, `description`, `popular`, `isActive`) VALUES
('srv-g001', 'clinic-smile-expert-001', 'General Physician Consultation', 'general', 'General Clinic', 2500, 30, 'Family medicine consultation for common health concerns and preventive care.', 1, 1),
('srv-g002', 'clinic-smile-expert-001', 'Diabetes & Blood Pressure Review', 'general', 'General Clinic', 3000, 35, 'Routine monitoring consultation with lifestyle and medication review.', 1, 1),
('srv-g003', 'clinic-smile-expert-001', 'Women Wellness Consultation', 'general', 'General Clinic', 3500, 40, 'Private wellness consultation and referral guidance where needed.', 0, 1),
('srv-g004', 'clinic-smile-expert-001', 'Seasonal Flu & Allergy Consultation', 'general', 'General Clinic', 2200, 25, 'Assessment for seasonal flu, allergies, and respiratory symptoms.', 0, 1),
('srv-a001', 'clinic-smile-expert-001', 'Skin Consultation', 'aesthetics', 'Skin Aesthetics', 3000, 30, 'Personalized skin assessment and treatment roadmap.', 1, 1),
('srv-a002', 'clinic-smile-expert-001', 'HydraFacial Glow Treatment', 'aesthetics', 'Skin Aesthetics', 11000, 60, 'Deep cleansing, hydration, and glow support for refreshed skin.', 1, 1),
('srv-a003', 'clinic-smile-expert-001', 'Laser Hair Reduction Session', 'aesthetics', 'Laser Treatments', 9000, 45, 'Technology-led hair reduction session with consultation-led settings.', 1, 1),
('srv-a004', 'clinic-smile-expert-001', 'Chemical Peel', 'aesthetics', 'Skin Aesthetics', 7500, 40, 'Targeted peel selected for texture, dullness, and pigmentation concerns.', 0, 1),
('srv-a005', 'clinic-smile-expert-001', 'Acne Scar Microneedling', 'aesthetics', 'Skin Aesthetics', 14000, 60, 'Microneedling treatment plan for acne scarring and skin texture.', 1, 1),
('srv-a006', 'clinic-smile-expert-001', 'PRP Hair Therapy', 'aesthetics', 'Hair Treatments', 18000, 60, 'Platelet-rich plasma session for clinician-assessed hair concerns.', 1, 1),
('srv-a007', 'clinic-smile-expert-001', 'Botox Consultation & Treatment', 'aesthetics', 'Injectables', 28000, 45, 'Aesthetic consultation and individualized expression-line treatment.', 0, 1),
('srv-a008', 'clinic-smile-expert-001', 'Lip Filler Consultation', 'aesthetics', 'Injectables', 35000, 50, 'Consultation-led lip enhancement with balanced, natural planning.', 0, 1);

INSERT IGNORE INTO `GalleryItem` (`id`, `clientId`, `type`, `imageUrl`, `service`, `notes`, `isPrivate`) VALUES
('gallery-public-001', 'c001', 'clinic', 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85', 'Premium treatment room', 'A calm clinical environment', 0),
('gallery-public-002', 'c002', 'clinic', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=85', 'Modern reception', 'Comfortable patient arrival', 0),
('gallery-public-003', 'c003', 'clinic', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85', 'Consultation experience', 'Personalized treatment planning', 0),
('gallery-public-004', 'c004', 'clinic', 'https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&w=900&q=85', 'Skin aesthetics', 'Premium skin and laser services', 0);

INSERT IGNORE INTO `Feedback` (`id`, `clinicId`, `clientId`, `appointmentId`, `staffRating`, `serviceRating`, `overallRating`, `comment`, `wouldRecommend`, `isPublic`, `staffId`) VALUES
('fb-public-aesthetic-001', 'clinic-smile-expert-001', 'c004', NULL, 5, 5, 5, 'The skin consultation was detailed and the treatment plan felt genuinely personalized. Very polished experience.', 1, 1, 's102'),
('fb-public-general-001', 'clinic-smile-expert-001', 'c005', NULL, 5, 5, 5, 'Booking was simple and the doctor explained the general wellness plan clearly. The clinic team was very helpful.', 1, 1, 's101');
