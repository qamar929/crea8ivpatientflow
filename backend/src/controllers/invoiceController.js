const prisma = require('../utils/prisma');
const { generateInvoicePDF } = require('../services/pdfService');

function generateInvoiceNo(prefix = 'INV') {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${rand}`;
}

async function list(req, res, next) {
  try {
    const { status, clientId, from, to, search } = req.query;
    const where = { clinicId: req.user.clinicId };
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };
    if (search) where.OR = [{ invoiceNo: { contains: search } }];

    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      include: { client: true, appointment: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { clientId, appointmentId, items, discount = 0, tax = 0, paymentMethod, notes, dueDate, amountPaid = 0 } = req.body;
    const parsedItems = Array.isArray(items) ? items : JSON.parse(items || '[]');
    const subtotal = parsedItems.reduce((s, i) => s + (i.qty || 1) * (i.unitPrice || i.price || 0), 0);
    const discountAmt = (subtotal * discount) / 100;
    const taxAmt = ((subtotal - discountAmt) * tax) / 100;
    const total = subtotal - discountAmt + taxAmt;
    const [client, clinic] = await Promise.all([
      prisma.client.findFirst({ where: { id: clientId, clinicId: req.user.clinicId } }),
      prisma.clinic.findUnique({ where: { id: req.user.clinicId } }),
    ]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const previousBalance = Number(client.outstandingBalance || 0);
    const grandTotal = total + previousBalance;
    const paidNow = Number(amountPaid || 0);
    const balanceDue = Math.max(0, grandTotal - paidNow);
    const status = balanceDue <= 0 ? 'paid' : paidNow > 0 ? 'partial' : 'pending';

    const invoice = await prisma.invoice.create({
      data: {
        clinicId: req.user.clinicId,
        clientId,
        appointmentId: appointmentId || null,
        invoiceNo: generateInvoiceNo(clinic?.invoicePrefix || 'INV'),
        items: JSON.stringify(parsedItems),
        subtotal,
        previousBalance,
        discount: discountAmt,
        tax: taxAmt,
        total,
        grandTotal,
        amountPaid: paidNow,
        balanceDue,
        status,
        paymentMethod,
        notes,
        dueDate,
      },
    });

    await prisma.client.update({
      where: { id: clientId },
      data: {
        totalSpent: { increment: paidNow },
        outstandingBalance: balanceDue,
        latestInvoiceNo: invoice.invoiceNo,
      },
    });
    res.locals.entityId = invoice.id;
    res.status(201).json(invoice);
  } catch (err) { next(err); }
}

async function markPaid(req, res, next) {
  try {
    const { paymentMethod, amountPaid } = req.body;
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, clinicId: req.user.clinicId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const paid = amountPaid == null ? Number(existing.grandTotal || existing.total || 0) : Number(amountPaid);
    const balanceDue = Math.max(0, Number(existing.grandTotal || existing.total || 0) - paid);
    const invoice = await prisma.invoice.updateMany({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      data: { status: balanceDue <= 0 ? 'paid' : 'partial', amountPaid: paid, balanceDue, paymentMethod, paidAt: balanceDue <= 0 ? new Date() : null },
    });
    await prisma.client.update({ where: { id: existing.clientId }, data: { outstandingBalance: balanceDue, totalSpent: { increment: Math.max(0, paid - Number(existing.amountPaid || 0)) } } });
    res.json(invoice);
  } catch (err) { next(err); }
}

async function refund(req, res, next) {
  try {
    await prisma.invoice.updateMany({ where: { id: req.params.id, clinicId: req.user.clinicId }, data: { status: 'refunded' } });
    res.json({ message: 'Refunded' });
  } catch (err) { next(err); }
}

async function getPDF(req, res, next) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, clinicId: req.user.clinicId },
      include: { client: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const clinic = await prisma.clinic.findUnique({ where: { id: req.user.clinicId } });
    const pdfBuffer = await generateInvoicePDF(invoice, invoice.client, clinic);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNo}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, markPaid, refund, getPDF };
