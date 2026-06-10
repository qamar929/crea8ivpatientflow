const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const { staffId, minRating, specialty } = req.query;
    const feedback = await prisma.feedback.findMany({
      where: {
        clinicId: req.user.clinicId,
        ...(staffId ? { staffId } : {}),
        ...(minRating ? { overallRating: { gte: Number(minRating) } } : {}),
      },
      include: {
        client: { select: { name: true, avatarColor: true, initials: true } },
        appointment: { include: { staff: { select: { name: true, role: true } }, service: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(feedback);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, clinicId: req.user.clinicId };
    const fb = await prisma.feedback.create({ data });
    // Update appointment status
    if (data.appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, include: { staff: true } });
      if (appt) {
        const allFeedback = await prisma.feedback.findMany({ where: { staffId: appt.staffId } });
        const avg = allFeedback.reduce((s, f) => s + f.overallRating, 0) / allFeedback.length;
        await prisma.staff.update({ where: { id: appt.staffId }, data: { rating: Math.round(avg * 10) / 10 } });
      }
    }
    res.status(201).json(fb);
  } catch (err) { next(err); }
}

async function getSummary(req, res, next) {
  try {
    const feedback = await prisma.feedback.findMany({ where: { clinicId: req.user.clinicId } });
    const avg = (field) => feedback.length ? feedback.reduce((s, f) => s + f[field], 0) / feedback.length : 0;
    const recommend = feedback.filter(f => f.wouldRecommend).length;
    res.json({
      total: feedback.length,
      avgOverall: avg('overallRating'),
      avgStaff: avg('staffRating'),
      avgService: avg('serviceRating'),
      recommendRate: feedback.length ? Math.round((recommend / feedback.length) * 100) : 0,
    });
  } catch (err) { next(err); }
}

module.exports = { list, create, getSummary };
