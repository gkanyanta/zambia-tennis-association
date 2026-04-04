import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Page dimensions (A4 landscape)
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 30;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CONTENT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN;

// Colors
const COLORS = {
  primary: '#1F2937',
  secondary: '#6B7280',
  accent: '#2563EB',
  border: '#D1D5DB',
  lightBg: '#F9FAFB',
  headerBg: '#1E3A5F',
  headerText: '#FFFFFF',
  seedBadge: '#F59E0B',
  winnerBg: '#ECFDF5',
  byeText: '#9CA3AF'
};

// Match box dimensions
const MATCH_BOX_WIDTH = 140;
const MATCH_BOX_HEIGHT = 36;
const PLAYER_LINE_HEIGHT = 18;

/**
 * Generate a PDF of the tournament draw
 * @param {Object} tournament - The tournament document
 * @param {Object} category - The category subdocument
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generateDrawPDF = (tournament, category) => {
  return new Promise((resolve, reject) => {
    try {
      const draw = category.draw;
      if (!draw) {
        return reject(new Error('No draw generated for this category'));
      }

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: MARGIN
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      switch (draw.type) {
        case 'single_elimination':
          renderSingleElimination(doc, tournament, category);
          break;
        case 'round_robin':
          renderRoundRobin(doc, tournament, category);
          break;
        case 'feed_in':
          renderFeedIn(doc, tournament, category);
          break;
        default:
          renderSingleElimination(doc, tournament, category);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Render page header with tournament info
 */
function renderHeader(doc, tournament, category, subtitle) {
  const logoPath = path.join(__dirname, '../assets/zta-logo.png');

  // Header background
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 55).fill(COLORS.headerBg);

  // Logo on the left
  try {
    doc.image(logoPath, MARGIN + 8, MARGIN + 8, { height: 40 });
  } catch (e) {
    // Logo not available
  }

  // Tournament name — centred across full width
  doc
    .fontSize(15)
    .fillColor(COLORS.headerText)
    .font('Helvetica-Bold')
    .text(tournament.name, MARGIN, MARGIN + 6, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false
    });

  // Category + subtitle — centred
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`${category.name}${subtitle ? ' — ' + subtitle : ''}`, MARGIN, MARGIN + 24, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false
    });

  // Venue, city, dates — centred on third line
  const dateStr = formatDateRange(tournament.startDate, tournament.endDate);
  doc
    .fontSize(7)
    .text(`${tournament.venue}, ${tournament.city}  |  ${dateStr}  |  Zambia Tennis Association`, MARGIN, MARGIN + 40, {
      width: CONTENT_WIDTH,
      align: 'center',
      lineBreak: false
    });

  // Reset color
  doc.fillColor(COLORS.primary);

  return MARGIN + 60; // return Y position after header
}

/**
 * Render single elimination bracket
 */
function renderSingleElimination(doc, tournament, category) {
  const draw = category.draw;
  const matches = draw.matches || [];
  const numberOfRounds = draw.numberOfRounds || 1;

  // Group matches by round
  const roundMatches = {};
  for (let r = 1; r <= numberOfRounds; r++) {
    roundMatches[r] = matches
      .filter(m => m.round === r)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  }

  const firstRoundCount = (roundMatches[1] || []).length;
  const bracketAreaHeight = CONTENT_HEIGHT - 70; // space below header

  // Adaptive scaling: fit on one page if possible (up to 32-bracket / 16 R1 matches)
  // Only split to multi-page for 64+ brackets where single-page would be unreadable
  const spacePerMatch = firstRoundCount > 0 ? bracketAreaHeight / firstRoundCount : bracketAreaHeight;
  const minReadableSpace = 12; // below this, text becomes too small to read
  const needsMultiplePages = spacePerMatch < minReadableSpace;

  if (needsMultiplePages) {
    const matchesPerPage = Math.max(4, Math.floor(bracketAreaHeight / 28));
    const pageCount = Math.ceil(firstRoundCount / matchesPerPage);
    renderMultiPageBracket(doc, tournament, category, roundMatches, numberOfRounds, matchesPerPage, pageCount);
  } else {
    renderSinglePageBracket(doc, tournament, category, roundMatches, numberOfRounds);
  }
}

/**
 * Render bracket that fits on a single page
 */
