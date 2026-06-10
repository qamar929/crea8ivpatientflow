function hasCredentials() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

async function sendMessage(to, body) {
  if (!hasCredentials()) {
    console.log(`[WHATSAPP STUB] To: ${to} | Message: ${body}`);
    return { status: 'stub', to, body };
  }
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return await twilio.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${to}`,
    body,
  });
}

async function sendAppointmentReminder(phone, name, date, time, service) {
  const body = `Hi ${name}, reminder: you have a *${service}* dental appointment at The Smile Expert on *${date} at ${time}*. Reply C to confirm or R to reschedule.`;
  return sendMessage(phone, body);
}

async function sendInvoice(phone, invoiceNo, amount) {
  const body = `The Smile Expert Invoice\nInvoice #: ${invoiceNo}\nAmount: PKR ${amount.toLocaleString()}\nThank you for visiting us.`;
  return sendMessage(phone, body);
}

async function sendBirthday(phone, name) {
  const body = `Happy Birthday, ${name}. The Smile Expert wishes you a wonderful day. Enjoy 15% off your next dental visit with code BDAY15.`;
  return sendMessage(phone, body);
}

async function sendPackageExpiry(phone, name, packageName, expiryDate) {
  const body = `Hi ${name}, your *${packageName}* package at The Smile Expert expires on *${expiryDate}*. Book your remaining dental sessions now.`;
  return sendMessage(phone, body);
}

async function sendPostVisit(phone, name, service) {
  const body = `Hi ${name}, we hope you are comfortable after your *${service}* at The Smile Expert. Please follow the aftercare instructions shared by your dentist.`;
  return sendMessage(phone, body);
}

module.exports = { sendAppointmentReminder, sendInvoice, sendBirthday, sendPackageExpiry, sendPostVisit };
