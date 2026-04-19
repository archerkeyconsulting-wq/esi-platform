// pages/api/generate-pdf.ts
// Next.js API route for deterministic ESI PDF generation

import { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit'; // Install with: npm install pdfkit
import { mapToPDFLayout, PDFLayout } from '../../lib/pdf-layout-mapper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const input = req.body; // Validate input in production
    const layout = mapToPDFLayout(input);

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="esi-assessment.pdf"');

    // Pipe PDF to response
    doc.pipe(res);

    // Render layout (separated from mapping)
    renderPDFLayout(doc, layout);

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

// Rendering function (separate from data transformation)
function renderPDFLayout(doc: PDFKit.PDFDocument, layout: PDFLayout) {
  let y = 50; // Starting Y position

  // Header
  doc.fontSize(20).text(layout.header.title, 50, y);
  y += 30;
  doc.fontSize(12).text(`Organization: ${layout.header.organization}`, 50, y);
  y += 20;
  doc.text(`Assessment Date: ${layout.header.assessmentDate}`, 50, y);
  y += 20;
  doc.text(`Model Version: ${layout.header.modelVersion}`, 50, y);
  y += 40;

  // Assessment Summary
  doc.fontSize(16).text('Assessment Summary', 50, y);
  y += 20;
  doc.fontSize(10).text(layout.summary, 50, y, { width: 500 });
  y += 60;

  // Domain Scores
  doc.fontSize(16).text('Domain Scores', 50, y);
  y += 20;
  layout.domainScores.forEach(score => {
    doc.fontSize(10).text(`${score.domain}: ${score.score}/100`, 50, y);
    y += 15;
  });
  y += 20;

  // Risk Band
  doc.fontSize(16).text('Risk Classification', 50, y);
  y += 20;
  doc.fontSize(10).text(`Band: ${layout.riskBand}`, 50, y);
  y += 40;

  // Prescriptions (if Full mode)
  if (layout.mode === 'full' && layout.prescriptions.length > 0) {
    doc.fontSize(16).text('Recommended Prescriptions', 50, y);
    y += 20;
    layout.prescriptions.forEach((prescription, index) => {
      doc.fontSize(10).text(`${index + 1}. ${prescription.title}`, 50, y);
      y += 15;
      doc.fontSize(8).text(`   Priority: ${prescription.priority} | Time Horizon: ${prescription.timeHorizon} days`, 50, y);
      y += 10;
      doc.text(`   Success Condition: ${prescription.successCondition}`, 50, y);
      y += 15;
    });
    y += 20;
  }

  // Audit Footer (always at bottom)
  const footerY = doc.page.height - 100;
  doc.fontSize(8).text('Audit Information:', 50, footerY);
  doc.text(`Model Version: ${layout.audit.modelVersion}`, 50, footerY + 10);
  doc.text(`Question Set Version: ${layout.audit.questionSetVersion}`, 50, footerY + 20);
  doc.text(`Generated At: ${layout.audit.generatedAt}`, 50, footerY + 30);
  doc.text(`Confidence Index: ${layout.audit.confidenceIndex}/100`, 50, footerY + 40);
}