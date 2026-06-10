const PDFDocument = require('pdfkit');

async function generateInvoicePDF(invoice, client, clinic) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = clinic?.primaryColor || '#0f766e';
    const dark = '#1e293b';
    const gray = '#64748b';
    const light = '#f8fafc';

    // Header background
    doc.rect(0, 0, doc.page.width, 120).fill(primary);

    // Clinic name
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
      .text(clinic?.name || 'The Smile Expert', 50, 35);
    doc.fontSize(10).font('Helvetica')
      .text(clinic?.tagline || 'Premium Dental Care Portal', 50, 62);
    doc.text(clinic?.address || 'Dental Clinic, Lahore', 50, 76);
    doc.text(`${clinic?.phone || '+92 42 111 764 533'}  |  ${clinic?.email || 'care@thesmileexpert.com'}`, 50, 90);

    // INVOICE label
    doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
      .text('INVOICE', 370, 40, { align: 'right', width: 175 });
    doc.fontSize(11).font('Helvetica')
      .text(invoice.invoiceNo, 370, 75, { align: 'right', width: 175 });

    // Status badge area
    const statusColors = { paid: '#22c55e', pending: '#f59e0b', refunded: '#64748b', cancelled: '#ef4444' };
    const statusColor = statusColors[invoice.status] || '#64748b';
    doc.rect(370, 90, 175, 22).fill(statusColor);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
      .text(invoice.status.toUpperCase(), 370, 95, { align: 'center', width: 175 });

    // Reset y
    doc.y = 140;

    // Bill To + Invoice Details
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('BILL TO', 50, 145);
    doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text(client?.name || 'Client', 50, 160);
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(`${client?.patientNo ? `Patient No: ${client.patientNo}` : ''}`, 50, 175)
      .text(client?.phone || '', 50, 188)
      .text(client?.email || '', 50, 201);

    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('INVOICE DATE', 370, 145);
    doc.fillColor(gray).fontSize(10).font('Helvetica')
      .text(new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-PK'), 370, 160);

    if (invoice.dueDate) {
      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('DUE DATE', 370, 178);
      doc.fillColor(gray).fontSize(10).font('Helvetica').text(invoice.dueDate, 370, 193);
    }

    if (invoice.paymentMethod) {
      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('PAYMENT METHOD', 460, 145);
      doc.fillColor(gray).fontSize(10).font('Helvetica').text(invoice.paymentMethod, 460, 160);
    }

    // Divider
    doc.moveTo(50, 215).lineTo(545, 215).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Table header
    doc.rect(50, 225, 495, 28).fill(primary);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, 234)
      .text('QTY', 340, 234, { width: 60, align: 'center' })
      .text('UNIT PRICE', 400, 234, { width: 90, align: 'right' })
      .text('TOTAL', 490, 234, { width: 55, align: 'right' });

    // Table rows
    let items = [];
    try { items = JSON.parse(invoice.items || '[]'); } catch (_) {}

    let rowY = 255;
    items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, rowY - 4, 495, 24).fill('#f8fafc');
      doc.fillColor(dark).fontSize(10).font('Helvetica')
        .text(item.name || item.description || 'Service', 60, rowY)
        .text(String(item.qty || 1), 340, rowY, { width: 60, align: 'center' })
        .text(`PKR ${Number(item.unitPrice || item.price || 0).toLocaleString()}`, 400, rowY, { width: 90, align: 'right' })
        .text(`PKR ${Number(item.total || (item.qty || 1) * (item.unitPrice || item.price || 0)).toLocaleString()}`, 490, rowY, { width: 55, align: 'right' });
      rowY += 24;
    });

    // Totals
    const totalsY = rowY + 15;
    doc.moveTo(50, totalsY - 5).lineTo(545, totalsY - 5).strokeColor('#e2e8f0').lineWidth(1).stroke();

    const addTotalRow = (label, value, bold = false, y) => {
      doc.fillColor(bold ? dark : gray)
        .fontSize(bold ? 12 : 10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 380, y)
        .text(value, 490, y, { width: 55, align: 'right' });
    };

    addTotalRow('Subtotal', `PKR ${Number(invoice.subtotal || 0).toLocaleString()}`, false, totalsY);
    let offset = 18;
    if (invoice.discount > 0) {
      addTotalRow(`Discount`, `-PKR ${Number(invoice.discount || 0).toLocaleString()}`, false, totalsY + 18);
      offset += 18;
    }
    if (invoice.tax > 0) {
      addTotalRow('Tax', `PKR ${Number(invoice.tax || 0).toLocaleString()}`, false, totalsY + offset);
      offset += 18;
    }
    if (invoice.previousBalance > 0) {
      addTotalRow('Previous Due', `PKR ${Number(invoice.previousBalance || 0).toLocaleString()}`, false, totalsY + offset);
      offset += 18;
    }

    const totalY = totalsY + offset + 10;
    doc.rect(370, totalY - 4, 175, 30).fill(primary);
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('TOTAL', 380, totalY + 4)
      .text(`PKR ${Number(invoice.grandTotal || invoice.total || 0).toLocaleString()}`, 430, totalY + 4, { width: 110, align: 'right' });

    addTotalRow('Paid', `PKR ${Number(invoice.amountPaid || 0).toLocaleString()}`, false, totalY + 40);
    addTotalRow('Balance Due', `PKR ${Number(invoice.balanceDue || 0).toLocaleString()}`, true, totalY + 58);

    // Notes
    if (invoice.notes) {
      doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('Notes:', 50, totalY + 50);
      doc.fillColor(gray).fontSize(10).font('Helvetica').text(invoice.notes, 50, totalY + 65);
    }

    // Footer
    const footerY = doc.page.height - 80;
    doc.rect(0, footerY, doc.page.width, 80).fill(light);
    doc.moveTo(50, footerY + 2).lineTo(545, footerY + 2).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.fillColor(gray).fontSize(9).font('Helvetica')
      .text(clinic?.invoiceFooter || 'Thank you for choosing The Smile Expert. For queries, contact us at the details above.', 50, footerY + 15, { align: 'center', width: 495 })
      .text(clinic?.paymentTerms || 'This is a computer-generated invoice and does not require a physical signature.', 50, footerY + 30, { align: 'center', width: 495 });
    doc.fillColor(primary).fontSize(9).font('Helvetica-Bold')
      .text(`${clinic?.name || 'The Smile Expert'} - Dental Clinic Portal`, 50, footerY + 50, { align: 'center', width: 495 });

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
