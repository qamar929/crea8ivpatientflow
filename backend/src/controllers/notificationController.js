const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(notifications);
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
}

module.exports = { list, markRead, markAllRead };
