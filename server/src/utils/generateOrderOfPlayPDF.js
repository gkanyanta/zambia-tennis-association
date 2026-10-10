import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { technicalTeamLine } from './pdfBranding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A4 portrait dimensions
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Header: space kept for the ZTA logo on the left, partner logo tiles on the right
const ZTA_LOGO_SPACE = 92;
const PARTNER_LOGO_W = 64;

const COLORS = {
  primary: '#1F2937',
  secondary: '#6B7280',
  accent: '#2563EB',
  border: '#D1D5DB',
  lightBg: '#F3F4F6',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  courtBg: '#EFF6FF',
  courtText: '#1E40AF',
  notBefore: '#B45309',
};

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString('en-GB', opts);
  }
  return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${e.toLocaleDateString('en-GB', opts)}`;
}

/**
 * Render standard page header with tournament info.
 * Returns Y position after header.
 */
function renderPageHeader(doc, tournament) {
  const logoPath = path.join(__dirname, '../assets/zta-logo.png');
  const HEADER_H = 55;

  // Header background
  doc.save();
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, HEADER_H).fill(COLORS.headerBg);
  doc.restore();

  // ZTA logo on the left
  try {
    doc.image(logoPath, MARGIN + 8, MARGIN + 8, { height: 40 });
  } catch (e) {
    // Logo not available
  }

  // Co-organiser / sponsor logos on the right, in white tiles on the same line
  // as the ZTA logo (same layout as the draw PDF header)
  const logos = doc._partnerLogos || [];
  let rightSpace = 0;
  for (let i = 0; i < logos.length; i++) {
    const x = MARGIN + CONTENT_WIDTH - 8 - (logos.length - i) * (PARTNER_LOGO_W + 6) + 6;
    doc.save();
    doc.rect(x, MARGIN + 6, PARTNER_LOGO_W, HEADER_H - 12).fill('#FFFFFF');
    try {
      doc.image(logos[i].buffer, x + 2, MARGIN + 8, { fit: [PARTNER_LOGO_W - 4, HEADER_H - 16], align: 'center', valign: 'center' });
    } catch (e) {
      // Unreadable image — leave the tile blank
    }
    doc.restore();
    rightSpace += PARTNER_LOGO_W + 6;
  }
  if (logos.length) rightSpace += 8;

  // Text sits between the logos: centred on the page when that leaves enough
  // room, otherwise in the space left between the two logo areas
  const side = Math.max(ZTA_LOGO_SPACE, rightSpace);
  let textX = MARGIN + side;
  let textW = CONTENT_WIDTH - 2 * side;
  if (textW < 260) {
    textX = MARGIN + ZTA_LOGO_SPACE;
    textW = CONTENT_WIDTH - ZTA_LOGO_SPACE - rightSpace;
  }
  // Shrink a line's font until it fits on one line
  const fitText = (text, font, size, minSize, y) => {
    doc.font(font);
    let fs = size;
    while (fs > minSize && doc.fontSize(fs).widthOfString(text) > textW) fs -= 0.5;
    // Still too wide at the smallest size: cut it short with an ellipsis rather than wrap
    const fits = doc.fontSize(fs).widthOfString(text) <= textW;
    doc.fillColor(COLORS.headerText).text(text, textX, y, fits
      ? { width: textW, align: 'center', lineBreak: false }
      : { width: textW, align: 'center', height: fs + 1, ellipsis: true });
  };

  const dateStr = formatDateRange(tournament.startDate, tournament.endDate);
  const venue = [tournament.venue, tournament.city].filter(Boolean).join(', ');
  doc.save();
  fitText(tournament.name, 'Helvetica-Bold', 14, 8, MARGIN + 6);
  fitText('Order of Play', 'Helvetica', 10, 8, MARGIN + 24);
  fitText(`${venue}  |  ${dateStr}  |  Zambia Tennis Association`, 'Helvetica', 7, 5, MARGIN + 40);
  doc.restore();

  return MARGIN + 65;
}

/**
 * Render page footer
 */
function renderFooter(doc, tournament) {
  doc.save();
  const team = technicalTeamLine(tournament);
  if (team) {
    doc
      .fontSize(7.5)
      .fillColor(COLORS.primary)
      .font('Helvetica')
      .text(team, MARGIN, PAGE_HEIGHT - MARGIN - 27, { width: CONTENT_WIDTH, align: 'center', lineBreak: false });
  }
  doc
    .fontSize(7)
    .fillColor(COLORS.secondary)
    .font('Helvetica')
    .text(
      `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — Zambia Tennis Association`,
      MARGIN,
      PAGE_HEIGHT - MARGIN - 15,
      { width: CONTENT_WIDTH, align: 'center' }
    );
  doc.restore();
}

/**
 * Build a match label string from tournament data
 */
function getMatchLabel(tournament, categoryId, matchId) {
  const category = tournament.categories.id(categoryId);
  if (!category || !category.draw) return `Match ${matchId}`;

  let match = category.draw.matches.id(matchId);
  if (!match && category.draw.roundRobinGroups) {
    for (const group of category.draw.roundRobinGroups) {
      match = group.matches.id(matchId);
      if (match) break;
    }
  }
  if (!match) match = category.draw.knockoutStage?.matches?.id(matchId);
  let isQualifying = false;
  if (!match) {
    match = category.draw.qualifyingStage?.matches?.id(matchId);
    isQualifying = !!match;
  }

  if (!match) return `${category.name}: Match TBD`;

  const p1 = match.player1?.name || 'TBD';
  const p2 = match.player2?.name || 'TBD';
  const round = isQualifying
    ? (category.draw.qualifyingStage.label || 'Qualifying')
    : match.roundName || `R${match.round}`;

  return `${category.name} ${round}: ${p1} vs ${p2}`;
}

/**
 * Generate an Order of Play PDF.
 * @param {Object} tournament - The tournament document
 * @returns {Promise<Buffer>} - PDF buffer
 */
// `partnerLogos` are loaded logo buffers (see pdfBranding.loadPartnerLogos).
export const generateOrderOfPlayPDF = (tournament, { partnerLogos = [] } = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: MARGIN
      });
      doc._partnerLogos = partnerLogos;

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Group slots by day
      const slotsByDay = {};
      for (const slot of tournament.orderOfPlay) {
        const dayKey = new Date(slot.day).toISOString().split('T')[0];
        if (!slotsByDay[dayKey]) slotsByDay[dayKey] = [];
        slotsByDay[dayKey].push(slot);
      }

      const sortedDays = Object.keys(slotsByDay).sort();
      // leave room for the footer (and the technical team line above it)
      const bottomLimit = PAGE_HEIGHT - MARGIN - (technicalTeamLine(tournament) ? 42 : 30);

      let isFirstPage = true;

      for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
        const dayKey = sortedDays[dayIdx];
        const slots = slotsByDay[dayKey];

        // Sort courts alphabetically
        slots.sort((a, b) => a.court.localeCompare(b.court));

        if (!isFirstPage) {
          doc.addPage();
        }

        let y = renderPageHeader(doc, tournament);
        renderFooter(doc, tournament);
        isFirstPage = false;

        // Day heading
        y += 8;
        doc.save();
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text(formatDate(dayKey + 'T00:00:00'), MARGIN, y);
        doc.restore();
        y += 22;

        // Horizontal rule under day heading
        doc.save();
        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).lineWidth(1).stroke();
        doc.restore();
        y += 10;

        for (let courtIdx = 0; courtIdx < slots.length; courtIdx++) {
          const slot = slots[courtIdx];

          // Skip empty courts
          if (!slot.matches || slot.matches.length === 0) continue;

          // Estimate space needed: court header (25) + matches * 22 + spacing
          const neededHeight = 30 + slot.matches.length * 24 + 15;

          // Page break if not enough room
          if (y + neededHeight > bottomLimit) {
            doc.addPage();
            y = renderPageHeader(doc, tournament);
            renderFooter(doc, tournament);

            // Re-render day heading on new page
            y += 8;
            doc.save();
            doc
              .fontSize(13)
              .font('Helvetica-Bold')
              .fillColor(COLORS.primary)
              .text(formatDate(dayKey + 'T00:00:00') + ' (cont.)', MARGIN, y);
            doc.restore();
            y += 22;

            doc.save();
            doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).lineWidth(1).stroke();
            doc.restore();
            y += 10;
          }

          // Court header bar
          doc.save();
          doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill(COLORS.courtBg);
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(COLORS.courtText)
            .text(slot.court, MARGIN + 10, y + 5, {
              width: CONTENT_WIDTH - 20,
              lineBreak: false,
            });
          doc.restore();
          y += 28;

          // Matches
          for (let i = 0; i < slot.matches.length; i++) {
            const entry = slot.matches[i];
            const label = getMatchLabel(tournament, entry.categoryId, entry.matchId);

            // "followed by" separator
            if (i > 0) {
              doc.save();
              doc
                .fontSize(7)
                .font('Helvetica-Oblique')
                .fillColor(COLORS.secondary)
                .text('followed by', MARGIN + 28, y);
              doc.restore();
              y += 12;

              // Check for page break mid-court
              if (y + 24 > bottomLimit) {
                doc.addPage();
                y = renderPageHeader(doc, tournament);
                renderFooter(doc, tournament);
                y += 8;
                doc.save();
                doc
                  .fontSize(13)
                  .font('Helvetica-Bold')
                  .fillColor(COLORS.primary)
                  .text(formatDate(dayKey + 'T00:00:00') + ' (cont.)', MARGIN, y);
                doc.restore();
                y += 22;
                doc.save();
                doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(COLORS.border).lineWidth(1).stroke();
                doc.restore();
                y += 10;

                // Re-render court heading
                doc.save();
                doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill(COLORS.courtBg);
                doc
                  .fontSize(10)
                  .font('Helvetica-Bold')
                  .fillColor(COLORS.courtText)
                  .text(slot.court + ' (cont.)', MARGIN + 10, y + 5, {
                    width: CONTENT_WIDTH - 20,
                    lineBreak: false,
                  });
                doc.restore();
                y += 28;
              }
            }

            // Match number
            const numX = MARGIN + 10;
            const labelX = MARGIN + 28;
            const labelW = CONTENT_WIDTH - 38;

            doc.save();
            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(COLORS.primary)
              .text(`${i + 1}.`, numX, y, { width: 16, lineBreak: false });
            doc.restore();

            // Match label (allow wrapping for long names)
            doc.save();
            doc.fontSize(9).font('Helvetica').fillColor(COLORS.primary);
            const labelHeight = doc.heightOfString(label, { width: labelW });
            doc.text(label, labelX, y, { width: labelW });
            doc.restore();

            const baseRowHeight = Math.max(14, labelHeight + 2);

            // Not-before annotation
            if (entry.notBefore) {
              doc.save();
              doc
                .fontSize(7.5)
                .font('Helvetica-Oblique')
                .fillColor(COLORS.notBefore)
                .text(entry.notBefore, labelX, y + baseRowHeight, {
                  width: labelW,
                  lineBreak: false,
                });
              doc.restore();
              y += baseRowHeight + 12;
            } else {
              y += baseRowHeight + 4;
            }
          }

          y += 12; // spacing after court section
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