function renderSinglePageBracket(doc, tournament, category, roundMatches, numberOfRounds, subtitle) {
  const headerBottom = renderHeader(doc, tournament, category, subtitle || 'Draw');
  const bracketTop = headerBottom + 5;
  const bracketBottom = PAGE_HEIGHT - MARGIN;
  const bracketHeight = bracketBottom - bracketTop;

  // Calculate column width
  const roundLabelHeight = 15;
  const drawAreaTop = bracketTop + roundLabelHeight;
  const drawAreaHeight = bracketHeight - roundLabelHeight;

  const colWidth = CONTENT_WIDTH / numberOfRounds;
  // Scale match box width to fit within columns
  const boxWidth = Math.min(MATCH_BOX_WIDTH, colWidth - 8);

  // Adaptive box height based on first-round match count
  const firstRoundCount = (roundMatches[1] || []).length;
  const spacePerR1Match = firstRoundCount > 0 ? drawAreaHeight / firstRoundCount : drawAreaHeight;
  // Box height uses most of the available space per match, with a gap
  const boxHeight = Math.min(MATCH_BOX_HEIGHT, Math.max(12, spacePerR1Match - 4));
  const playerLineH = boxHeight / 2;

  // Render round labels
  const roundNames = getRoundNames(numberOfRounds);
  for (let r = 1; r <= numberOfRounds; r++) {
    const colX = MARGIN + (r - 1) * colWidth;
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(COLORS.accent)
      .text(roundNames[r - 1] || `Round ${r}`, colX, bracketTop, {
        width: colWidth,
        align: 'center'
      });
  }

  doc.font('Helvetica').fillColor(COLORS.primary);

  // For each round, position match boxes
  const matchPositions = {}; // matchId -> { x, y, midY }

  for (let r = 1; r <= numberOfRounds; r++) {
    const rMatches = roundMatches[r] || [];
    const colX = MARGIN + (r - 1) * colWidth + (colWidth - boxWidth) / 2;
    const totalSpace = drawAreaHeight;
    const spacing = rMatches.length > 0 ? totalSpace / rMatches.length : totalSpace;

    for (let i = 0; i < rMatches.length; i++) {
      const match = rMatches[i];
      const centerY = drawAreaTop + spacing * (i + 0.5);
      const boxY = centerY - boxHeight / 2;

      renderMatchBox(doc, match, colX, boxY, boxWidth, boxHeight, playerLineH);

      const matchId = match._id ? match._id.toString() : `${r}-${i}`;
      matchPositions[matchId] = {
        x: colX,
        y: boxY,
        midY: centerY,
        round: r,
        index: i,
        boxWidth
      };
    }
  }

  // Draw connector lines
  renderConnectorLines(doc, roundMatches, matchPositions, numberOfRounds, boxWidth);
}

/**
 * Render bracket across multiple pages
 */
