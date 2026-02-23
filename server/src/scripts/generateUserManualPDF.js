import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const COLORS = {
  primary: '#1E3A5F',
  text: '#1F2937',
  secondary: '#6B7280',
  accent: '#2563EB',
  border: '#D1D5DB',
  lightBg: '#F3F4F6',
  headerBg: '#1E3A5F',
  white: '#FFFFFF',
  green: '#059669',
  tableBorder: '#E5E7EB',
  tableHeader: '#F9FAFB',
};

let doc;
let currentY;

function ensureSpace(needed) {
  if (currentY + needed > PAGE_HEIGHT - MARGIN - 30) {
    doc.addPage();
    currentY = MARGIN;
  }
}

function drawLine(y, color = COLORS.border) {
  doc.strokeColor(color).lineWidth(0.5)
    .moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke();
}

function coverPage() {
  // Background
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.primary);

  // Decorative line
  doc.rect(MARGIN, 280, CONTENT_WIDTH, 3).fill(COLORS.accent);

  // Title
  doc.font('Helvetica-Bold').fontSize(32).fillColor(COLORS.white);
  doc.text('User Manual', MARGIN, 310, { width: CONTENT_WIDTH, align: 'center' });

  doc.fontSize(18).fillColor('#93C5FD');
  doc.text('Tournament & League Management', MARGIN, 355, { width: CONTENT_WIDTH, align: 'center' });

  // Decorative line
  doc.rect(MARGIN, 395, CONTENT_WIDTH, 3).fill(COLORS.accent);

  // Organization
  doc.font('Helvetica').fontSize(14).fillColor('#D1D5DB');
  doc.text('Zambia Tennis Association', MARGIN, 430, { width: CONTENT_WIDTH, align: 'center' });

  doc.fontSize(11).fillColor('#9CA3AF');
  doc.text('Version 1.0  |  February 2026', MARGIN, 460, { width: CONTENT_WIDTH, align: 'center' });

  // Footer
  doc.fontSize(9).fillColor('#6B7280');
  doc.text('zambiatennisassociation.com', MARGIN, PAGE_HEIGHT - 80, { width: CONTENT_WIDTH, align: 'center' });

  doc.addPage();
  currentY = MARGIN;
}

function tocPage() {
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.primary);
  doc.text('Table of Contents', MARGIN, currentY);
  currentY += 40;

  const items = [
    ['1', 'Getting Started', 3],
    ['2', 'Tournament Management', 4],
    ['  2.1', 'Creating a Tournament', 4],
    ['  2.2', 'Managing Entries', 5],
    ['  2.3', 'Generating Draws', 6],
    ['  2.4', 'Order of Play & Scheduling', 7],
    ['  2.5', 'Umpire Pool', 8],
    ['  2.6', 'Live Scoring', 8],
    ['  2.7', 'Results & Finalization', 9],
    ['  2.8', 'Finance', 10],
    ['3', 'League Management', 11],
    ['  3.1', 'Creating a League', 11],
    ['  3.2', 'Club Registration & Approval', 12],
    ['  3.3', 'Generating Fixtures', 12],
    ['  3.4', 'Entering Match Scores', 13],
    ['  3.5', 'Standings', 14],
    ['  3.6', 'Playoffs', 14],
    ['4', 'Rankings Management', 15],
    ['5', 'Public Registration', 16],
    ['6', 'Umpire Guide', 17],
    ['7', 'Live Scoreboard', 18],
    ['8', 'Troubleshooting', 18],
  ];

  for (const [num, title] of items) {
    const isSubItem = num.startsWith('  ');
    const x = isSubItem ? MARGIN + 20 : MARGIN;
    const font = isSubItem ? 'Helvetica' : 'Helvetica-Bold';
    const size = isSubItem ? 10 : 11;

    doc.font(font).fontSize(size).fillColor(COLORS.text);
    doc.text(`${num.trim()}   ${title}`, x, currentY, { width: CONTENT_WIDTH });
    currentY += 18;
  }

  doc.addPage();
  currentY = MARGIN;
}

