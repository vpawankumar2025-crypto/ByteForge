// PDF generation for invoices, offer letters, and certificates, using pdfkit.
// Each function resolves with a Buffer you can attach to an email or save to disk.

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const COMPANY_NAME = process.env.COMPANY_NAME || 'ByteForge';
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS || 'Chennai, Tamil Nadu, India';
const COMPANY_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'hello@byteforge.dev';
const SITE_URL = process.env.SITE_URL || 'https://byteforge.example.com';

const INK = '#0F1219';
const AMBER = '#F5A623';
const TEAL = '#0E9C8C';
const MUTED = '#6B7280';
const LINE = '#E2E5EA';

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// Draws a simple geometric logo mark (rounded hexagon with a "B") — no external
// image assets needed, and it's our own mark, not borrowed from anyone else.
function drawLogoMark(doc, x, y, size) {
  const s = size;
  doc.save();
  doc.polygon(
    [x + s * 0.25, y], [x + s * 0.75, y], [x + s, y + s * 0.5],
    [x + s * 0.75, y + s], [x + s * 0.25, y + s], [x, y + s * 0.5]
  ).fill(INK);
  doc.fontSize(s * 0.55).font('Helvetica-Bold').fillColor('#FFFFFF')
    .text('B', x, y + s * 0.22, { width: s, align: 'center' });
  doc.restore();
}

function drawWordmark(doc, x, y, fontSize) {
  doc.font('Helvetica-Bold').fontSize(fontSize).fillColor(INK).text('ByteForge', x, y);
}

// Our own verification badge — honest about what it actually is (a digitally
// verifiable record on our own site), not an imitation of any third-party
// accreditation body's seal.
function drawVerifiedBadge(doc, x, y, w) {
  doc.save();
  doc.roundedRect(x, y, w, 30, 6).lineWidth(1).strokeColor(TEAL).stroke();
  // Small hand-drawn checkmark (unicode ✓ isn't in the standard PDF font encoding)
  doc.save();
  doc.lineWidth(1.4).strokeColor(TEAL);
  doc.moveTo(x + 12, y + 15).lineTo(x + 15.5, y + 19).lineTo(x + 22, y + 11).stroke();
  doc.restore();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEAL)
    .text('DIGITALLY VERIFIABLE', x + 26, y + 10, { width: w - 30, align: 'left' });
  doc.restore();
}

// Circular seal used near signatures — drawn, not a scanned stamp.
function drawSeal(doc, cx, cy, r) {
  doc.save();
  doc.circle(cx, cy, r).lineWidth(1.3).strokeColor(AMBER).stroke();
  doc.circle(cx, cy, r - 4).lineWidth(0.6).strokeColor(AMBER).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(AMBER)
    .text('BYTEFORGE', cx - r + 6, cy - 10, { width: (r - 6) * 2, align: 'center' });
  doc.fontSize(5.5).font('Helvetica').fillColor(AMBER)
    .text('VERIFIED PROGRAM', cx - r + 6, cy, { width: (r - 6) * 2, align: 'center' });
  doc.restore();
}

function drawLetterhead(doc) {
  drawLogoMark(doc, 50, 44, 26);
  drawWordmark(doc, 84, 48, 15);
  doc.fontSize(8).font('Helvetica').fillColor(MUTED).text(COMPANY_ADDRESS, 84, 66);
  drawVerifiedBadge(doc, 400, 46, 145);
  doc.moveTo(50, 92).lineTo(545, 92).lineWidth(2).strokeColor(AMBER).stroke();
}

/**
 * @param {{invoiceNumber:string, date:string, studentName:string, studentEmail:string, courseName:string, amount:number}} data
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(data) {
  const doc = new PDFDocument({ margin: 50 });
  drawLetterhead(doc);
  doc.x = 50; doc.y = 112;

  doc.fontSize(16).fillColor(INK).font('Helvetica-Bold').text('Invoice', { align: 'right' });
  doc.fontSize(10).font('Helvetica').fillColor(MUTED).text(`Invoice #: ${data.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${data.date}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor(INK).font('Helvetica-Bold').text('Billed to:');
  doc.fontSize(10).font('Helvetica').fillColor('#333333').text(data.studentName);
  doc.text(data.studentEmail);
  doc.moveDown(1.5);

  const tableTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(INK);
  doc.text('Description', 50, tableTop, { width: 350 });
  doc.text('Amount', 420, tableTop, { width: 100, align: 'right' });
  doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor(LINE).stroke();
  doc.moveDown(0.7);

  doc.font('Helvetica').fillColor('#333333').text(data.courseName, 50, doc.y, { width: 350 });
  doc.text(`Rs. ${data.amount}`, 420, doc.y - 12, { width: 100, align: 'right' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(LINE).stroke();
  doc.moveDown(0.7);

  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text(`Total Paid: Rs. ${data.amount}`, { align: 'right' });
  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica').fillColor(MUTED).text('This is a computer-generated invoice and does not require a signature.', { align: 'center' });

  return streamToBuffer(doc);
}

/**
 * Internship offer letter, generated from the student's own submitted details.
 * @param {{offerId:string, studentName:string, email:string, contact:string, college:string, regNo:string, courseName:string, startDate:string, endDate:string, duration:string, issuedDate:string, signature:string}} data
 * @returns {Promise<Buffer>}
 */