function renderMultiPageBracket(doc, tournament, category, roundMatches, numberOfRounds, matchesPerPage, pageCount) {
  const firstRoundMatches = roundMatches[1] || [];

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) doc.addPage({ layout: 'landscape' });

    const pageLabel = pageCount > 1 ? ` (Page ${page + 1}/${pageCount})` : '';
    const headerBottom = renderHeader(doc, tournament, category, 'Draw' + pageLabel);
    const bracketTop = headerBottom + 5;
    const bracketBottom = PAGE_HEIGHT - MARGIN;
    const bracketHeight = bracketBottom - bracketTop;
    const roundLabelHeight = 15;
    const drawAreaTop = bracketTop + roundLabelHeight;
    const drawAreaHeight = bracketHeight - roundLabelHeight;

    const colWidth = CONTENT_WIDTH / numberOfRounds;
    // Scale match box width to fit within columns
    const boxWidth = Math.min(MATCH_BOX_WIDTH, colWidth - 8);

    // Round labels
    const roundNames = getRoundNames(numberOfRounds);
    for (let r = 1; r <= numberOfRounds; r++) {
      const colX = MARGIN + (r - 1) * colWidth;
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(COLORS.accent)
        .text(roundNames[r - 1] || `Round ${r}`, colX, bracketTop, {
          width: colWidth,
          align: 'center'
        });
    }
    doc.font('Helvetica').fillColor(COLORS.primary);

    // Determine which first-round matches are on this page
    const startIdx = page * matchesPerPage;
    const endIdx = Math.min(startIdx + matchesPerPage, firstRoundMatches.length);
    const pageFirstRoundMatches = firstRoundMatches.slice(startIdx, endIdx);

    const matchPositions = {};

    // Adaptive box height for multi-page (based on matches per page)
    const spacePerMatch = drawAreaHeight / pageFirstRoundMatches.length;
    const boxHeight = Math.min(MATCH_BOX_HEIGHT, Math.max(20, spacePerMatch - 4));
    const playerLineH = boxHeight / 2;

    // Render first round matches for this page
    const r1ColX = MARGIN + (colWidth - boxWidth) / 2;
    const r1Spacing = drawAreaHeight / pageFirstRoundMatches.length;

    for (let i = 0; i < pageFirstRoundMatches.length; i++) {
      const match = pageFirstRoundMatches[i];
      const centerY = drawAreaTop + r1Spacing * (i + 0.5);
      const boxY = centerY - boxHeight / 2;

      renderMatchBox(doc, match, r1ColX, boxY, boxWidth, boxHeight, playerLineH);
      const matchId = match._id ? match._id.toString() : `1-${startIdx + i}`;
      matchPositions[matchId] = { x: r1ColX, y: boxY, midY: centerY, round: 1, index: startIdx + i, boxWidth };
    }

    // Render subsequent rounds (subset relevant to this page's matches)
    for (let r = 2; r <= numberOfRounds; r++) {
      const rMatches = roundMatches[r] || [];
      const rColX = MARGIN + (r - 1) * colWidth + (colWidth - boxWidth) / 2;

      // Determine which matches in this round correspond to this page's first-round matches
      const firstMatchGlobalIdx = startIdx;
      const lastMatchGlobalIdx = endIdx - 1;
      // Each round halves the number, so find start/end for this round
      const divisor = Math.pow(2, r - 1);
      const rStartIdx = Math.floor(firstMatchGlobalIdx / divisor);
      const rEndIdx = Math.floor(lastMatchGlobalIdx / divisor);

      const pageRoundMatches = rMatches.slice(rStartIdx, rEndIdx + 1);
      const rSpacing = pageRoundMatches.length > 0 ? drawAreaHeight / pageRoundMatches.length : drawAreaHeight;

      for (let i = 0; i < pageRoundMatches.length; i++) {
        const match = pageRoundMatches[i];
        const centerY = drawAreaTop + rSpacing * (i + 0.5);
        const boxY = centerY - boxHeight / 2;

        renderMatchBox(doc, match, rColX, boxY, boxWidth, boxHeight, playerLineH);
        const matchId = match._id ? match._id.toString() : `${r}-${rStartIdx + i}`;
        matchPositions[matchId] = { x: rColX, y: boxY, midY: centerY, round: r, index: rStartIdx + i, boxWidth };
      }
    }

    // Draw connector lines for this page
    renderPageConnectorLines(doc, matchPositions, numberOfRounds, boxWidth);
  }
}

/**
 * Render a single match box
 */
function renderMatchBox(doc, match, x, y, boxWidth, boxHeight, playerLineH) {
  const w = boxWidth || MATCH_BOX_WIDTH;
  const h = boxHeight || MATCH_BOX_HEIGHT;
  const plH = playerLineH || PLAYER_LINE_HEIGHT;
  const p1 = match.player1 || {};
  const p2 = match.player2 || {};
  const hasResult = !!(match.winner && match.score);
  const winnerId = match.winner;

  // Box background
  doc.rect(x, y, w, h).lineWidth(0.5).strokeColor(COLORS.border).stroke();

  // Player 1 line
  const p1IsWinner = winnerId && p1.id === winnerId;
  const p1IsBye = p1.isBye;
  renderPlayerLine(doc, p1, x, y, p1IsWinner, p1IsBye, hasResult, match.score, true, w, plH);

  // Divider line
  doc
    .moveTo(x, y + plH)
    .lineTo(x + w, y + plH)
    .lineWidth(0.3)
    .strokeColor(COLORS.border)
    .stroke();

  // Player 2 line
  const p2IsWinner = winnerId && p2.id === winnerId;
  const p2IsBye = p2.isBye;
  renderPlayerLine(doc, p2, x, y + plH, p2IsWinner, p2IsBye, hasResult, match.score, false, w, plH);
}

