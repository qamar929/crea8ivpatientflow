const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const ALLOWED_ROLES = ['owner', 'manager', 'doctor', 'therapist', 'accountant', 'receptionist', 'staff'];
const ALLOWED_LEDGER_MODES = ['actual', 'regular'];

async function list(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { clinicId: req.user.clinicId },
      select: { id: true, name: true, email: true, role: true, ledgerMode: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { name, email, password, role, ledgerMode } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const mode = ledgerMode && ALLOWED_LEDGER_MODES.includes(ledgerMode) ? ledgerMode : 'actual';
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        clinicId: req.user.clinicId,
        name,
        email: normalizedEmail,
        password: hash,
        role,
        ledgerMode: mode,
      },
      select: { id: true, name: true, email: true, role: true, ledgerMode: true, isActive: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { name, email, role, isActive, ledgerMode } = req.body;
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = String(email).trim().toLowerCase();
    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      data.role = role;
    }
    if (isActive !== undefined) data.isActive = !!isActive;
    if (ledgerMode !== undefined) {
      if (!ALLOWED_LEDGER_MODES.includes(ledgerMode)) return res.status(400).json({ error: 'Invalid ledgerMode' });
      data.ledgerMode = ledgerMode;
    }

    if (data.email && data.email !== existing.email) {
      const dup = await prisma.user.findUnique({ where: { email: data.email } });
      if (dup) return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true, name: true, email: true, role: true, ledgerMode: true, isActive: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
    }
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: existing.id }, data: { password: hash } });
    await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
    res.json({ message: 'Password reset' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, resetPassword, remove };
