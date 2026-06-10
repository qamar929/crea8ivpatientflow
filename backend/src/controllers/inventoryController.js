const prisma = require('../utils/prisma');

async function list(req, res, next) {
  try {
    const { specialty, category, lowStock } = req.query;
    const where = { clinicId: req.user.clinicId, isActive: true };
    if (specialty) where.specialty = specialty;
    if (category) where.category = category;

    let items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    if (lowStock === 'true') items = items.filter(i => i.quantity <= i.reorderLevel);
    res.json(items);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const item = await prisma.inventoryItem.create({ data: { ...req.body, clinicId: req.user.clinicId } });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    await prisma.inventoryItem.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function adjustStock(req, res, next) {
  try {
    const { type, quantity, reason } = req.body;
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!item) return res.status(404).json({ error: 'Not found' });

    const newQty = type === 'in' ? item.quantity + quantity : Math.max(0, item.quantity - quantity);
    await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { quantity: newQty } });
    await prisma.inventoryTransaction.create({ data: { itemId: req.params.id, type, quantity, reason } });

    const io = req.app.get('io');
    if (io && newQty <= item.reorderLevel) {
      io.to(req.user.clinicId).emit('inventory:low_stock', { item: { ...item, quantity: newQty } });
    }
    res.json({ quantity: newQty });
  } catch (err) { next(err); }
}

async function getLowStock(req, res, next) {
  try {
    const items = await prisma.inventoryItem.findMany({ where: { clinicId: req.user.clinicId, isActive: true } });
    res.json(items.filter(i => i.quantity <= i.reorderLevel));
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, adjustStock, getLowStock };
