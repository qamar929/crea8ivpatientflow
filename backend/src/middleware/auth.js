const { verifyAccess } = require('../utils/jwt');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = verifyAccess(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
