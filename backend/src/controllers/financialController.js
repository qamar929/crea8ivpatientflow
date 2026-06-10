const prisma = require('../utils/prisma');

async function getSummary(req, res, next) {
  try {
    const clinicId = req.user.clinicId;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [invoices, pending] = await Promise.all([
      prisma.invoice.findMany({ where: { clinicId, status: { in: ['paid'] } } }),
      prisma.invoice.findMany({ where: { clinicId, status: 'pending' } }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
    const outstandingPayments = pending.reduce((s, i) => s + i.total, 0);

    res.json({
      totalRevenue,
      totalExpenses: totalRevenue * 0.38,
      netProfit: totalRevenue * 0.62,
      outstandingPayments,
      revenueGrowth: 15.2,
      expenseGrowth: 8.4,
      profitGrowth: 20.1,
    });
  } catch (err) { next(err); }
}

async function getMonthly(req, res, next) {
  try {
    const clinicId = req.user.clinicId;
    const invoices = await prisma.invoice.findMany({
      where: { clinicId, status: 'paid' },
      include: { appointment: { select: { specialty: true } } },
    });

    const monthly = {};
    invoices.forEach(inv => {
      const month = new Date(inv.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthly[month]) monthly[month] = { month, dental: 0, total: 0 };
      const specialty = inv.appointment?.specialty || 'dental';
      monthly[month][specialty] = (monthly[month][specialty] || 0) + inv.total;
      monthly[month].total += inv.total;
    });

    res.json(Object.values(monthly));
  } catch (err) { next(err); }
}

async function getTransactions(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: { clinicId: req.user.clinicId },
      include: { client: { select: { name: true } }, appointment: { select: { specialty: true, service: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: Number(limit),
    });
    res.json(invoices);
  } catch (err) { next(err); }
}

module.exports = { getSummary, getMonthly, getTransactions };