/**
 * Render a player line within a match box
 */
function renderPlayerLine(doc, player, x, y, isWinner, isBye, matchCompleted, score, isTopPlayer, boxWidth, lineHeight) {
  const w = boxWidth || MATCH_BOX_WIDTH;
  const lh = lineHeight || PLAYER_LINE_HEIGHT;
  // Scale font sizes with line height (base: 18pt line → 8.5pt name, 7pt seed/score)
  const scale = Math.min(1, lh / PLAYER_LINE_HEIGHT);
  const nameFontSize = Math.max(4.5, Math.round(8.5 * scale * 10) / 10);
  const smallFontSize = Math.max(4, Math.round(7 * scale * 10) / 10);
  const textY = y + Math.max(1, (lh - nameFontSize) / 2);
  const padding = 3;
  const nameX = x + padding;

  // Winner highlight background
  if (isWinner) {
    doc.rect(x + 0.5, y + 0.5, w - 1, lh - 1).fill(COLORS.winnerBg);
  }

  // Full line width for non-scored lines
  const fullWidth = w - 2 * padding;

  if (isBye) {
    doc
      .fontSize(nameFontSize)
      .fillColor(COLORS.byeText)
      .font('Helvetica-Oblique')
      .text('BYE', nameX, textY, { width: fullWidth, lineBreak: false });
    doc.font('Helvetica');
    return;
  }

  if (!player || !player.name) {
    doc
      .fontSize(nameFontSize)
      .fillColor(COLORS.byeText)
      .text('TBD', nameX, textY, { width: fullWidth, lineBreak: false });
    return;
  }

  // Max chars scales with box width
  const maxNameChars = Math.max(10, Math.floor(w / 8));

  // Determine if we need to show score on this line
  const showScore = matchCompleted && score && isWinner;
  // Measure score width to place it right after the name with a small gap
  const scoreText = showScore ? score : '';
  const scoreWidth = showScore ? Math.min(w * 0.35, doc.fontSize(smallFontSize).widthOfString(scoreText) + 4) : 0;
  const nameWidth = w - 2 * padding - (showScore ? scoreWidth + 4 : 0);

  // Seed badge
  let textStartX = nameX;
  if (player.seed) {
    const seedText = `${player.seed}`;
    doc
      .fontSize(smallFontSize)
      .fillColor(COLORS.seedBadge)
      .font('Helvetica-Bold')
      .text(`[${seedText}]`, nameX, textY, { continued: true, lineBreak: false });
    doc.font('Helvetica');
    textStartX = nameX + Math.round(14 * scale);
    doc.text(' ', { continued: true, lineBreak: false });
  }

  // Player name
  const displayName = truncateName(player.name, maxNameChars);
  doc
    .fontSize(nameFontSize)
    .fillColor(isWinner ? '#059669' : COLORS.primary)
    .font(isWinner ? 'Helvetica-Bold' : 'Helvetica')
    .text(displayName, textStartX, textY, {
      width: nameWidth - (textStartX - nameX),
      lineBreak: false
    });

  // Score right after name area
  if (showScore) {
    doc
      .fontSize(smallFontSize)
      .fillColor(COLORS.secondary)
      .font('Helvetica')
      .text(scoreText, x + w - scoreWidth - padding, textY, {
        width: scoreWidth,
        align: 'right',
        lineBreak: false
      });
  }
}

/**
 * Draw connector lines between rounds
 */