function sectionHeader(number, title) {
  ensureSpace(50);
  if (currentY > MARGIN + 10) currentY += 10;

  doc.rect(MARGIN, currentY, CONTENT_WIDTH, 32).fill(COLORS.primary);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white);
  doc.text(`${number}. ${title}`, MARGIN + 12, currentY + 8, { width: CONTENT_WIDTH - 24 });
  currentY += 44;
}

function subHeader(number, title) {
  ensureSpace(35);
  currentY += 6;
  doc.rect(MARGIN, currentY, CONTENT_WIDTH, 1).fill(COLORS.accent);
  currentY += 6;

  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary);
  doc.text(`${number} ${title}`, MARGIN, currentY);
  currentY += 22;
}

function subSubHeader(title) {
  ensureSpace(25);
  currentY += 4;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text);
  doc.text(title, MARGIN, currentY);
  currentY += 18;
}

function para(text) {
  ensureSpace(20);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
  const h = doc.heightOfString(text, { width: CONTENT_WIDTH });
  ensureSpace(h + 4);
  doc.text(text, MARGIN, currentY, { width: CONTENT_WIDTH, lineGap: 2 });
  currentY += h + 8;
}

function bullet(text) {
  ensureSpace(18);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
  const bulletX = MARGIN + 8;
  const textX = MARGIN + 20;
  const tw = CONTENT_WIDTH - 20;
  const h = doc.heightOfString(text, { width: tw });
  ensureSpace(h + 2);
  doc.text('\u2022', MARGIN, currentY);
  doc.text(text, textX, currentY, { width: tw, lineGap: 2 });
  currentY += h + 4;
}

function numberedItem(num, text) {
  ensureSpace(18);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent);
  doc.text(`${num}.`, MARGIN, currentY);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
  const textX = MARGIN + 20;
  const tw = CONTENT_WIDTH - 20;
  const h = doc.heightOfString(text, { width: tw });
  ensureSpace(h + 2);
  doc.text(text, textX, currentY, { width: tw, lineGap: 2 });
  currentY += h + 6;
}

function table(headers, rows) {
  const colCount = headers.length;
  const colWidth = CONTENT_WIDTH / colCount;
  const rowHeight = 22;

  ensureSpace(rowHeight * 2 + 10);

  // Header row
  doc.rect(MARGIN, currentY, CONTENT_WIDTH, rowHeight).fill(COLORS.primary);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white);
  headers.forEach((h, i) => {
    doc.text(h, MARGIN + i * colWidth + 6, currentY + 6, { width: colWidth - 12 });
  });
  currentY += rowHeight;

  // Data rows
  rows.forEach((row, rowIdx) => {
    const bgColor = rowIdx % 2 === 0 ? COLORS.white : COLORS.tableHeader;
    const textHeights = row.map((cell, i) => {
      return doc.font('Helvetica').fontSize(9).heightOfString(String(cell), { width: colWidth - 12 });
    });
    const rh = Math.max(rowHeight, Math.max(...textHeights) + 10);

    ensureSpace(rh + 2);
    doc.rect(MARGIN, currentY, CONTENT_WIDTH, rh).fill(bgColor);
    doc.rect(MARGIN, currentY, CONTENT_WIDTH, rh).stroke(COLORS.tableBorder);

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
    row.forEach((cell, i) => {
      doc.text(String(cell), MARGIN + i * colWidth + 6, currentY + 5, { width: colWidth - 12 });
    });
    currentY += rh;
  });
  currentY += 8;
}

function tip(text) {
  ensureSpace(30);
  const h = doc.font('Helvetica').fontSize(9).heightOfString(text, { width: CONTENT_WIDTH - 30 });
  const boxH = h + 14;
  ensureSpace(boxH + 4);
  doc.rect(MARGIN, currentY, CONTENT_WIDTH, boxH).fill('#EFF6FF');
  doc.rect(MARGIN, currentY, 3, boxH).fill(COLORS.accent);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.accent);
  doc.text('TIP:', MARGIN + 10, currentY + 7);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  doc.text(text, MARGIN + 32, currentY + 7, { width: CONTENT_WIDTH - 44 });
  currentY += boxH + 8;
}

