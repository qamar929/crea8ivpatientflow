const prisma = require('../utils/prisma');

const auditLog = (action, entity) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    try {
      await prisma.auditLog.create({
        data: {
          clinicId: req.user?.clinicId || 'system',
          userId: req.user?.id || null,
          action,
          entity,
          entityId: req.params?.id || res.locals?.entityId || null,
          newData: res.locals?.auditData ? JSON.stringify(res.locals.auditData) : null,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (_) {}
  });
  next();
};

module.exports = auditLog;
