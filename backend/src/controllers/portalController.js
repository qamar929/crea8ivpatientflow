const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const { signAccess } = require('../utils/jwt');
const { generateInvoicePDF } = require('../services/pdfService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const client = await prisma.client.findFirst({ where: { portalEmail: email } });
    if (!client || !client.portalPasswordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, client.portalPasswordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signAccess({ id: client.id, clinicId: client.clinicId, role: 'client', name: client.name });
    res.json({ token, client: { id: client.id, name: client.name, email: client.portalEmail, loyaltyPoints: client.loyaltyPoints, loyaltyTier: client.loyaltyTier } });
  } catch (err) { next(err); }
}

async function getMyAppointments(req, res, next) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { clientId: req.user.id },
      include: { staff: { select: { name: true, role: true } }, service: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(appointments);
  } catch (err) { next(err); }
}

async function bookAppointment(req, res, next) {
  try {
    const data = { ...req.body, clientId: req.user.id, clinicId: req.user.clinicId, status: 'pending' };
    const appt = await prisma.appointment.create({ data });
    res.status(201).json(appt);
  } catch (err) { next(err); }
}

async function getMyInvoices(req, res, next) {
  try {
    const invoices = await prisma.invoice.findMany({ where: { clientId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(invoices);
  } catch (err) { next(err); }
}

async function downloadInvoice(req, res, next) {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, clientId: req.user.id } });
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    const client = await prisma.client.findUnique({ where: { id: req.user.id } });
    const clinic = await prisma.clinic.findUnique({ where: { id: req.user.clinicId } });
    const pdf = await generateInvoicePDF(invoice, client, clinic);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo}.pdf"`);
    res.send(pdf);
  } catch (err) { next(err); }
}

async function getMyPackages(req, res, next) {
  try {
    const packages = await prisma.clientPackage.findMany({ where: { clientId: req.user.id }, include: { package: true } });
    res.json(packages);
  } catch (err) { next(err); }
}

async function submitFeedback(req, res, next) {
  try {
    const fb = await prisma.feedback.create({ data: { ...req.body, clientId: req.user.id } });
    res.status(201).json(fb);
  } catch (err) { next(err); }
}

module.exports = { login, getMyAppointments, bookAppointment, getMyInvoices, downloadInvoice, getMyPackages, submitFeedback };
