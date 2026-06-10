const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const { specialty, status, branchId } = req.query;
    const where = { clinicId: req.user.clinicId };
    if (specialty && specialty !== 'all') where.specialty = specialty;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    const staff = await prisma.staff.findMany({ where, orderBy: { name: 'asc' } });
    res.json(staff);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const staff = await prisma.staff.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!staff) return res.status(404).json({ error: 'Not found' });
    res.json(staff);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, clinicId: req.user.clinicId };
    if (!data.avatar && data.name) data.avatar = data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    if (!data.designation) data.designation = data.role;
    if (!data.loginEmail) data.loginEmail = data.email;
    if (!data.portalRole) data.portalRole = data.role?.toLowerCase().includes('reception') ? 'receptionist' : 'doctor';
    if (data.treatmentCommissionRates && typeof data.treatmentCommissionRates !== 'string') {
      data.treatmentCommissionRates = JSON.stringify(data.treatmentCommissionRates);
    }
    if (data.sendCredentials) {
      data.inviteStatus = 'sent';
      data.lastInviteSent = new Date();
    }
    const staff = await prisma.staff.create({ data });
    res.status(201).json(staff);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    await prisma.staff.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.staff.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data: { status: 'inactive' } });
    res.json({ message: 'Deactivated' });
  } catch (err) { next(err); }
}

async function getPerformance(req, res, next) {
  try {
    const staffId = req.params.id;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const [allAppts, monthAppts, invoices] = await Promise.all([
      prisma.appointment.count({ where: { staffId } }),
      prisma.appointment.count({ where: { staffId, date: { gte: firstOfMonth } } }),
      prisma.invoice.findMany({ where: { appointment: { staffId } }, select: { total: true } }),
    ]);

    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    res.json({ allAppointments: allAppts, monthAppointments: monthAppts, revenue, rating: staff?.rating || 0 });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, getPerformance };
