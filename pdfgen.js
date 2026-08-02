// PDF generation for invoices and offer letters, using pdfkit.
// Each function resolves with a Buffer you can attach to an email or save to disk.

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const COMPANY_NAME = process.env.COMPANY_NAME || 'ByteForge';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'Chennai, Tamil Nadu, India';
const COMPANY_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'hello@byteforge.dev';
const SITE_URL = process.env.SITE_URL || 'https://byteforge.example.com';

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function drawLetterhead(doc) {
  doc.fontSize(18).fillColor('#0F1219').text(COMPANY_NAME, { continued: false });
  doc.fontSize(9).fillColor('#666666').text(COMPANY_ADDRESS);
  doc.text(COMPANY_EMAIL);
  doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#DDDDDD').stroke();
  doc.moveDown(1.5);
}

/**
 * @param {{invoiceNumber:string, date:string, studentName:string, studentEmail:string, courseName:string, amount:number}} data
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(data) {
  const doc = new PDFDocument({ margin: 50 });
  drawLetterhead(doc);

  doc.fontSize(16).fillColor('#0F1219').text('Invoice', { align: 'right' });
  doc.fontSize(10).fillColor('#666666').text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${data.date}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor('#0F1219').text('Billed to:');
  doc.fontSize(10).fillColor('#333333').text(data.studentName);
  doc.text(data.studentEmail);
  doc.moveDown(1.5);

  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#0F1219');
  doc.text('Description', 50, tableTop, { width: 350 });
  doc.text('Amount', 420, tableTop, { width: 100, align: 'right' });
  doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#DDDDDD').stroke();
  doc.moveDown(0.7);

  doc.fillColor('#333333').text(data.courseName, 50, doc.y, { width: 350 });
  doc.text(`Rs. ${data.amount}`, 420, doc.y - 12, { width: 100, align: 'right' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DDDDDD').stroke();
  doc.moveDown(0.7);

  doc.fontSize(12).fillColor('#0F1219').text(`Total Paid: Rs. ${data.amount}`, { align: 'right' });
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#999999').text('This is a computer-generated invoice and does not require a signature.', { align: 'center' });

  return streamToBuffer(doc);
}

/**
 * Internship offer letter, generated from the student's own submitted details
 * (name, college, register no, domain, start/end dates) — not auto-filled.
 * @param {{offerId:string, studentName:string, email:string, contact:string, college:string, regNo:string, courseName:string, startDate:string, endDate:string, duration:string, issuedDate:string}} data
 * @returns {Promise<Buffer>}
 */
async function generateOfferLetterPDF(data) {
  const doc = new PDFDocument({ margin: 50 });
  drawLetterhead(doc);

  doc.fontSize(9).fillColor('#999999').text(`Offer Letter ID: ${data.offerId}`, { align: 'right' });
  doc.text(`Issued: ${data.issuedDate}`, { align: 'right' });
  doc.moveDown(1);
  doc.fontSize(18).fillColor('#0F1219').text('Internship Offer Letter', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(10).fillColor('#333333');
  doc.text(`Dear ${data.studentName},`);
  doc.moveDown(1);
  doc.text(
    `We are pleased to offer you a position in our "${data.courseName}" internship track. ` +
    `This internship is scheduled to run from ${data.startDate} to ${data.endDate} ` +
    `(approximately ${data.duration}), and will involve project-based, mentor-guided work in the relevant field.`,
    { align: 'justify' }
  );
  doc.moveDown(1);

  doc.fontSize(11).fillColor('#0F1219').text('Intern Details');
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#DDDDDD').stroke();
  doc.moveDown(0.6);
  doc.fontSize(10).fillColor('#333333');
  const rows = [
    ['Name', data.studentName],
    ['Email', data.email],
    ['Contact No.', data.contact],
    ['College', data.college],
    ['Register No.', data.regNo],
    ['Internship Domain', data.courseName],
    ['Duration', `${data.startDate} to ${data.endDate}`],
  ];
  rows.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(label, 50, doc.y, { width: 150, continued: false });
    doc.font('Helvetica').text(value, 210, doc.y - doc.currentLineHeight(), { width: 335 });
    doc.moveDown(0.4);
  });

  doc.moveDown(1);
  doc.font('Helvetica').text(
    `This letter confirms your enrollment and serves as your official internship offer. On ` +
    `successful completion of the required modules and evaluations, you will be eligible to ` +
    `generate a certificate of completion, independently verifiable on our website using this ` +
    `offer letter ID or the certificate ID issued at that time.`,
    50, doc.y, { width: 495, align: 'justify' }
  );
  doc.moveDown(1);
  doc.text('We look forward to working with you.', 50, doc.y, { width: 495 });
  doc.moveDown(2);
  doc.text('Sincerely,', 50, doc.y, { width: 495 });
  doc.text(`${COMPANY_NAME} Team`, 50, doc.y, { width: 495 });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999999').text(
    'This is a computer-generated document based on details submitted by the intern and does not require a physical signature.',
    { align: 'center' }
  );

  return streamToBuffer(doc);
}

/**
 * Internship/course completion certificate with an embedded QR code that links
 * to the public verification page.
 * @param {{certId:string, studentName:string, email:string, contact:string, college:string, regNo:string, courseName:string, startDate:string, endDate:string, issuedDate:string}} data
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePDF(data) {
  const verifyUrl = `${SITE_URL}/?verify=${encodeURIComponent(data.certId)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });

  // Decorative border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(2).strokeColor('#F5A623').stroke();
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).lineWidth(0.75).strokeColor('#0F1219').stroke();

  doc.fontSize(11).fillColor('#666666').text(COMPANY_NAME.toUpperCase(), 0, 55, { align: 'center', characterSpacing: 2 });
  doc.fontSize(26).fillColor('#0F1219').font('Helvetica-Bold').text('Certificate of Completion', 0, 80, { align: 'center' });
  doc.moveDown(1.2);

  doc.fontSize(11).font('Helvetica').fillColor('#666666').text('This is to certify that', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F1219').text(data.studentName, { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(11).font('Helvetica').fillColor('#666666').text(
    `of ${data.college} has successfully completed the`, { align: 'center' }
  );
  doc.moveDown(0.3);
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0F1219').text(data.courseName, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10.5).font('Helvetica').fillColor('#666666').text(
    `internship program, conducted from ${data.startDate} to ${data.endDate}.`, { align: 'center' }
  );

  const footerY = doc.page.height - 130;
  doc.image(qrBuffer, doc.page.width - 175, footerY - 15, { width: 90 });
  doc.fontSize(7.5).fillColor('#999999').text('Scan to verify', doc.page.width - 175, footerY + 78, { width: 90, align: 'center' });

  doc.fontSize(9).fillColor('#333333').text(`Certificate ID: ${data.certId}`, 70, footerY + 10);
  doc.text(`Register No: ${data.regNo}`, 70, footerY + 26);
  doc.text(`Issued: ${data.issuedDate}`, 70, footerY + 42);

  doc.moveTo(70, footerY + 70).lineTo(260, footerY + 70).strokeColor('#999999').stroke();
  doc.fontSize(9).text(`${COMPANY_NAME} Team`, 70, footerY + 76);
  doc.fontSize(7.5).fillColor('#999999').text('Authorized Signatory', 70, footerY + 90);

  return streamToBuffer(doc);
}

module.exports = { generateInvoicePDF, generateOfferLetterPDF, generateCertificatePDF };
