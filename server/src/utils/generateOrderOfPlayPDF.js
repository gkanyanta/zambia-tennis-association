import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A4 portrait dimensions
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

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

  // Header background
  doc.save();
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 55).fill(COLORS.headerBg);
  doc.restore();

  // Logo
  try {
    doc.image(logoPath, MARGIN + 8, MARGIN + 8, { height: 40 });
  } catch (e) {
    // Logo not available
  }

  // Tournament name
  doc.save();
  doc
    .fontSize(14)
    .fillColor(COLORS.headerText)
    .font('Helvetica-Bold')
    .text(tournament.name, MARGIN, MARGIN + 6, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  // Subtitle
  doc.save();
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(COLORS.headerText)
    .text('Order of Play', MARGIN, MARGIN + 24, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  // Venue, dates
  const dateStr = formatDateRange(tournament.startDate, tournament.endDate);
  const venue = [tournament.venue, tournament.city].filter(Boolean).join(', ');
  doc.save();
  doc
    .fontSize(7)
    .fillColor(COLORS.headerText)
    .text(`${venue}  |  ${dateStr}  |  Zambia Tennis Association`, MARGIN, MARGIN + 40, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  return MARGIN + 65;
}

/**
 * Render page footer
 */
function renderFooter(doc) {
  doc.save();
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

  if (!match) return `${category.name}: Match TBD`;

  const p1 = match.player1?.name || 'TBD';
  const p2 = match.player2?.name || 'TBD';
  const round = match.roundName || `R${match.round}`;

  return `${category.name} ${round}: ${p1} vs ${p2}`;
}

/**
 * Generate an Order of Play PDF.
 * @param {Object} tournament - The tournament document
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateOrderOfPlayPDF = (tournament) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: MARGIN
      });

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
      const bottomLimit = PAGE_HEIGHT - MARGIN - 30; // leave room for footer

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
        renderFooter(doc);
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
            renderFooter(doc);

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
                renderFooter(doc);
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

            // Match number + label
            doc.save();
            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor(COLORS.primary)
              .text(`${i + 1}.`, MARGIN + 10, y, { continued: true, width: 18 });
            doc
              .font('Helvetica')
              .text(` ${label}`, { width: CONTENT_WIDTH - 50, lineBreak: false });
            doc.restore();

            // Not-before annotation
            if (entry.notBefore) {
              doc.save();
              doc
                .fontSize(7.5)
                .font('Helvetica-Oblique')
                .fillColor(COLORS.notBefore)
                .text(entry.notBefore, MARGIN + 28, y + 12, {
                  width: CONTENT_WIDTH - 50,
                  lineBreak: false,
                });
              doc.restore();
              y += 24;
            } else {
              y += 16;
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
