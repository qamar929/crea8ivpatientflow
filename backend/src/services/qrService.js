const QRCode = require('qrcode');

async function generateAppointmentQR(appointmentId, clientName, date, time) {
  const data = JSON.stringify({ appointmentId, clientName, date, time, type: 'checkin', clinic: 'The Smile Expert' });
  return await QRCode.toDataURL(data);
}

async function generateQRBuffer(data) {
  return await QRCode.toBuffer(JSON.stringify(data));
}

module.exports = { generateAppointmentQR, generateQRBuffer };
