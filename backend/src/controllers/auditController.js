const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const { action, entity, userId, from, to, page = 1, limit = 50 } = req.query;
    const where = { clinicId: req.user.clinicId };
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: Number(limit),
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (err) { next(err); }
}

module.exports = { list };
