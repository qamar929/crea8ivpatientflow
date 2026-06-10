const prisma = require('../utils/prisma');
const path = require('path');

async function list(req, res, next) {
  try {
    const items = await prisma.galleryItem.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) { next(err); }
}

async function upload(req, res, next) {
  try {
    const { clientId } = req.params;
    const { type, service, notes, appointmentId, isPrivate } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const item = await prisma.galleryItem.create({
      data: {
        clientId,
        appointmentId: appointmentId || null,
        type: type || 'before',
        imageUrl: `/uploads/${req.file.filename}`,
        service,
        notes,
        isPrivate: isPrivate !== 'false',
      },
    });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.galleryItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, upload, remove };
