const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function send(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    return;
  }
  await t.sendMail({ from: `"The Smile Expert" <${process.env.SMTP_USER}>`, to, subject, html });
}

async function sendAppointmentReminder(client, appointment) {
  const subject = `Reminder: Your ${appointment.service} appointment tomorrow`;
  const html = `<p>Dear ${client.name},</p><p>This is a reminder for your dental appointment on <b>${appointment.date} at ${appointment.startTime}</b> for <b>${appointment.service}</b>.</p><p>See you soon.<br/>The Smile Expert</p>`;
  await send(client.email, subject, html);
}

async function sendInvoice(client, invoice, pdfBuffer) {
  const subject = `Invoice ${invoice.invoiceNo} from The Smile Expert`;
  const html = `<p>Dear ${client.name},</p><p>Please find your invoice <b>${invoice.invoiceNo}</b> for <b>PKR ${invoice.total.toLocaleString()}</b> attached.</p><p>Thank you,<br/>The Smile Expert</p>`;
  const t = getTransporter();
  if (!t) { console.log(`[EMAIL STUB] Invoice ${invoice.invoiceNo} to ${client.email}`); return; }
  await t.sendMail({
    from: `"The Smile Expert" <${process.env.SMTP_USER}>`, to: client.email, subject, html,
    attachments: [{ filename: `${invoice.invoiceNo}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
  });
}

async function sendWelcome(client) {
  const subject = 'Welcome to The Smile Expert';
  const html = `<p>Dear ${client.name},</p><p>Welcome to The Smile Expert. Your dental profile is ready, and our team will track your appointments, dues, invoices, and follow-ups from one secure portal.</p><p>The Smile Expert Team</p>`;
  await send(client.email, subject, html);
}

async function sendFeedbackRequest(client, appointment) {
  const subject = 'How was your experience at The Smile Expert?';
  const html = `<p>Dear ${client.name},</p><p>Thank you for visiting The Smile Expert for your <b>${appointment.service}</b> appointment. We would love to hear your feedback.</p><p>The Smile Expert Team</p>`;
  await send(client.email, subject, html);
}

module.exports = { sendAppointmentReminder, sendInvoice, sendWelcome, sendFeedbackRequest };