function renderConnectorLines(doc, roundMatches, matchPositions, numberOfRounds, boxWidth) {
  const w = boxWidth || MATCH_BOX_WIDTH;
  doc.strokeColor(COLORS.border).lineWidth(0.5);

  for (let r = 1; r < numberOfRounds; r++) {
    const currentRound = roundMatches[r] || [];

    for (let i = 0; i < currentRound.length; i += 2) {
      const match1 = currentRound[i];
      const match2 = currentRound[i + 1];
      if (!match1 || !match2) continue;

      const id1 = match1._id ? match1._id.toString() : `${r}-${i}`;
      const id2 = match2._id ? match2._id.toString() : `${r}-${i + 1}`;
      const pos1 = matchPositions[id1];
      const pos2 = matchPositions[id2];
      if (!pos1 || !pos2) continue;

      // Find next round match
      const nextRoundMatches = roundMatches[r + 1] || [];
      const nextMatchIdx = Math.floor(i / 2);
      const nextMatch = nextRoundMatches[nextMatchIdx];
      if (!nextMatch) continue;
      const nextId = nextMatch._id ? nextMatch._id.toString() : `${r + 1}-${nextMatchIdx}`;
      const nextPos = matchPositions[nextId];
      if (!nextPos) continue;

      // Horizontal line from match1 right edge
      const rightEdge = pos1.x + w;
      const midX = (rightEdge + nextPos.x) / 2;

      // Match 1 -> vertical bar
      doc.moveTo(rightEdge, pos1.midY).lineTo(midX, pos1.midY).stroke();
      // Match 2 -> vertical bar
      doc.moveTo(rightEdge, pos2.midY).lineTo(midX, pos2.midY).stroke();
      // Vertical bar
      doc.moveTo(midX, pos1.midY).lineTo(midX, pos2.midY).stroke();
      // Vertical bar center -> next match
      const vertMidY = (pos1.midY + pos2.midY) / 2;
      doc.moveTo(midX, vertMidY).lineTo(nextPos.x, nextPos.midY).stroke();
    }
  }
}

/**
 * Draw connector lines for a multi-page bracket (using stored positions)
 */
function renderPageConnectorLines(doc, matchPositions, numberOfRounds, boxWidth) {
  const w = boxWidth || MATCH_BOX_WIDTH;
  doc.strokeColor(COLORS.border).lineWidth(0.5);

  // Group positions by round
  const byRound = {};
  for (const [id, pos] of Object.entries(matchPositions)) {
    if (!byRound[pos.round]) byRound[pos.round] = [];
    byRound[pos.round].push({ id, ...pos });
  }

  for (let r = 1; r < numberOfRounds; r++) {
    const currentPositions = (byRound[r] || []).sort((a, b) => a.index - b.index);
    const nextPositions = (byRound[r + 1] || []).sort((a, b) => a.index - b.index);

    for (let i = 0; i < currentPositions.length; i += 2) {
      const pos1 = currentPositions[i];
      const pos2 = currentPositions[i + 1];
      if (!pos1 || !pos2) continue;

      const nextMatchIdx = Math.floor(pos1.index / 2);
      const nextPos = nextPositions.find(p => p.index === nextMatchIdx);
      if (!nextPos) continue;

      const rightEdge = pos1.x + w;
      const midX = (rightEdge + nextPos.x) / 2;

      doc.moveTo(rightEdge, pos1.midY).lineTo(midX, pos1.midY).stroke();
      doc.moveTo(rightEdge, pos2.midY).lineTo(midX, pos2.midY).stroke();
      doc.moveTo(midX, pos1.midY).lineTo(midX, pos2.midY).stroke();
      const vertMidY = (pos1.midY + pos2.midY) / 2;
      doc.moveTo(midX, vertMidY).lineTo(nextPos.x, nextPos.midY).stroke();
    }
  }
}

/**
 * Render round robin draw
 */
function renderRoundRobin(doc, tournament, category) {
  const draw = category.draw;
  const groups = draw.roundRobinGroups || [];

  if (groups.length === 0) {
    const headerBottom = renderHeader(doc, tournament, category, 'Round Robin');
    doc.fontSize(12).fillColor(COLORS.secondary).text('No groups in draw.', MARGIN, headerBottom + 20);
    return;
  }

  let isFirstPage = true;

  for (const group of groups) {
    if (!isFirstPage) doc.addPage({ layout: 'landscape' });
    isFirstPage = false;

    const headerBottom = renderHeader(doc, tournament, category, 'Round Robin');
    let currentY = headerBottom + 10;

    // Group name
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text(group.groupName || 'Group', MARGIN, currentY);
    currentY += 20;

    // ITF cross-table
    currentY = renderCrossTable(doc, group, currentY);
  }

  // Render knockout stage if present
  if (draw.knockoutStage && draw.knockoutStage.matches && draw.knockoutStage.matches.length > 0) {
    doc.addPage({ layout: 'landscape' });
    const koMatches = draw.knockoutStage.matches;
    const koRounds = draw.knockoutStage.numberOfRounds || 1;

    // Group knockout matches by round
    const roundMatches = {};
    for (let r = 1; r <= koRounds; r++) {
      roundMatches[r] = koMatches
        .filter(m => m.round === r)
        .sort((a, b) => a.matchNumber - b.matchNumber);
    }

    renderSinglePageBracket(doc, tournament, category, roundMatches, koRounds, 'Knockout Stage');
  }
}

