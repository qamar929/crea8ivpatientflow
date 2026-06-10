const prisma = require('../utils/prisma');
const whatsapp = require('../services/whatsappService');
const email = require('../services/emailService');

async function list(req, res, next) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { clinicId: req.user.clinicId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const campaign = await prisma.campaign.create({ data: { ...req.body, clinicId: req.user.clinicId } });
    res.status(201).json(campaign);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    delete data.clinicId;
    await prisma.campaign.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data });
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await prisma.campaign.deleteMany({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

async function send(req, res, next) {
  try {
    const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const clients = await prisma.client.findMany({ where: { clinicId: req.user.clinicId, status: 'active' } });
    let sentCount = 0;

    for (const client of clients) {
      if (campaign.type === 'whatsapp' && client.phone) {
        await whatsapp.sendMessage(client.phone, campaign.body.replace('{{name}}', client.name));
        sentCount++;
      } else if (campaign.type === 'email' && client.email) {
        await email.send(client.email, campaign.subject || 'The Smile Expert Update', campaign.body.replace('{{name}}', client.name));
        sentCount++;
      } else {
        console.log(`[CAMPAIGN] ${campaign.type} to ${client.name}: ${campaign.body.slice(0, 50)}...`);
        sentCount++;
      }
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { sentCount: { increment: sentCount }, status: 'completed' } });
    res.json({ message: `Campaign sent to ${sentCount} clients`, sentCount });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, send };
