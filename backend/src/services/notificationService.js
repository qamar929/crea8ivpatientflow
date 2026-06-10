const prisma = require('../utils/prisma');

async function createNotification({ clinicId, userId, clientId, type, title, body, channel = 'push' }) {
  return await prisma.notification.create({
    data: { clinicId, userId, clientId, type, title, body, channel },
  });
}

async function markRead(id) {
  return await prisma.notification.update({ where: { id }, data: { read: true } });
}

async function getUnread(userId) {
  return await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

module.exports = { createNotification, markRead, getUnread };
