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
  const minReadableSpace = 22; // below this, text becomes too small to read
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
function renderSinglePageBracket(doc, tournament, category, roundMatches, numberOfRounds) {
  const headerBottom = renderHeader(doc, tournament, category, 'Draw');
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
  const boxHeight = Math.min(MATCH_BOX_HEIGHT, Math.max(20, spacePerR1Match - 4));
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
  const isCompleted = match.status === 'completed';
  const winnerId = match.winner;

  // Box background
  doc.rect(x, y, w, h).lineWidth(0.5).strokeColor(COLORS.border).stroke();

  // Player 1 line
  const p1IsWinner = winnerId && p1.id === winnerId;
  const p1IsBye = p1.isBye;
  renderPlayerLine(doc, p1, x, y, p1IsWinner, p1IsBye, isCompleted, match.score, true, w, plH);

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
  renderPlayerLine(doc, p2, x, y + plH, p2IsWinner, p2IsBye, isCompleted, match.score, false, w, plH);
}

/**
 * Render a player line within a match box
 */
function renderPlayerLine(doc, player, x, y, isWinner, isBye, matchCompleted, score, isTopPlayer, boxWidth, lineHeight) {
  const w = boxWidth || MATCH_BOX_WIDTH;
  const lh = lineHeight || PLAYER_LINE_HEIGHT;
  // Scale font sizes with line height (base: 18pt line → 8.5pt name, 7pt seed/score)
  const scale = Math.min(1, lh / PLAYER_LINE_HEIGHT);
  const nameFontSize = Math.max(5.5, Math.round(8.5 * scale * 10) / 10);
  const smallFontSize = Math.max(5, Math.round(7 * scale * 10) / 10);
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

    // Standings table
    currentY = renderStandingsTable(doc, group, currentY);

    // Match results
    currentY += 15;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text('Match Results', MARGIN, currentY);
    currentY += 15;

    const groupMatches = group.matches || [];
    for (const match of groupMatches) {
      if (currentY > PAGE_HEIGHT - MARGIN - 20) {
        doc.addPage({ layout: 'landscape' });
        currentY = renderHeader(doc, tournament, category, `Round Robin - ${group.groupName}`) + 10;
      }

      const p1Name = match.player1?.name || 'TBD';
      const p2Name = match.player2?.name || 'TBD';
      const scoreText = match.status === 'completed' ? ` ${match.score || ''}` : '';
      const winnerMark = match.winner
        ? (match.player1?.id === match.winner ? '> ' : '  ')
        : '  ';
      const loserMark = match.winner
        ? (match.player2?.id === match.winner ? ' <' : '')
        : '';

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(COLORS.primary)
        .text(
          `${winnerMark}${p1Name}  vs  ${p2Name}${loserMark}${scoreText}`,
          MARGIN + 10, currentY, { lineBreak: false }
        );
      currentY += 14;
    }
  }
}

/**
 * Render standings table for a round robin group
 */
function renderStandingsTable(doc, group, startY) {
  const players = group.players || [];
  const standings = group.standings || [];
  const hasStandings = standings.length > 0;

  // Table headers
  const cols = [
    { label: 'Pos', x: MARGIN, width: 30 },
    { label: 'Player', x: MARGIN + 30, width: 200 },
    { label: 'P', x: MARGIN + 230, width: 30 },
    { label: 'W', x: MARGIN + 260, width: 30 },
    { label: 'L', x: MARGIN + 290, width: 30 },
    { label: 'Pts', x: MARGIN + 320, width: 35 }
  ];

  // Header row
  doc.rect(MARGIN, startY, 355, 16).fill(COLORS.headerBg);
  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.headerText);
  for (const col of cols) {
    doc.text(col.label, col.x + 3, startY + 4, { width: col.width - 6, align: col.label === 'Player' ? 'left' : 'center', lineBreak: false });
  }

  let y = startY + 16;

  const rows = hasStandings ? standings : players.map((p, i) => ({
    playerName: p.name,
    played: 0,
    won: 0,
    lost: 0,
    points: 0,
    _pos: i + 1
  }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isEven = i % 2 === 0;

    if (isEven) {
      doc.rect(MARGIN, y, 355, 14).fill(COLORS.lightBg);
    }

    doc.fontSize(8).font('Helvetica').fillColor(COLORS.primary);
    doc.text(`${i + 1}`, cols[0].x + 3, y + 3, { width: cols[0].width - 6, align: 'center', lineBreak: false });
    doc.text(row.playerName || row.name || 'Unknown', cols[1].x + 3, y + 3, { width: cols[1].width - 6, lineBreak: false });
    doc.text(`${row.played || 0}`, cols[2].x + 3, y + 3, { width: cols[2].width - 6, align: 'center', lineBreak: false });
    doc.text(`${row.won || 0}`, cols[3].x + 3, y + 3, { width: cols[3].width - 6, align: 'center', lineBreak: false });
    doc.text(`${row.lost || 0}`, cols[4].x + 3, y + 3, { width: cols[4].width - 6, align: 'center', lineBreak: false });
    doc.text(`${row.points || 0}`, cols[5].x + 3, y + 3, { width: cols[5].width - 6, align: 'center', lineBreak: false });
    y += 14;
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