async function generateOfferLetterPDF(data) {
  const doc = new PDFDocument({ margin: 50 });
  drawLetterhead(doc);
  doc.x = 50; doc.y = 108;

  doc.fontSize(8.5).font('Helvetica').fillColor(MUTED).text(`Offer Letter ID: ${data.offerId}`, { align: 'right' });
  doc.text(`Date of Issue: ${data.issuedDate}`, { align: 'right' });
  doc.moveDown(1);

  doc.fontSize(20).font('Helvetica-Bold').fillColor(INK).text('INTERNSHIP OFFER LETTER', { align: 'center', characterSpacing: 0.5 });
  doc.moveDown(1.3);

  doc.fontSize(10.5).font('Helvetica').fillColor('#2A2E36');
  doc.text(`Dear ${data.studentName},`, 50, doc.y, { width: 495 });
  doc.moveDown(0.8);
  doc.text(
    `We are pleased to offer you a position as ${data.courseName} Intern at ${COMPANY_NAME}, a project-based ` +
    `learning platform dedicated to helping students build real, portfolio-ready skills. This internship is ` +
    `scheduled to run from ${data.startDate} to ${data.endDate} (approximately ${data.duration}), and will ` +
    `involve mentor-guided, hands-on project work in the relevant field.`,
    50, doc.y, { width: 495, align: 'justify' }
  );
  doc.moveDown(1.1);

  // Details section with amber accent bar
  const detailsTop = doc.y;
  doc.rect(50, detailsTop, 3, 20).fill(AMBER);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(INK).text('Internship Details', 62, detailsTop + 2);
  doc.moveDown(0.9);

  const bullets = [
    ['Designation', `${data.courseName} Intern`],
    ['Mode', 'Remote / Online'],
    ['Duration', `${data.startDate} to ${data.endDate}`],
    ['Reporting To', 'Assigned Project Mentor'],
  ];
  bullets.forEach(([label, value]) => {
    const y = doc.y;
    doc.circle(54, y + 5, 2).fill(AMBER);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(`${label}: `, 64, y, { continued: true, width: 481 });
    doc.font('Helvetica').fillColor('#2A2E36').text(value);
    doc.moveDown(0.55);
  });

  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(10.5).fillColor('#2A2E36').text(
    `This program provides an immersive, project-based experience to help you gain industry-relevant skills. ` +
    `On successful completion of the required modules, you will be eligible to claim a certificate of completion, ` +
    `independently verifiable on our website using this offer letter ID or the certificate ID issued at that time.`,
    50, doc.y, { width: 495, align: 'justify' }
  );
  doc.moveDown(0.9);
  doc.text('If you accept this offer, please continue your coursework on our platform. We look forward to working with you.', 50, doc.y, { width: 495 });
  doc.moveDown(2.2);

  // Signature block
  const sigY = doc.y;
  drawSeal(doc, 90, sigY + 22, 32);
  doc.font('Helvetica-Oblique').fontSize(14).fillColor(INK).text(data.signature || data.studentName, 150, sigY, { width: 200 });
  doc.moveTo(150, doc.y + 4).lineTo(370, doc.y + 4).strokeColor('#999999').stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Digitally signed by intern', 150, doc.y + 8, { width: 220 });

  doc.font('Helvetica-Oblique').fontSize(14).fillColor(INK).text(`${COMPANY_NAME} Team`, 380, sigY, { width: 165 });
  doc.moveTo(380, doc.y + 4).lineTo(545, doc.y + 4).strokeColor('#999999').stroke();
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Program Director', 380, doc.y + 8, { width: 165 });
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(COMPANY_NAME, 380, doc.y, { width: 165 });

  const footerY = doc.page.height - 85;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(LINE).stroke();
  doc.fontSize(7.5).font('Helvetica').fillColor(MUTED).text(
    `${SITE_URL.replace(/^https?:\/\//, '')}  \u00b7  ${COMPANY_EMAIL}  \u00b7  Verify this letter anytime at ${SITE_URL.replace(/^https?:\/\//, '')}/?verify=${data.offerId}`,
    50, footerY + 10, { width: 495, align: 'center' }
  );
  doc.fontSize(7).fillColor('#AAAAAA').text(
    'This is a computer-generated document based on details submitted by the intern and does not require a physical signature.',
    50, footerY + 24, { width: 495, align: 'center' }
  );

  return streamToBuffer(doc);
}

