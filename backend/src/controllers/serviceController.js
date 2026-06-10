const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const { specialty, category } = req.query;
    const where = { clinicId: req.user.clinicId, isActive: true };
    if (specialty) where.specialty = specialty;
    if (category) where.category = category;
    const services = await prisma.service.findMany({ where, orderBy: { name: 'asc' } });
    res.json(services);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const s = await prisma.service.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const s = await prisma.service.create({ data: { ...req.body, clinicId: req.user.clinicId } });
    res.status(201).json(s);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    await prisma.service.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.service.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data: { isActive: false } });
    res.json({ message: 'Deactivated' });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
