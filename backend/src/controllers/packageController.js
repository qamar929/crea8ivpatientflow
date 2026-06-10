const prisma = require('../utils/prisma');

async function listPackages(req, res, next) {
  try {
    const packages = await prisma.package.findMany({
      where: { clinicId: req.user.clinicId, isActive: true },
      include: { items: { include: { service: true } } },
    });
    res.json(packages);
  } catch (err) { next(err); }
}

async function createPackage(req, res, next) {
  try {
    const { items, ...data } = req.body;
    data.clinicId = req.user.clinicId;
    const pkg = await prisma.package.create({
      data: { ...data, items: items ? { create: items } : undefined },
      include: { items: { include: { service: true } } },
    });
    res.status(201).json(pkg);
  } catch (err) { next(err); }
}

async function updatePackage(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    delete data.items;
    await prisma.package.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function purchasePackage(req, res, next) {
  try {
    const { clientId, amountPaid } = req.body;
    const pkg = await prisma.package.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      include: { items: true },
    });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const totalSessions = pkg.items.reduce((s, i) => s + i.sessions, 0);
    const purchaseDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(Date.now() + pkg.validity * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const cp = await prisma.clientPackage.create({
      data: { clientId, packageId: pkg.id, purchaseDate, expiryDate, totalSessions, amountPaid: amountPaid || pkg.totalPrice },
    });
    await prisma.client.update({ where: { id: clientId }, data: { totalSpent: { increment: amountPaid || pkg.totalPrice } } });
    res.status(201).json(cp);
  } catch (err) { next(err); }
}

async function getClientPackages(req, res, next) {
  try {
    const packages = await prisma.clientPackage.findMany({
      where: { clientId: req.params.clientId },
      include: { package: { include: { items: { include: { service: true } } } } },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json(packages);
  } catch (err) { next(err); }
}

module.exports = { listPackages, createPackage, updatePackage, purchasePackage, getClientPackages };
