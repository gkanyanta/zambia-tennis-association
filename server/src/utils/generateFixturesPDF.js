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
  roundBg: '#EFF6FF',
  roundText: '#1E40AF',
};

// Column layout for fixture table
const COLS = {
  home:   { x: MARGIN,       w: 160 },
  vs:     { x: MARGIN + 160, w: 25 },
  away:   { x: MARGIN + 185, w: 160 },
  venue:  { x: MARGIN + 345, w: 110 },
  result: { x: MARGIN + 455, w: CONTENT_WIDTH - 455 + MARGIN },
};

const ROW_HEIGHT = 20;
const HEADER_ROW_HEIGHT = 18;
const ROUND_HEADER_HEIGHT = 24;

function formatDate(date) {
  if (!date) return 'TBD';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(time) {
  if (!time) return '-';
  return time;
}

function getResultText(tie) {
  if (tie.status === 'completed') {
    return `${tie.score?.home ?? 0} - ${tie.score?.away ?? 0}`;
  }
  if (tie.status === 'walkover') {
    return 'W/O';
  }
  if (tie.status === 'cancelled') {
    return 'CAN';
  }
  if (tie.status === 'postponed') {
    return 'PPD';
  }
  return '-';
}

function capitalise(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render standard page header with league info.
 * Returns Y position after header.
 */
function renderPageHeader(doc, league) {
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

  // League name
  doc.save();
  doc
    .fontSize(14)
    .fillColor(COLORS.headerText)
    .font('Helvetica-Bold')
    .text(league.name, MARGIN, MARGIN + 6, {
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
    .text('League Fixtures', MARGIN, MARGIN + 24, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();

  // Region, gender, season info
  const info = [
    capitalise(league.region) + ' Region',
    capitalise(league.gender),
    league.season ? `${league.season} ${league.year || ''}`.trim() : '',
  ].filter(Boolean).join('  |  ');

  doc.save();
  doc
    .fontSize(7)
    .fillColor(COLORS.headerText)
    .text(`${info}  |  Zambia Tennis Association`, MARGIN, MARGIN + 40, {
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
 * Render the table header row
 */
function renderTableHeader(doc, y) {
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, HEADER_ROW_HEIGHT).fill(COLORS.lightBg);
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor(COLORS.secondary);

  doc.text('HOME',   COLS.home.x + 4,   y + 5, { width: COLS.home.w,   lineBreak: false });
  doc.text('',       COLS.vs.x,         y + 5, { width: COLS.vs.w,     lineBreak: false });
  doc.text('AWAY',   COLS.away.x + 4,   y + 5, { width: COLS.away.w,   lineBreak: false });
  doc.text('VENUE',  COLS.venue.x + 4,  y + 5, { width: COLS.venue.w,  lineBreak: false });
  doc.text('RESULT', COLS.result.x + 4, y + 5, { width: COLS.result.w, lineBreak: false });
  doc.restore();

  return y + HEADER_ROW_HEIGHT;
}

/**
 * Render a single fixture row
 */
function renderFixtureRow(doc, y, tie, isAlternate) {
  if (isAlternate) {
    doc.save();
    doc.rect(MARGIN, y, CONTENT_WIDTH, ROW_HEIGHT).fill('#F9FAFB');
    doc.restore();
  }

  const textY = y + 6;
  doc.save();
  doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.primary);

  // Home team (bold if winner)
  const homeIsWinner = tie.winner && tie.winner._id?.toString() === tie.homeTeam?._id?.toString();
  doc.font(homeIsWinner ? 'Helvetica-Bold' : 'Helvetica');
  doc.text(tie.homeTeam?.name || 'TBD', COLS.home.x + 4, textY, { width: COLS.home.w - 4, lineBreak: false });

  doc.font('Helvetica').fillColor(COLORS.secondary);
  doc.text('vs', COLS.vs.x + 6, textY, { width: COLS.vs.w, lineBreak: false });

  // Away team (bold if winner)
  const awayIsWinner = tie.winner && tie.winner._id?.toString() === tie.awayTeam?._id?.toString();
  doc.fillColor(COLORS.primary).font(awayIsWinner ? 'Helvetica-Bold' : 'Helvetica');
  doc.text(tie.awayTeam?.name || 'TBD', COLS.away.x + 4, textY, { width: COLS.away.w - 4, lineBreak: false });

  doc.font('Helvetica').fillColor(COLORS.primary);
  doc.text(tie.venue || 'Venue TBD', COLS.venue.x + 4, textY, { width: COLS.venue.w - 4, lineBreak: false });

  // Result - bold for completed
  const result = getResultText(tie);
  const isComplete = tie.status === 'completed' || tie.status === 'walkover';
  doc.font(isComplete ? 'Helvetica-Bold' : 'Helvetica');
  if (isComplete) doc.fillColor(COLORS.accent);
  doc.text(result, COLS.result.x + 4, textY, { width: COLS.result.w - 4, lineBreak: false, align: 'center' });

  doc.restore();
  return y + ROW_HEIGHT;
}

/**
 * Generate a League Fixtures PDF.
 * @param {Object} league - The league document
 * @param {Array} ties - Array of tie documents, populated with homeTeam/awayTeam/winner
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateFixturesPDF = (league, ties) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: MARGIN,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Build team lookup from league
      const allTeams = (league.teams || []).map(t => ({
        id: t._id?.toString(),
        name: t.name || 'Unknown',
      }));

      // Group ties by round
      const tiesByRound = {};
      for (const tie of ties) {
        const round = tie.round || 1;
        if (!tiesByRound[round]) tiesByRound[round] = [];
        tiesByRound[round].push(tie);
      }

      const sortedRounds = Object.keys(tiesByRound).map(Number).sort((a, b) => a - b);
      const bottomLimit = PAGE_HEIGHT - MARGIN - 30; // leave room for footer

      let isFirstPage = true;
      let y;

      for (const round of sortedRounds) {
        const roundTies = tiesByRound[round];
        // Sort by date within round
        roundTies.sort((a, b) => {
          const da = a.scheduledDate ? new Date(a.scheduledDate) : new Date(0);
          const db = b.scheduledDate ? new Date(b.scheduledDate) : new Date(0);
          return da - db;
        });

        // Determine round label
        const roundName = roundTies[0]?.roundName || `Round ${round}`;

        // Find bye team(s) for this round
        const teamsInRound = new Set();
        for (const tie of roundTies) {
          if (tie.homeTeam?._id) teamsInRound.add(tie.homeTeam._id.toString());
          if (tie.awayTeam?._id) teamsInRound.add(tie.awayTeam._id.toString());
        }
        const byeTeams = allTeams.filter(t => t.id && !teamsInRound.has(t.id));
        const hasBye = byeTeams.length > 0;

        // Estimate space needed: round header + table header + rows + bye line
        const neededHeight = ROUND_HEADER_HEIGHT + HEADER_ROW_HEIGHT + roundTies.length * ROW_HEIGHT + (hasBye ? 18 : 0) + 15;

        // Check if we need a new page
        if (!isFirstPage && y + neededHeight > bottomLimit) {
          doc.addPage();
          y = renderPageHeader(doc, league);
          renderFooter(doc);
        }

        if (isFirstPage) {
          y = renderPageHeader(doc, league);
          renderFooter(doc);
          isFirstPage = false;
          y += 8;
        }

        // Round header bar
        doc.save();
        doc.rect(MARGIN, y, CONTENT_WIDTH, ROUND_HEADER_HEIGHT).fill(COLORS.roundBg);
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.roundText)
          .text(roundName, MARGIN + 10, y + 6, {
            width: CONTENT_WIDTH - 20,
            lineBreak: false,
          });
        doc.restore();
        y += ROUND_HEADER_HEIGHT + 2;

        // Table header
        y = renderTableHeader(doc, y);

        // Fixture rows
        for (let i = 0; i < roundTies.length; i++) {
          // Page break if running out of space
          if (y + ROW_HEIGHT > bottomLimit) {
            doc.addPage();
            y = renderPageHeader(doc, league);
            renderFooter(doc);
            y += 4;

            // Re-render round header (cont.)
            doc.save();
            doc.rect(MARGIN, y, CONTENT_WIDTH, ROUND_HEADER_HEIGHT).fill(COLORS.roundBg);
            doc
              .fontSize(10)
              .font('Helvetica-Bold')
              .fillColor(COLORS.roundText)
              .text(`${roundName} (cont.)`, MARGIN + 10, y + 6, {
                width: CONTENT_WIDTH - 20,
                lineBreak: false,
              });
            doc.restore();
            y += ROUND_HEADER_HEIGHT + 2;

            y = renderTableHeader(doc, y);
          }

          y = renderFixtureRow(doc, y, roundTies[i], i % 2 === 1);
        }

        // Bye indicator
        if (hasBye) {
          const byeNames = byeTeams.map(t => t.name).join(', ');
          doc.save();
          doc
            .fontSize(8)
            .font('Helvetica-Oblique')
            .fillColor(COLORS.secondary)
            .text(`Bye: ${byeNames}`, MARGIN + 4, y + 4, {
              width: CONTENT_WIDTH,
              lineBreak: false,
            });
          doc.restore();
          y += 18;
        }

        y += 12; // spacing after round
      }

      // Handle empty state
      if (sortedRounds.length === 0) {
        y = renderPageHeader(doc, league);
        renderFooter(doc);
        doc.save();
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(COLORS.secondary)
          .text('No fixtures have been scheduled for this league yet.', MARGIN, y + 40, {
            width: CONTENT_WIDTH,
            align: 'center',
          });
        doc.restore();
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