/**
 * Render ITF-standard round-robin cross-table
 * Players as rows and columns, match results at intersections,
 * with W/L/Pts/Pos summary columns on the right.
 */
function renderCrossTable(doc, group, startY) {
  const players = group.players || [];
  const matches = group.matches || [];
  const standings = group.standings || [];
  const n = players.length;

  if (n === 0) return startY;

  // Build a match result lookup: matchMap[rowPlayerId][colPlayerId] = { score, won }
  const matchMap = {};
  for (const m of matches) {
    if (!m.player1?.id || !m.player2?.id) continue;
    if (!m.winner && !m.score) continue;
    const p1Won = m.winner === m.player1.id;
    if (!matchMap[m.player1.id]) matchMap[m.player1.id] = {};
    if (!matchMap[m.player2.id]) matchMap[m.player2.id] = {};
    matchMap[m.player1.id][m.player2.id] = { score: m.score || '', won: p1Won };
    matchMap[m.player2.id][m.player1.id] = { score: m.score || '', won: !p1Won };
  }

  // Build standings lookup
  const standingsMap = {};
  standings.forEach((s, i) => {
    standingsMap[s.playerId] = { ...s, position: i + 1 };
  });

  // Layout: fill the full available page area, then derive font sizes
  const totalCols = 1 + 1 + n + 4; // #, Name, n result cols, W/L/Pts/Pos
  const availableHeight = PAGE_HEIGHT - MARGIN - startY;
  const rowHeight = availableHeight / (n + 1); // +1 for header row

  // Distribute full page width across columns
  // Give name column ~22% of width, # column ~4%, summary cols ~4% each, rest to result cells
  const numColWidth = Math.round(CONTENT_WIDTH * 0.035);
  const summaryColWidth = Math.round(CONTENT_WIDTH * 0.045);
  const nameColWidth = Math.round(CONTENT_WIDTH * 0.22);
  const resultColWidth = (CONTENT_WIDTH - numColWidth - nameColWidth - 4 * summaryColWidth) / n;
  const tableWidth = CONTENT_WIDTH;

  // Scale fonts to row height — large enough to be readable when printed
  const fontSize = Math.min(14, Math.max(9, rowHeight * 0.38));
  const smallFontSize = Math.min(12, Math.max(8, rowHeight * 0.32));

  let y = startY;

  // ── Header row ──
  doc.rect(MARGIN, y, tableWidth, rowHeight).fill(COLORS.headerBg);
  doc.fontSize(fontSize).font('Helvetica-Bold').fillColor(COLORS.headerText);

  // # column
  doc.text('#', MARGIN + 2, y + (rowHeight - fontSize) / 2, { width: numColWidth - 4, align: 'center', lineBreak: false });

  // Player name column
  doc.text('Player', MARGIN + numColWidth + 4, y + (rowHeight - fontSize) / 2, { width: nameColWidth - 8, lineBreak: false });

  // Player number columns (1, 2, 3...)
  for (let j = 0; j < n; j++) {
    const colX = MARGIN + numColWidth + nameColWidth + j * resultColWidth;
    doc.text(`${j + 1}`, colX, y + (rowHeight - fontSize) / 2, { width: resultColWidth, align: 'center', lineBreak: false });
  }

  // Summary header columns
  const summaryX = MARGIN + numColWidth + nameColWidth + n * resultColWidth;
  const summaryLabels = ['W', 'L', 'Pts', 'Pos'];
  for (let s = 0; s < summaryLabels.length; s++) {
    doc.text(summaryLabels[s], summaryX + s * summaryColWidth, y + (rowHeight - fontSize) / 2, {
      width: summaryColWidth, align: 'center', lineBreak: false
    });
  }

  y += rowHeight;

  // ── Data rows ──
  for (let i = 0; i < n; i++) {
    const player = players[i];
    const isEven = i % 2 === 0;

    // Row background
    if (isEven) {
      doc.rect(MARGIN, y, tableWidth, rowHeight).fill(COLORS.lightBg);
    }

    // Row border
    doc.rect(MARGIN, y, tableWidth, rowHeight).lineWidth(0.5).strokeColor(COLORS.border).stroke();

    const textY = y + (rowHeight - fontSize) / 2;

    // Player number
    doc.fontSize(fontSize).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text(`${i + 1}`, MARGIN + 2, textY, { width: numColWidth - 4, align: 'center', lineBreak: false });

    // Player name
    const displayName = truncateName(player.name, Math.floor(nameColWidth / 6));
    doc.fontSize(fontSize).font('Helvetica').fillColor(COLORS.primary);
    doc.text(displayName, MARGIN + numColWidth + 4, textY, { width: nameColWidth - 8, lineBreak: false });

    // Result cells
    for (let j = 0; j < n; j++) {
      const colX = MARGIN + numColWidth + nameColWidth + j * resultColWidth;

      // Draw cell border
      doc.rect(colX, y, resultColWidth, rowHeight).lineWidth(0.5).strokeColor(COLORS.border).stroke();

      if (i === j) {
        // Diagonal — shade dark
        doc.rect(colX + 0.5, y + 0.5, resultColWidth - 1, rowHeight - 1).fill('#E5E7EB');
      } else {
        const opponent = players[j];
        const result = matchMap[player.id]?.[opponent.id];

        if (result) {
          // Show score — winner in bold green, loser in regular
          const cellFont = result.won ? 'Helvetica-Bold' : 'Helvetica';
          const cellColor = result.won ? '#059669' : COLORS.secondary;

          doc.fontSize(smallFontSize).font(cellFont).fillColor(cellColor);
          doc.text(result.score, colX + 2, y + (rowHeight - smallFontSize) / 2, {
            width: resultColWidth - 4, align: 'center', lineBreak: false
          });
        }
      }
    }

    // Summary columns: W, L, Pts, Pos
    const pStanding = standingsMap[player.id] || { won: 0, lost: 0, points: 0, position: '-' };
    const summaryValues = [
      pStanding.won || 0,
      pStanding.lost || 0,
      pStanding.points || 0,
      pStanding.position || '-'
    ];

    doc.fontSize(fontSize).font('Helvetica').fillColor(COLORS.primary);
    for (let s = 0; s < summaryValues.length; s++) {
      const sx = summaryX + s * summaryColWidth;
      doc.rect(sx, y, summaryColWidth, rowHeight).lineWidth(0.5).strokeColor(COLORS.border).stroke();
      doc.text(`${summaryValues[s]}`, sx, textY, { width: summaryColWidth, align: 'center', lineBreak: false });
    }

    y += rowHeight;
  }

  return y;
}

