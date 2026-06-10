const prisma = require('../utils/prisma');
const { generateAppointmentQR } = require('../services/qrService');

async function list(req, res, next) {
  try {
    const { date, staffId, specialty, status, branchId, from, to } = req.query;
    const where = { clinicId: req.user.clinicId };
    if (date) where.date = date;
    if (staffId) where.staffId = staffId;
    if (specialty) where.specialty = specialty;
    if (status) where.status = status;
    if (branchId) where.branchId = branchId;
    if (from && to) where.date = { gte: from, lte: to };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, avatarColor: true, initials: true } },
        staff: { select: { id: true, name: true, role: true, avatarColor: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json(appointments);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      include: {
        client: true,
        staff: { select: { id: true, name: true, role: true } },
        service: true,
      },
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appt);
  } catch (err) { next(err); }
}

async function checkConflict(clinicId, staffId, date, startTime, endTime, excludeId) {
  const conflicts = await prisma.appointment.findMany({
    where: {
      clinicId,
      staffId,
      date,
      status: { in: ['confirmed', 'pending'] },
      id: excludeId ? { not: excludeId } : undefined,
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  return conflicts;
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, clinicId: req.user.clinicId };
    const conflicts = await checkConflict(data.clinicId, data.staffId, data.date, data.startTime, data.endTime);
    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Time slot conflict: staff already has an appointment in this period', conflicts });
    }
    const qrCode = await generateAppointmentQR(data.id || 'new', data.clientId, data.date, data.startTime);
    data.qrCode = qrCode;
    const appt = await prisma.appointment.create({ data });
    res.locals.entityId = appt.id;

    // Emit real-time event
    const io = req.app.get('io');
    if (io) io.to(req.user.clinicId).emit('appointment:created', appt);

    res.status(201).json(appt);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    if (data.staffId && data.date && data.startTime && data.endTime) {
      const conflicts = await checkConflict(req.user.clinicId, data.staffId, data.date, data.startTime, data.endTime, req.params.id);
      if (conflicts.length > 0) return res.status(409).json({ error: 'Time slot conflict', conflicts });
    }
    const appt = await prisma.appointment.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    const io = req.app.get('io');
    if (io) io.to(req.user.clinicId).emit('appointment:updated', { id: req.params.id, ...data });
    res.json(appt);
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    await prisma.appointment.updateMany({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      data: { status: 'cancelled' },
    });
    res.json({ message: 'Cancelled' });
  } catch (err) { next(err); }
}

async function checkIn(req, res, next) {
  try {
    const appt = await prisma.appointment.updateMany({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      data: { checkedIn: true, checkinTime: new Date(), status: 'confirmed' },
    });
    const io = req.app.get('io');
    if (io) io.to(req.user.clinicId).emit('appointment:checkin', { id: req.params.id });

    // Award loyalty points
    const full = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (full) {
      await prisma.client.update({ where: { id: full.clientId }, data: { loyaltyPoints: { increment: Math.floor(full.price / 100) } } });
    }
    res.json({ message: 'Checked in', appt });
  } catch (err) { next(err); }
}

async function getToday(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await prisma.appointment.findMany({
      where: { clinicId: req.user.clinicId, date: today },
      include: {
        client: { select: { id: true, name: true, avatarColor: true, initials: true } },
        staff: { select: { id: true, name: true } },
        service: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json(appointments);
  } catch (err) { next(err); }
}

async function getConflicts(req, res, next) {
  try {
    const { staffId, date, startTime, endTime } = req.query;
    const conflicts = await checkConflict(req.user.clinicId, staffId, date, startTime, endTime);
    res.json({ hasConflict: conflicts.length > 0, conflicts });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, cancel, checkIn, getToday, getConflicts };