function warning(text) {
  ensureSpace(30);
  const h = doc.font('Helvetica').fontSize(9).heightOfString(text, { width: CONTENT_WIDTH - 58 });
  const boxH = h + 14;
  ensureSpace(boxH + 4);
  doc.rect(MARGIN, currentY, CONTENT_WIDTH, boxH).fill('#FEF2F2');
  doc.rect(MARGIN, currentY, 3, boxH).fill('#DC2626');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#DC2626');
  doc.text('WARNING:', MARGIN + 10, currentY + 7);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  doc.text(text, MARGIN + 60, currentY + 7, { width: CONTENT_WIDTH - 72 });
  currentY += boxH + 8;
}

function note(text) {
  ensureSpace(30);
  const h = doc.font('Helvetica').fontSize(9).heightOfString(text, { width: CONTENT_WIDTH - 44 });
  const boxH = h + 14;
  ensureSpace(boxH + 4);
  doc.rect(MARGIN, currentY, CONTENT_WIDTH, boxH).fill('#F0FDF4');
  doc.rect(MARGIN, currentY, 3, boxH).fill(COLORS.green);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.green);
  doc.text('NOTE:', MARGIN + 10, currentY + 7);
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  doc.text(text, MARGIN + 40, currentY + 7, { width: CONTENT_WIDTH - 52 });
  currentY += boxH + 8;
}

function pathLine(text) {
  ensureSpace(22);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.accent);
  doc.text(`Path: ${text}`, MARGIN, currentY);
  currentY += 16;
}

