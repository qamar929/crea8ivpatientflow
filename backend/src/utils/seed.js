require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const clinicId = 'clinic-smile-expert-001';
const branchId = 'branch-smile-expert-main';

async function resetDemoData() {
  const where = { clinicId };
  await prisma.auditLog.deleteMany({ where });
  await prisma.feedback.deleteMany({ where });
  await prisma.invoice.deleteMany({ where });
  await prisma.clientPackage.deleteMany({});
  await prisma.packageItem.deleteMany({});
  await prisma.package.deleteMany({ where });
  await prisma.galleryItem.deleteMany({});
  await prisma.appointment.deleteMany({ where });
  await prisma.inventoryItem.deleteMany({ where });
  await prisma.campaign.deleteMany({ where });
  await prisma.service.deleteMany({ where });
  await prisma.client.deleteMany({ where });
  await prisma.staff.deleteMany({ where });
  const demoUsers = await prisma.user.findMany({ where, select: { id: true } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: demoUsers.map(user => user.id) } } });
  await prisma.user.deleteMany({ where });
  await prisma.branch.deleteMany({ where });
  await prisma.clinic.deleteMany({ where: { id: clinicId } });
}

async function main() {
  console.log('Seeding The Smile Expert dental portal...');
  await resetDemoData();

  const clinic = await prisma.clinic.create({
    data: {
      id: clinicId,
      name: 'The Smile Expert',
      tagline: 'Premium Dental Care Portal',
      logo: 'SE',
      address: 'Dental Clinic, Lahore, Pakistan',
      phone: '+92 42 111 764 533',
      whatsapp: '+92 300 764 5330',
      email: 'care@thesmileexpert.com',
      website: 'portal.thesmileexpert.com',
      registrationNo: 'DENT-LHR-2026-001',
      invoicePrefix: 'TSE',
      invoiceFooter: 'Thank you for choosing The Smile Expert. Please follow the aftercare instructions shared by your dentist.',
      paymentTerms: 'Partial payments are tracked against the same patient number. Remaining dues appear on the next invoice.',
      mission: 'Deliver precise, comfortable, and transparent dental care through a modern digital clinic workflow.',
      vision: 'To become the most trusted dental care experience for families, smile design, restorative dentistry, and implants.',
      servicesOverview: 'Consultation, scaling, whitening, fillings, root canal, crowns, veneers, implants, extractions, oral surgery, aligners, and pediatric dental care.',
      primaryColor: '#0f766e',
      secondaryColor: '#2563eb',
      specialties: 'dental',
    },
  });

  const branch = await prisma.branch.create({
    data: {
      id: branchId,
      clinicId: clinic.id,
      name: 'The Smile Expert Main Branch',
      address: 'Dental Clinic, Lahore, Pakistan',
      phone: '+92 42 111 764 533',
      isActive: true,
    },
  });

  const users = [
    { name: 'Owner', email: 'owner@thesmileexpert.com', password: 'owner123', role: 'owner' },
    { name: 'Reception Desk', email: 'reception@thesmileexpert.com', password: 'reception123', role: 'receptionist' },
    { name: 'Dental Staff', email: 'staff@thesmileexpert.com', password: 'staff123', role: 'staff' },
  ];
  for (const user of users) {
    await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name: user.name,
        email: user.email,
        password: await bcrypt.hash(user.password, 12),
        role: user.role,
      },
    });
  }

  const staffData = [
    { id: 's001', name: 'Dr. Hammad Raza', role: 'Lead Dental Surgeon', designation: 'Owner Dentist', specialty: 'dental', avatarColor: '#0f766e', avatar: 'HR', qualifications: 'BDS, FCPS Oral Surgery', experience: '15 years', rating: 4.9, compensationType: 'commission', commissionRate: 35, portalRole: 'owner', loginEmail: 'owner@thesmileexpert.com' },
    { id: 's002', name: 'Dr. Ayesha Siddiqui', role: 'Cosmetic Dentist', designation: 'Smile Design Specialist', specialty: 'dental', avatarColor: '#2563eb', avatar: 'AS', qualifications: 'BDS, Cosmetic Dentistry Fellowship', experience: '9 years', rating: 4.8, compensationType: 'commission', commissionRate: 30, portalRole: 'staff', loginEmail: 'ayesha@thesmileexpert.com' },
    { id: 's003', name: 'Dr. Bilal Khan', role: 'Endodontist', designation: 'Root Canal Specialist', specialty: 'dental', avatarColor: '#7c3aed', avatar: 'BK', qualifications: 'BDS, MCPS Endodontics', experience: '11 years', rating: 4.8, compensationType: 'commission', commissionRate: 28, portalRole: 'staff', loginEmail: 'bilal@thesmileexpert.com' },
    { id: 's004', name: 'Sana Mir', role: 'Receptionist', designation: 'Front Desk', specialty: 'dental', avatarColor: '#f97316', avatar: 'SM', qualifications: 'BBA', experience: '5 years', rating: 4.7, compensationType: 'fixed', fixedSalary: 65000, portalRole: 'receptionist', loginEmail: 'reception@thesmileexpert.com' },
    { id: 's005', name: 'Usman Ali', role: 'Dental Assistant', designation: 'Chairside Assistant', specialty: 'dental', avatarColor: '#14b8a6', avatar: 'UA', qualifications: 'Dental Assistant Diploma', experience: '4 years', rating: 4.6, compensationType: 'fixed', fixedSalary: 55000, portalRole: 'staff', loginEmail: 'usman@thesmileexpert.com' },
    { id: 's006', name: 'Nida Farooq', role: 'Manager', designation: 'Clinic Operations', specialty: 'dental', avatarColor: '#64748b', avatar: 'NF', qualifications: 'MBA Healthcare', experience: '7 years', rating: 4.7, compensationType: 'fixed', fixedSalary: 110000, portalRole: 'owner', loginEmail: 'manager@thesmileexpert.com' },
  ];
  for (const s of staffData) {
    await prisma.staff.create({ data: { ...s, clinicId: clinic.id, branchId: branch.id, status: 'active' } });
  }

  const servicesData = [
    ['srv001', 'Dental Consultation', 'Consultation', 2500, 30, true],
    ['srv002', 'Scaling & Polishing', 'Preventive', 6000, 45, true],
    ['srv003', 'Teeth Whitening', 'Cosmetic', 18000, 75, true],
    ['srv004', 'Composite Filling', 'Restorative', 8500, 45, true],
    ['srv005', 'Root Canal Treatment', 'Endodontics', 22000, 90, true],
    ['srv006', 'Zirconia Crown', 'Prosthodontics', 32000, 60, true],
    ['srv007', 'Smile Design Veneers', 'Cosmetic', 55000, 90, true],
    ['srv008', 'Dental Implant', 'Implantology', 145000, 120, true],
    ['srv009', 'Tooth Extraction', 'Oral Surgery', 9000, 45, false],
    ['srv010', 'Wisdom Tooth Surgery', 'Oral Surgery', 28000, 90, true],
    ['srv011', 'Clear Aligners Consultation', 'Orthodontics', 3500, 40, false],
    ['srv012', 'Pediatric Dental Checkup', 'Pediatric', 2500, 30, false],
  ];
  for (const [id, name, category, price, duration, popular] of servicesData) {
    await prisma.service.create({ data: { id, clinicId: clinic.id, name, specialty: 'dental', category, price, duration, popular } });
  }

  const clientsData = [
    { id: 'c001', patientNo: 'TSE-0001', name: 'Ayesha Khan', phone: '+92 300 1234567', email: 'ayesha.khan@gmail.com', specialty: '["dental"]', totalSpent: 185000, outstandingBalance: 35000, latestInvoiceNo: 'TSE-2026-0445', nextFollowUpDue: '2026-05-28', initials: 'AK', avatarColor: '#0f766e' },
    { id: 'c002', patientNo: 'TSE-0002', name: 'Zain Ahmed', phone: '+92 321 9876543', email: 'zain.ahmed@outlook.com', specialty: '["dental"]', totalSpent: 92000, outstandingBalance: 0, latestInvoiceNo: 'TSE-2026-0446', nextFollowUpDue: '2026-06-02', initials: 'ZA', avatarColor: '#2563eb' },
    { id: 'c003', patientNo: 'TSE-0003', name: 'Farah Siddiqui', phone: '+92 333 5554444', email: 'farah.s@hotmail.com', specialty: '["dental"]', totalSpent: 124000, outstandingBalance: 18000, latestInvoiceNo: 'TSE-2026-0447', nextFollowUpDue: '2026-05-31', initials: 'FS', avatarColor: '#f97316' },
    { id: 'c004', patientNo: 'TSE-0004', name: 'Bilal Sheikh', phone: '+92 312 7778899', email: 'bilal.sheikh@gmail.com', specialty: '["dental"]', totalSpent: 310000, outstandingBalance: 80000, latestInvoiceNo: 'TSE-2026-0448', nextFollowUpDue: '2026-06-08', initials: 'BS', avatarColor: '#0ea5e9' },
    { id: 'c005', patientNo: 'TSE-0005', name: 'Noor Fatima', phone: '+92 345 2223333', email: 'noor.fatima@yahoo.com', specialty: '["dental"]', totalSpent: 55000, outstandingBalance: 0, latestInvoiceNo: 'TSE-2026-0449', nextFollowUpDue: '2026-06-12', initials: 'NF', avatarColor: '#14b8a6' },
  ];
  for (const c of clientsData) {
    await prisma.client.create({
      data: {
        ...c,
        clinicId: clinic.id,
        dob: '1990-01-01',
        gender: 'Not specified',
        loyaltyPoints: Math.round(c.totalSpent / 100),
        loyaltyTier: c.totalSpent > 150000 ? 'Gold' : 'Silver',
        lastVisit: '2026-05-24',
        status: 'active',
        medicalHistory: JSON.stringify(['Dental charting completed', 'No known drug allergy']),
      },
    });
  }

  const appointmentsData = [
    ['a001', 'c001', 's002', 'srv007', '11:00', '12:30', 55000, 'Smile design photos and shade selection'],
    ['a002', 'c002', 's003', 'srv005', '10:00', '11:30', 22000, 'Root canal obturation visit'],
    ['a003', 'c003', 's002', 'srv003', '13:00', '14:15', 18000, 'Whitening with sensitivity care'],
    ['a004', 'c004', 's001', 'srv008', '15:00', '17:00', 145000, 'Implant planning and CBCT review'],
    ['a005', 'c005', 's001', 'srv004', '17:15', '18:00', 8500, 'Composite restoration'],
  ];
  for (const [id, clientId, staffId, serviceId, startTime, endTime, price, notes] of appointmentsData) {
    await prisma.appointment.create({
      data: { id, clinicId: clinic.id, branchId: branch.id, clientId, staffId, serviceId, date: '2026-05-24', startTime, endTime, duration: 60, status: id === 'a003' ? 'completed' : 'confirmed', room: 'Dental Operatory', price, specialty: 'dental', notes },
    });
  }

  const invoicesData = [
    { id: 'inv001', clientId: 'c001', appointmentId: 'a001', invoiceNo: 'TSE-2026-0445', item: 'Smile Design Veneers', subtotal: 55000, paid: 20000, status: 'pending' },
    { id: 'inv002', clientId: 'c002', appointmentId: 'a002', invoiceNo: 'TSE-2026-0446', item: 'Root Canal Treatment', subtotal: 22000, paid: 22000, status: 'paid' },
    { id: 'inv003', clientId: 'c003', appointmentId: 'a003', invoiceNo: 'TSE-2026-0447', item: 'Teeth Whitening', subtotal: 18000, paid: 0, status: 'pending' },
    { id: 'inv004', clientId: 'c004', appointmentId: 'a004', invoiceNo: 'TSE-2026-0448', item: 'Dental Implant', subtotal: 145000, paid: 65000, status: 'pending' },
    { id: 'inv005', clientId: 'c005', appointmentId: 'a005', invoiceNo: 'TSE-2026-0449', item: 'Composite Filling', subtotal: 8500, paid: 8500, status: 'paid' },
  ];
  for (const inv of invoicesData) {
    await prisma.invoice.create({
      data: {
        id: inv.id,
        clinicId: clinic.id,
        clientId: inv.clientId,
        appointmentId: inv.appointmentId,
        invoiceNo: inv.invoiceNo,
        items: JSON.stringify([{ name: inv.item, qty: 1, unitPrice: inv.subtotal, total: inv.subtotal }]),
        subtotal: inv.subtotal,
        discount: 0,
        tax: 0,
        total: inv.subtotal,
        amountPaid: inv.paid,
        balanceDue: inv.subtotal - inv.paid,
        status: inv.status,
        paymentMethod: inv.paid ? 'Cash' : null,
      },
    });
  }

  const inventoryData = [
    ['inv-d001', 'Composite Resin', 'Restorative', 50, 'syringes', 10, 800],
    ['inv-d002', 'Impression Material', 'Diagnostic', 8, 'packs', 10, 1200],
    ['inv-d003', 'Lidocaine Anesthetic', 'Anesthesia', 30, 'vials', 15, 350],
    ['inv-d004', 'Endodontic Files', 'Endodontics', 18, 'packs', 8, 1800],
    ['inv-d005', 'Surgical Sutures', 'Oral Surgery', 24, 'packs', 12, 950],
    ['inv-d006', 'Implant Fixture Kit', 'Implantology', 6, 'kits', 4, 42000],
    ['inv-g001', 'Nitrile Gloves', 'PPE', 250, 'pairs', 50, 45],
    ['inv-g002', 'Surgical Masks', 'PPE', 180, 'pcs', 100, 25],
  ];
  for (const [id, name, category, quantity, unit, reorderLevel, costPerUnit] of inventoryData) {
    await prisma.inventoryItem.create({ data: { id, clinicId: clinic.id, name, category, specialty: 'dental', quantity, unit, reorderLevel, costPerUnit, supplier: 'Dental Supply Partner' } });
  }

  const pkgData = [
    ['pkg001', 'Dental Care Pack', 'Consultation, scaling, polishing, and one follow-up hygiene review.', 12000, 180],
    ['pkg002', 'Smile Whitening Plan', 'Whitening session with shade documentation and sensitivity kit.', 22000, 90],
    ['pkg003', 'Root Canal + Crown Plan', 'Root canal treatment, core build-up, and zirconia crown workflow.', 52000, 120],
    ['pkg004', 'Implant Journey Plan', 'Implant consultation, surgical placement, review, and prosthetic appointment.', 145000, 365],
  ];
  for (const [id, name, description, totalPrice, validity] of pkgData) {
    await prisma.package.create({ data: { id, clinicId: clinic.id, name, description, totalPrice, validity, specialty: 'dental' } });
  }

  await prisma.clientPackage.create({ data: { id: 'cp001', clientId: 'c001', packageId: 'pkg002', purchaseDate: '2026-05-10', expiryDate: '2026-08-10', totalSessions: 2, usedSessions: 1, status: 'active', amountPaid: 22000 } });

  const feedbackData = [
    ['fb001', 'c001', 'a001', 's002', 'The smile design preview was excellent and the team explained every step.'],
    ['fb002', 'c002', 'a002', 's003', 'Root canal was comfortable and clearly managed.'],
    ['fb003', 'c003', 'a003', 's002', 'Whitening result was bright and natural.'],
  ];
  for (const [id, clientId, appointmentId, staffId, comment] of feedbackData) {
    await prisma.feedback.create({ data: { id, clinicId: clinic.id, clientId, appointmentId, staffId, staffRating: 5, serviceRating: 5, overallRating: 5, comment, wouldRecommend: true, isPublic: true } });
  }

  const campaigns = [
    { id: 'cmp001', name: 'Monthly Recall', type: 'whatsapp', trigger: 'manual', body: 'Hi {{name}}, your dental follow-up is due. Reply 1 to book your appointment with The Smile Expert.', status: 'active', sentCount: 124, openCount: 96 },
    { id: 'cmp002', name: 'Appointment Reminder', type: 'sms', trigger: 'appointment_reminder', body: 'Reminder: your appointment at The Smile Expert is tomorrow. Reply C to confirm or R to reschedule.', status: 'active', sentCount: 240, openCount: 210 },
    { id: 'cmp003', name: 'Whitening Follow-up', type: 'whatsapp', trigger: 'aftercare', body: 'Hi {{name}}, avoid tea, coffee, and colored foods for 24 hours after whitening. Contact us if you feel sensitivity.', status: 'active', sentCount: 58, openCount: 52 },
  ];
  for (const campaign of campaigns) {
    await prisma.campaign.create({ data: { ...campaign, clinicId: clinic.id } });
  }

  const auditLogs = [
    { action: 'LOGIN', entity: 'User', entityId: 'owner@thesmileexpert.com', newData: JSON.stringify({ role: 'owner' }) },
    { action: 'CREATE', entity: 'Appointment', entityId: 'a001', newData: JSON.stringify({ clientId: 'c001', service: 'Smile Design Veneers' }) },
    { action: 'UPDATE', entity: 'Invoice', entityId: 'TSE-2026-0445', newData: JSON.stringify({ status: 'partial', balanceDue: 35000 }) },
    { action: 'CREATE', entity: 'Staff', entityId: 's005', newData: JSON.stringify({ name: 'Usman Ali', role: 'Dental Assistant' }) },
  ];
  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: { ...log, clinicId: clinic.id, ip: '192.168.1.1', userAgent: 'Seed Script' } });
  }

  console.log('Database seeded successfully.');
  console.log('Owner: owner@thesmileexpert.com / owner123');
  console.log('Reception: reception@thesmileexpert.com / reception123');
  console.log('Staff: staff@thesmileexpert.com / staff123');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
