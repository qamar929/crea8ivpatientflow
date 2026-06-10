const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const branches = await prisma.branch.findMany({
      where: { clinicId: req.user.clinicId },
      include: { _count: { select: { staff: true, appointments: true } } },
    });
    res.json(branches);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const branch = await prisma.branch.create({ data: { ...req.body, clinicId: req.user.clinicId } });
    res.status(201).json(branch);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    await prisma.branch.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.branch.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data: { isActive: false } });
    res.json({ message: 'Deactivated' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
