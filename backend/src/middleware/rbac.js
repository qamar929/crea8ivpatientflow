const roleHierarchy = {
  owner: 5,
  manager: 4,
  doctor: 3,
  therapist: 3,
  accountant: 2,
  receptionist: 1,
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
};

const minRole = (minRoleName) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const userLevel = roleHierarchy[req.user.role] || 0;
  const minLevel = roleHierarchy[minRoleName] || 0;
  if (userLevel >= minLevel) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
};

module.exports = { allowRoles, minRole };