/**
 * Internship/course completion certificate with an embedded QR code that links
 * to the public verification page.
 * @param {{certId:string, studentName:string, email:string, contact:string, college:string, regNo:string, courseName:string, startDate:string, endDate:string, issuedDate:string, signature:string}} data
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePDF(data) {
  const verifyUrl = `${SITE_URL}/?verify=${encodeURIComponent(data.certId)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape' });
  const W = doc.page.width, H = doc.page.height;

  // Decorative border
  doc.rect(18, 18, W - 36, H - 36).lineWidth(2.5).strokeColor(AMBER).stroke();
  doc.rect(26, 26, W - 52, H - 52).lineWidth(0.75).strokeColor(INK).stroke();

  // Header: logo mark top-left, verified badge top-right
  drawLogoMark(doc, 55, 45, 28);
  drawWordmark(doc, 90, 50, 16);
  doc.fontSize(7.5).font('Helvetica').fillColor(MUTED).text(COMPANY_ADDRESS, 90, 69);
  drawVerifiedBadge(doc, W - 200, 47, 145);

  doc.moveTo(55, 92).lineTo(W - 55, 92).lineWidth(1).strokeColor(LINE).stroke();

  // Two-column title block: big stacked "CERTIFICATE / OF COMPLETION" on the
  // left, divider, "awarded to [Name]" on the right — mirrors a familiar,
  // professional certificate layout using only our own content.
  const titleTop = 120;
  doc.fontSize(30).font('Helvetica-Bold').fillColor(INK).text('CERTIFICATE', 55, titleTop, { width: 230, lineGap: -4 });
  doc.fontSize(15).font('Helvetica-Bold').fillColor(MUTED).text('OF COMPLETION', 55, doc.y, { width: 230 });

  doc.moveTo(300, titleTop).lineTo(300, titleTop + 80).strokeColor(LINE).stroke();

  doc.fontSize(11).font('Helvetica').fillColor(MUTED).text('This certificate is awarded to', 320, titleTop + 4, { width: W - 375 });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(INK).text(data.studentName, 320, doc.y + 4, { width: W - 375 });

  let y = titleTop + 110;
  doc.fontSize(11).font('Helvetica-BoldOblique').fillColor(INK).text(`From ${COMPANY_NAME}`, 55, y, { width: W - 110, align: 'center' });
  y = doc.y + 6;
  doc.fontSize(10.5).font('Helvetica').fillColor('#2A2E36').text(
    `In recognition of their effort and achievement in completing the`,
    55, y, { width: W - 110, align: 'center' }
  );
  y = doc.y + 2;
  doc.fontSize(14).font('Helvetica-Bold').fillColor(INK).text(data.courseName, 55, y, { width: W - 110, align: 'center' });
  y = doc.y + 2;
  doc.fontSize(10.5).font('Helvetica').fillColor('#2A2E36').text(
    `Conducted from ${data.startDate} to ${data.endDate}`, 55, y, { width: W - 110, align: 'center' }
  );

  // Footer: seal (left), QR + cert ID (center), signature (right)
  const footerY = H - 150;
  drawSeal(doc, 105, footerY + 35, 34);

  const qrX = W / 2 - 42;
  doc.image(qrBuffer, qrX, footerY - 5, { width: 84 });
  doc.fontSize(7.5).fillColor(MUTED).font('Helvetica').text('Scan to verify', qrX, footerY + 80, { width: 84, align: 'center' });
  doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold').text(`Certificate ID: ${data.certId}`, 0, footerY + 92, { width: W, align: 'center' });

  const sigX = W - 220;
  doc.font('Helvetica-Oblique').fontSize(15).fillColor(INK).text(`${COMPANY_NAME} Team`, sigX, footerY + 10, { width: 165 });
  doc.moveTo(sigX, doc.y + 4).lineTo(sigX + 165, doc.y + 4).strokeColor('#999999').stroke();
  doc.fontSize(8.5).font('Helvetica').fillColor('#333333').text('Program Director', sigX, doc.y + 8, { width: 165 });
  doc.fontSize(7.5).fillColor(MUTED).text(COMPANY_NAME, sigX, doc.y, { width: 165 });

  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(MUTED).text(
    `Digitally signed & accepted by: ${data.signature || data.studentName}  \u00b7  Register No: ${data.regNo}  \u00b7  Issued: ${data.issuedDate}`,
    55, H - 40, { width: W - 110, align: 'center' }
  );

  return streamToBuffer(doc);
}

module.exports = { generateInvoicePDF, generateOfferLetterPDF, generateCertificatePDF };