/**
 * Render feed-in draw (main bracket + consolation)
 */
function renderFeedIn(doc, tournament, category) {
  const draw = category.draw;
  const matches = draw.matches || [];

  // Feed-in: render the main bracket first (same as single elimination)
  renderSingleElimination(doc, tournament, category);

  // If there are consolation matches (matches with round < 0 or a separate flag),
  // add them on a new page. For now feed-in just renders the bracket.
  // Consolation rounds could be indicated by negative round numbers or separate array.
  const consolationMatches = matches.filter(m => m.roundName && m.roundName.toLowerCase().includes('consolation'));
  if (consolationMatches.length > 0) {
    doc.addPage({ layout: 'landscape' });
    const headerBottom = renderHeader(doc, tournament, category, 'Consolation Draw');
    let currentY = headerBottom + 15;

    for (const match of consolationMatches) {
      if (currentY > PAGE_HEIGHT - MARGIN - 40) {
        doc.addPage({ layout: 'landscape' });
        currentY = renderHeader(doc, tournament, category, 'Consolation Draw') + 15;
      }
      renderMatchBox(doc, match, MARGIN + 20, currentY);
      currentY += MATCH_BOX_HEIGHT + 10;
    }
  }
}

// ---- Helpers ----

function getRoundNames(totalRounds) {
  const names = [];
  for (let r = 1; r <= totalRounds; r++) {
    const remaining = totalRounds - r;
    if (remaining === 0) names.push('Final');
    else if (remaining === 1) names.push('Semi-Finals');
    else if (remaining === 2) names.push('Quarter-Finals');
    else names.push(`Round ${r}`);
  }
  return names;
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

function truncateName(name, maxLen) {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  return name.substring(0, maxLen - 1) + '.';
}

export default generateDrawPDF;