function generateManual() {
  const outputPath = path.resolve(__dirname, '../../../docs/ZTA-User-Manual.pdf');
  doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // ============================================================
  // COVER PAGE
  // ============================================================
  coverPage();

  // ============================================================
  // TABLE OF CONTENTS
  // ============================================================
  tocPage();

  // ============================================================
  // 1. GETTING STARTED
  // ============================================================
  sectionHeader('1', 'Getting Started');

  subSubHeader('Logging In');
  numberedItem(1, 'Go to zambiatennisassociation.com/login');
  numberedItem(2, 'Enter your email and password');
  numberedItem(3, 'Click Sign In');

  subSubHeader('User Roles');
  table(
    ['Role', 'Access Level'],
    [
      ['Admin', 'Full access to all features'],
      ['Staff', 'Same as Admin (except deleting tournaments/leagues)'],
      ['Club Official', 'Register club for leagues, enter scores for own club\'s matches'],
      ['Player', 'View tournaments, register, view rankings'],
      ['Public (no login)', 'Browse tournaments, register players, view live scores'],
    ]
  );

  subSubHeader('Navigation');
  para('After logging in as Admin/Staff, use the Admin Dashboard to access:');
  bullet('Manage Tournaments - for tournament management');
  bullet('Manage Leagues - for league management');
  bullet('Manage Rankings - for player rankings');

  // ============================================================
  // 2. TOURNAMENT MANAGEMENT
  // ============================================================
  sectionHeader('2', 'Tournament Management');

  subHeader('2.1', 'Creating a Tournament');
  pathLine('Admin Dashboard > Manage Tournaments > Create Tournament');

  subSubHeader('Step 1: Basic Information');
  para('Fill in the required tournament details:');
  table(
    ['Field', 'Description'],
    [
      ['Tournament Name', 'e.g. "2026 Lusaka Open"'],
      ['Description', 'Brief tournament overview'],
      ['Start / End Date', 'Tournament dates'],
      ['Venue', 'e.g. "Olympic Youth Development Centre"'],
      ['City / Province', 'Location details'],
      ['Entry Deadline', 'Last date players can enter'],
      ['Entry Fee', 'Amount in Kwacha (set 0 for free)'],
      ['Tournament Level', 'Club, Regional, National, or International'],
      ['Organizer', 'Defaults to "ZTA"'],
      ['Contact Email / Phone', 'For enquiries'],
    ]
  );

  subSubHeader('Step 2: Categories');
  para('Choose the tournament type (Junior, Senior, Madalas, or Mixed) and select categories:');
  bullet('Junior: Boys/Girls U10, U12, U14, U16, U18');
  bullet('Senior: Men\'s/Women\'s Singles, Doubles, Mixed Doubles');
  bullet('Madalas: 35+, 45+, 55+, 65+ Singles & Doubles');
  para('For each category, choose a draw type (Single Elimination, Round Robin, Feed-in, or Mixer) and set maximum entries.');

  subSubHeader('Step 3: Registration Settings');
  table(
    ['Setting', 'What it does'],
    [
      ['Allow Public Registration', 'Anyone can register without logging in'],
      ['Allow Multiple Categories', 'Players can enter more than one category'],
      ['Require Payment Upfront', 'Entry not accepted until paid'],
    ]
  );

  subSubHeader('Step 4: Courts');
  para('Add the names of available courts (e.g. "Court 1", "Centre Court"). These are used for scheduling and live scoring.');

  // 2.2 Managing Entries
  subHeader('2.2', 'Managing Entries');
  pathLine('Admin > Tournament > Entries tab');

  subSubHeader('Entry Statuses');
  table(
    ['Status', 'Meaning'],
    [
      ['Pending Payment', 'Player registered but hasn\'t paid'],
      ['Pending', 'Payment confirmed, awaiting admin approval'],
      ['Accepted', 'Approved and included in draw'],
      ['Rejected', 'Entry rejected (with reason)'],
    ]
  );

  subSubHeader('Processing Entries');
  para('Select a category from the dropdown, then use the action buttons next to each entry:');
  bullet('Confirm Payment - Mark as paid (moves to Pending Approval)');
  bullet('Waive Payment - Remove payment requirement');
  bullet('Waive Surcharge - Remove the 50% surcharge for non-ZPIN players');
  bullet('Accept - Approve the entry for the draw');
  bullet('Reject - Reject with a reason');

  subSubHeader('Bulk Actions');
  para('Select multiple entries using checkboxes, then choose a bulk action: Bulk Approve, Bulk Confirm Payment, Bulk Waive Payment, or Bulk Waive Surcharge.');

  subSubHeader('Seeding');
  bullet('Manual seeding: Assign a seed number to individual accepted entries');
  bullet('Auto-seed: Click "Auto Seed" to seed based on player rankings automatically');
  note('Only accepted entries can be seeded. Seed 1 is the highest-ranked player.');

  // 2.3 Generating Draws
  subHeader('2.3', 'Generating Draws');
  pathLine('Admin > Tournament > Draws tab');
  para('Prerequisites: At least 4 accepted entries in the category. Seeding is recommended.');

  subSubHeader('Single Elimination');
  para('Click "Generate Draw". The system automatically:');
  numberedItem(1, 'Calculates bracket size (8, 16, 32, or 64)');
  numberedItem(2, 'Places seeded players in ITF standard positions');
  numberedItem(3, 'Assigns BYEs to top seeds when entries don\'t fill the bracket');
  numberedItem(4, 'Advances BYE winners to Round 2');
  numberedItem(5, 'Names rounds automatically (Quarter Finals, Semi Finals, Final, etc.)');

  subSubHeader('Round Robin');
  para('Players are distributed into groups (typically 3-6 per group). All-play-all matches are generated within each group.');

  subSubHeader('Mixer (Madalas Social Doubles)');
  numberedItem(1, 'Assign A or B ratings to all players (A = stronger, B = developing)');
  numberedItem(2, 'Ensure roughly equal numbers of A and B rated players');
  numberedItem(3, 'Click "Generate Draw" - the circle rotation method creates rounds');
  para('Each round has courts with 2 pairs (4 players). A-rated players stay, B-rated players rotate each round.');

  warning('Regenerating a draw will erase all existing results for that category.');

  // 2.4 Order of Play
  subHeader('2.4', 'Order of Play & Scheduling');
  pathLine('Admin > Tournament > Order of Play tab');

  subSubHeader('Adding Courts');
  para('Type a court name (e.g. "Court 1") and click "Add Court". Repeat for all available courts.');

  subSubHeader('Scheduling Matches');
  numberedItem(1, 'View the match list (filter: All, Unscheduled, or Scheduled)');
  numberedItem(2, 'For each match, assign a Court and set the Date and Time');
  numberedItem(3, 'Click "Save Schedule" to save all changes');
  tip('Click "Preview" to see the schedule in a print-friendly format organized by date and court.');

  // 2.5 Umpire Pool
  subHeader('2.5', 'Umpire Pool');
  pathLine('Admin > Tournament > Umpires tab');
  para('The umpire pool lets you pre-select which players will help umpire at the tournament. When starting a live match, only pool members appear in the Chair Umpire dropdown.');

  subSubHeader('Adding Umpires');
  numberedItem(1, 'Type a player\'s name in the search box');
  numberedItem(2, 'Search results appear after 2+ characters');
  numberedItem(3, 'Click a player to add them to the pool');
  numberedItem(4, 'Click "Save" to persist changes');

  subSubHeader('Removing Umpires');
  para('Click the X button next to an umpire\'s name, then click "Save".');
  note('If the pool is empty, the Chair Umpire dropdown will show all registered players as a fallback.');

  // 2.6 Live Scoring
  subHeader('2.6', 'Live Scoring');
  pathLine('Admin > Tournament > Results tab');
  para('Live scoring allows point-by-point match tracking with real-time updates on the public scoreboard.');

  subSubHeader('Starting a Live Match (Admin)');
  numberedItem(1, 'Find the match in the draw and click "Live Score"');
  numberedItem(2, 'Configure match settings:');

  table(
    ['Setting', 'Options'],
    [
      ['Best of', '3 sets or 5 sets'],
      ['Short sets', 'First to 4 games (for U10 categories)'],
      ['Deciding set', 'Super Tiebreak (first to 10) or Full Set'],
      ['No-Ad scoring', 'Sudden death at deuce'],
      ['Court', 'Select from tournament courts'],
      ['Chair Umpire', 'Select from umpire pool'],
    ]
  );

  numberedItem(3, 'Click "Start Match"');
  para('The assigned umpire will see the match on their Umpire Dashboard and can begin scoring from their device. See Section 6 for the full umpire workflow.');

  // 2.7 Results
  subHeader('2.7', 'Results & Finalization');
  pathLine('Admin > Tournament > Results tab');

  subSubHeader('Manual Result Entry');
  para('For matches not scored live:');
  numberedItem(1, 'Find the match and click "Enter Score"');
  numberedItem(2, 'Select the Winner');
  numberedItem(3, 'Enter the Score (e.g. "6-4 6-3" or "6-7(5) 6-4 10-8")');
  numberedItem(4, 'Click "Save" - the winner automatically advances to the next round');

  subSubHeader('Finalizing Results');
  para('Once all matches in a category are completed:');
  numberedItem(1, 'Click "Finalize Results" and confirm');
  numberedItem(2, 'The system locks all results and computes final standings');
  numberedItem(3, 'Champion, Runner-up, and Semi-finalists are determined');
  warning('Finalization cannot be undone. Make sure all results are correct before finalizing.');

  // 2.8 Finance
  subHeader('2.8', 'Finance');
  pathLine('Admin > Tournament > Finance tab');

  subSubHeader('Budget Planning');
  para('Create budget line items before the tournament:');
  numberedItem(1, 'Click "Add Budget Line"');
  numberedItem(2, 'Select type: Income or Expense');
  numberedItem(3, 'Choose a category, enter description and budgeted amount');
  numberedItem(4, 'Click Save');

  para('Income categories: Entry Fees, Sponsorship, Food Sales, Merchandise, Other');
  para('Expense categories: Venue, Balls, Trophies, Umpires, Transport, Meals, Accommodation, Printing, Medical, Equipment, Marketing, Administration, Other');

  subSubHeader('Recording Expenses');
  para('During or after the tournament, click "Add Expense" and fill in: category, description, amount, date, paid to, payment method, and receipt reference.');

  subSubHeader('Recording Additional Income');
  para('For income beyond entry fees (e.g. sponsorships), click "Add Income" and fill in the details.');

  subSubHeader('Financial Summary');
  table(
    ['Metric', 'Description'],
    [
      ['Budgeted Income', 'Total planned income'],
      ['Budgeted Expenses', 'Total planned expenses'],
      ['Projected Profit', 'Budgeted income minus budgeted expenses'],
      ['Actual Income', 'Entry fees collected + manual income'],
      ['Actual Expenses', 'All recorded expenses'],
      ['Actual Profit', 'Actual income minus actual expenses'],
    ]
  );

  subSubHeader('Export Reports');
  bullet('Download Budget PDF - budget plan document');
  bullet('Download Finance Report PDF - full income/expense report with variance analysis');

  // ============================================================
  // 3. LEAGUE MANAGEMENT
  // ============================================================
  sectionHeader('3', 'League Management');

  subHeader('3.1', 'Creating a League');
  pathLine('Admin Dashboard > Manage Leagues > Create League');

  table(
    ['Field', 'Description'],
    [
      ['Name', 'e.g. "2026 Northern Region Men\'s League"'],
      ['Season / Year', 'e.g. "2026"'],
      ['Region', 'Northern or Southern'],
      ['Gender', 'Men or Women'],
      ['Start / End Date', 'League season dates'],
      ['Status', 'Upcoming, Active, Completed, or Cancelled'],
      ['Teams', 'Select clubs to include'],
    ]
  );

  subSubHeader('Match Format');
  table(
    ['Format', 'Structure'],
    [
      ['2 Singles + 1 Doubles (2s1d)', 'Standard: 3 rubbers per tie'],
      ['3 Singles + 2 Doubles (3s2d)', 'Extended: 5 rubbers per tie'],
      ['4 Singles + 1 Doubles (4s1d)', 'Full singles: 5 rubbers per tie'],
    ]
  );

  subSubHeader('Advanced Settings');
  table(
    ['Setting', 'Options'],
    [
      ['Best of', '3 sets or 5 sets'],
      ['Match tiebreak', '10-point tiebreak in deciding set (yes/no)'],
      ['No-Ad scoring', 'Sudden death at deuce (yes/no)'],
      ['Points for Win / Draw / Loss', 'Default: 3 / 1 / 0'],
      ['Number of rounds', 'Round-robin count'],
    ]
  );

  // 3.2 Club Registration
  subHeader('3.2', 'Club Registration & Approval');

  subSubHeader('How Clubs Register');
  numberedItem(1, 'A Club Official logs in and goes to the Leagues page');
  numberedItem(2, 'They see a banner for upcoming leagues');
  numberedItem(3, 'They click "Register Club" for the relevant league');
  numberedItem(4, 'Registration is submitted for admin approval');

  subSubHeader('Approving Registrations (Admin)');
  numberedItem(1, 'Go to Admin > Leagues and click "View Registrations"');
  numberedItem(2, 'For each registration, click Approve or Reject');
  para('Approving a registration automatically adds the club to the league\'s team list.');

  // 3.3 Generating Fixtures
  subHeader('3.3', 'Generating Fixtures');
  pathLine('Admin > Leagues > Select League > Generate Ties');

  numberedItem(1, 'Click "Generate Ties"');
  numberedItem(2, 'The system creates a round-robin schedule where every team plays every other team');
  numberedItem(3, 'Fixtures are assigned dates from the ZTA Calendar (if "League Match Day" events exist) or at weekly intervals');
  numberedItem(4, 'For coordinated scheduling, fixtures mirror the opposite-gender league in the same region');

  tip('Add "League Match Day" events to the ZTA Calendar before generating ties for accurate scheduling.');

  // 3.4 Entering Scores
  subHeader('3.4', 'Entering Match Scores');
  para('Scores can be entered by Admins, Staff, or the Club Official of either team in the tie.');

  subSubHeader('Step 1: Assign Players');
  numberedItem(1, 'Go to Leagues > select the league > Fixtures tab');
  numberedItem(2, 'Find the tie and click "Enter Scores"');
  numberedItem(3, 'For each rubber, select home and away players from the team rosters');
  numberedItem(4, 'For doubles rubbers, select two players per side');

  subSubHeader('Step 2: Enter Scores');
  numberedItem(1, 'Enter games won for each set (e.g. Home 6, Away 4)');
  numberedItem(2, 'For 7-6 sets, enter the tiebreak score');
  numberedItem(3, 'For deciding-set tiebreaks, enter the match tiebreak score (first to 10)');
  numberedItem(4, 'The system validates scores and determines the rubber winner automatically');
  numberedItem(5, 'Click "Save" after each rubber');
  para('When all rubbers are scored, the tie is automatically marked as Completed.');

  subSubHeader('Walkovers');
  para('If a team cannot play, Admin clicks "Walkover" on the tie, selects which team forfeits, and enters a reason. All rubbers are awarded to the opposing team.');

  // 3.5 Standings
  subHeader('3.5', 'Standings');
  pathLine('Leagues > Select League > Standings tab');
  para('Standings update automatically after each completed tie.');

  table(
    ['Column', 'Meaning'],
    [
      ['P', 'Matches (ties) played'],
      ['W', 'Ties won'],
      ['D', 'Ties drawn'],
      ['L', 'Ties lost'],
      ['RF / RA', 'Rubbers for / against'],
      ['Pts', 'League points'],
    ]
  );

  subSubHeader('Tiebreaker Rules (ITF-Aligned)');
  para('When teams are level on points, tiebreakers are applied in this order:');
  numberedItem(1, 'Head-to-head record between tied teams');
  numberedItem(2, 'Rubber difference (rubbers for minus rubbers against)');
  numberedItem(3, 'Total rubbers for');
  numberedItem(4, 'Set difference');
  numberedItem(5, 'Total sets for');
  numberedItem(6, 'Game difference');
  numberedItem(7, 'Total games for');

  // 3.6 Playoffs
  subHeader('3.6', 'Playoffs');
  pathLine('Admin > Leagues > Generate Playoffs');

  para('Prerequisites: Both the Northern and Southern leagues for the same gender must have completed standings with at least 2 teams each.');

  numberedItem(1, 'Click "Generate Playoffs"');
  numberedItem(2, 'The system creates: Semi-Final 1 (Region 1 Winner vs Region 2 Runner-up), Semi-Final 2 (Region 2 Winner vs Region 1 Runner-up), and the Final');
  numberedItem(3, 'Scores are entered the same way as regular ties');
  para('The public can view the playoff bracket on the Leagues page under the Playoffs tab.');

  // ============================================================
  // 4. RANKINGS MANAGEMENT
  // ============================================================
  sectionHeader('4', 'Rankings Management');
  pathLine('Public menu > Rankings');

  para('Rankings are organized into 18 categories:');
  table(
    ['Group', 'Categories'],
    [
      ['Senior', 'Men\'s Senior, Women\'s Senior'],
      ['Junior Boys', 'U10, U12, U14, U16, U18'],
      ['Junior Girls', 'U10, U12, U14, U16, U18'],
      ['Doubles', 'Men\'s, Women\'s, Mixed'],
      ['Madalas', 'Overall (35+), Ladies (35+)'],
    ]
  );

  subSubHeader('Adding Rankings Manually');
  para('On the Rankings page, use the admin form at the top to enter Rank, Player Name, Club, and Total Points, then click "Add".');

  subSubHeader('Importing Rankings from CSV');
  pathLine('Rankings > Import from CSV');
  numberedItem(1, 'Click "Download Template" to get the CSV format');
  numberedItem(2, 'Fill in: Rank, Player Name, Club, Total Points, ZPIN (optional)');
  numberedItem(3, 'Upload the CSV file');
  numberedItem(4, 'Select the Category and enter the Ranking Period (e.g. "2026")');
  numberedItem(5, 'Preview the data and click "Import"');

  note('Madalas rankings update automatically when mixer tournament results are finalized.');

  // ============================================================
  // 5. PUBLIC REGISTRATION
  // ============================================================
  sectionHeader('5', 'Public Registration');
  para('Players or their parents/coaches can register for tournaments without logging in.');

  numberedItem(1, 'Go to the tournament page and click "Register Players"');
  numberedItem(2, 'Search for existing players by name or ZPIN, or click "Add New Player" and enter their details');
  numberedItem(3, 'Select an eligible category for each player (age eligibility is checked automatically)');
  numberedItem(4, 'Review the entry summary including fees (50% surcharge applies for players without a paid ZPIN)');
  numberedItem(5, 'Enter payer information: name, email, phone');
  numberedItem(6, 'Choose payment: "Pay Now" (card or mobile money) or "Pay Later" (payment link sent by email, expires in 72 hours)');
  numberedItem(7, 'Confirmation email is sent with registration details');

  // ============================================================
  // 6. UMPIRE GUIDE
  // ============================================================
  sectionHeader('6', 'Umpire Guide');

  subSubHeader('Accessing Your Matches');
  numberedItem(1, 'Log in to the ZTA website');
  numberedItem(2, 'If you have assigned matches, a banner appears on the home page');
  numberedItem(3, 'Click "Go to Umpire Dashboard" or navigate to /umpire');

  subSubHeader('Step 1: Select First Server');
  numberedItem(1, 'When you open an assigned match, you see "Who serves first?"');
  numberedItem(2, 'Tap the player who won the toss and chose to serve');
  numberedItem(3, 'The selected player is highlighted');
  numberedItem(4, 'Tap "Start Scoring" to proceed');

  subSubHeader('Step 2: Award Points');
  para('The scoring screen shows a score display at the top and two large buttons (one for each player).');
  numberedItem(1, 'Tap the name of the player who won the point');
  numberedItem(2, 'The score updates automatically');
  numberedItem(3, 'Games, sets, and tiebreaks are all tracked by the system');
  numberedItem(4, 'The match ends automatically when a player wins the required sets');

  subSubHeader('Match Controls');
  bullet('Undo - Reverses the last point (can undo multiple times)');
  bullet('Suspend Match - Pauses the match (rain delays, etc.)');
  bullet('Resume Match - Continues a suspended match');
  bullet('End Match - Ends early with a reason: Retirement, Walkover, or Default');

  tip('Your phone will vibrate slightly with each point tap for haptic feedback.');

  // ============================================================
  // 7. LIVE SCOREBOARD
  // ============================================================
  sectionHeader('7', 'Live Scoreboard');

  subSubHeader('For Spectators');
  para('Go to zambiatennisassociation.com/live-scores to see all matches currently in progress. Each match card shows:');
  bullet('Tournament name and category');
  bullet('Player names and seeds');
  bullet('Current score (sets, games, points)');
  bullet('Match status (Warmup, LIVE, Suspended, Final)');
  bullet('Court assignment and match duration');
  para('Scores update in real-time - no need to refresh the page.');

  subSubHeader('For Tournament Organizers');
  bullet('Share the scoreboard link on social media during tournaments');
  bullet('The scoreboard works on phones, tablets, and large screens');
  bullet('Consider displaying it on a TV at the venue');

  // ============================================================
  // 8. TROUBLESHOOTING
  // ============================================================
  sectionHeader('8', 'Troubleshooting');

  table(
    ['Problem', 'Solution'],
    [
      ['Can\'t generate a draw', 'Ensure at least 4 entries are Accepted'],
      ['Player not in search', 'Check they are registered with role "player"'],
      ['Entry fee shows surcharge', 'Player has no paid ZPIN. Admin can waive surcharge'],
      ['Umpire can\'t see match', 'Ensure correct umpire was selected from pool'],
      ['Live scores not updating', 'Check internet connection (uses WebSocket)'],
      ['Can\'t finalize results', 'All matches must be completed first'],
      ['Standings not showing', 'At least one tie must be completed'],
      ['Playoff generation fails', 'Both regional leagues need standings'],
      ['CSV import errors', 'Ensure columns match template format'],
      ['Payment link expired', 'Links expire in 72 hours. Admin can confirm manually'],
    ]
  );

  currentY += 10;
  para('For technical support, contact the ZTA administration team at support@zambiatennisassociation.com.');

  // ============================================================
  // PAGE NUMBERS
  // ============================================================
  const pages = doc.bufferedPageRange();
  for (let i = 1; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.secondary);
    doc.text(
      `Page ${i} of ${pages.count - 1}`,
      MARGIN, PAGE_HEIGHT - 30,
      { width: CONTENT_WIDTH, align: 'center' }
    );
    drawLine(PAGE_HEIGHT - 40, COLORS.tableBorder);
    doc.text('Zambia Tennis Association', MARGIN, PAGE_HEIGHT - 30, { width: CONTENT_WIDTH, align: 'left' });
  }

  doc.end();

  stream.on('finish', () => {
    console.log(`PDF generated: ${outputPath}`);
  });
}

generateManual();
