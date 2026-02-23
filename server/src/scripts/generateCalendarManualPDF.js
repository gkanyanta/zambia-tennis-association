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
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.primary);

  doc.rect(MARGIN, 280, CONTENT_WIDTH, 3).fill(COLORS.accent);

  doc.font('Helvetica-Bold').fontSize(32).fillColor(COLORS.white);
  doc.text('User Manual', MARGIN, 310, { width: CONTENT_WIDTH, align: 'center' });

  doc.fontSize(18).fillColor('#93C5FD');
  doc.text('Calendar & Event Management', MARGIN, 355, { width: CONTENT_WIDTH, align: 'center' });

  doc.rect(MARGIN, 395, CONTENT_WIDTH, 3).fill(COLORS.accent);

  doc.font('Helvetica').fontSize(14).fillColor('#D1D5DB');
  doc.text('Zambia Tennis Association', MARGIN, 430, { width: CONTENT_WIDTH, align: 'center' });

  doc.fontSize(11).fillColor('#9CA3AF');
  doc.text('Version 1.0  |  February 2026', MARGIN, 460, { width: CONTENT_WIDTH, align: 'center' });

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
    ['1', 'Overview', 3],
    ['2', 'Event Types', 3],
    ['3', 'Admin Calendar Management', 4],
    ['  3.1', 'Accessing the Calendar Admin', 4],
    ['  3.2', 'Creating an Event', 4],
    ['  3.3', 'Editing an Event', 5],
    ['  3.4', 'Publishing & Unpublishing Events', 5],
    ['  3.5', 'Deleting an Event', 6],
    ['  3.6', 'Searching & Filtering', 6],
    ['4', 'Public Calendar View', 7],
    ['5', 'League Match Day Integration', 7],
    ['  5.1', 'How It Works', 7],
    ['  5.2', 'Creating League Match Days', 8],
    ['  5.3', 'Fixture Generation & Calendar Dates', 8],
    ['  5.4', 'Playoff Scheduling', 9],
    ['6', 'Calendar Fixtures View', 9],
    ['7', 'Importing Calendar Data', 10],
    ['8', 'Best Practices', 10],
    ['9', 'Troubleshooting', 11],
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

  doc.rect(MARGIN, currentY, CONTENT_WIDTH, rowHeight).fill(COLORS.primary);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white);
  headers.forEach((h, i) => {
    doc.text(h, MARGIN + i * colWidth + 6, currentY + 6, { width: colWidth - 12 });
  });
  currentY += rowHeight;

  rows.forEach((row, rowIdx) => {
    const bgColor = rowIdx % 2 === 0 ? COLORS.white : COLORS.tableHeader;
    const textHeights = row.map((cell) => {
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
  const outputPath = path.resolve(__dirname, '../../../docs/ZTA-Calendar-Manual.pdf');
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
  // 1. OVERVIEW
  // ============================================================
  sectionHeader('1', 'Overview');

  para('The ZTA Calendar is the central hub for all Zambia Tennis Association events. It serves two purposes:');
  bullet('Public visibility — Players, coaches, and fans can browse upcoming tournaments, education sessions, social events, and league match days on the public calendar page.');
  bullet('League scheduling — When generating league fixtures, the system uses calendar events of type "League" to assign match dates automatically. This ensures all league ties align with the official ZTA schedule.');

  para('The calendar supports six event types, draft/published states, and integration with both leagues and tournaments. Admin and Staff users manage events through the Calendar Management page, while the public sees only published upcoming events.');

  // ============================================================
  // 2. EVENT TYPES
  // ============================================================
  sectionHeader('2', 'Event Types');

  para('Every calendar event has a type that determines its color badge and purpose within the system:');

  table(
    ['Type', 'Color', 'Description'],
    [
      ['Tournament', 'Blue', 'Sanctioned ZTA tournaments (ITF circuits, Opens, Club events)'],
      ['League', 'Emerald', 'League match days — used by the fixture generator to schedule ties'],
      ['Education', 'Green', 'Coaching courses, workshops, umpire training, CPD seminars'],
      ['Meeting', 'Purple', 'Board meetings, AGMs, committee meetings'],
      ['Social', 'Orange', 'Fundraisers, social mixers, award ceremonies, charity events'],
      ['Other', 'Gray', 'Anything that doesn\'t fit the above categories'],
    ]
  );

  warning('The "League" type has special system significance. When league fixtures are generated, the system queries calendar events with type "League" to determine match dates. If you need league tie dates to be auto-scheduled, you must create League-type events in the calendar first.');

  // ============================================================
  // 3. ADMIN CALENDAR MANAGEMENT
  // ============================================================
  sectionHeader('3', 'Admin Calendar Management');

  subHeader('3.1', 'Accessing the Calendar Admin');
  pathLine('Admin Dashboard > Calendar Events');
  para('Log in as an Admin or Staff user. From the Admin Dashboard, click the "Calendar Events" tile. This opens the Calendar Management page where you can view, create, edit, and delete events.');
  para('The admin view shows all events including unpublished drafts, sorted with the most recent events first. Unpublished events appear with reduced opacity and a "Draft" badge.');

  subHeader('3.2', 'Creating an Event');
  pathLine('Calendar Management > Create Event');

  numberedItem(1, 'Click the "Create Event" button at the top of the page');
  numberedItem(2, 'Fill in the event form:');

  table(
    ['Field', 'Required', 'Description'],
    [
      ['Title', 'Yes', 'Name of the event (e.g. "2026 Lusaka Open" or "League Matches - Week 3")'],
      ['Description', 'No', 'Details about the event, visible on the public calendar'],
      ['Start Date', 'Yes', 'When the event begins'],
      ['End Date', 'Yes', 'When the event ends (must be same day or later than start date)'],
      ['Location', 'No', 'Venue or city (e.g. "Olympic Youth Development Centre, Lusaka")'],
      ['Type', 'Yes', 'Select from: Tournament, League, Education, Meeting, Social, Other'],
      ['Published', 'No', 'Check to make visible on the public calendar (default: checked)'],
    ]
  );

  numberedItem(3, 'Click "Create" to save the event');

  tip('Uncheck "Published" to create a draft event that only admins can see. You can publish it later when the details are confirmed.');

  subHeader('3.3', 'Editing an Event');

  numberedItem(1, 'Find the event in the list (use search or filters if needed)');
  numberedItem(2, 'Click the pencil icon (edit button) on the event row');
  numberedItem(3, 'The edit dialog opens with all current values pre-filled');
  numberedItem(4, 'Make your changes and click "Update"');

  note('Editing a League-type event\'s dates will not automatically reschedule league ties already linked to it. To reschedule ties, you would need to regenerate the league fixtures.');

  subHeader('3.4', 'Publishing & Unpublishing Events');

  para('Each event has a published state that controls whether it appears on the public calendar:');
  bullet('Published events (eye icon) — Visible to everyone on the public calendar');
  bullet('Unpublished events (eye-off icon, "Draft" badge) — Only visible to admins on the management page');

  subSubHeader('Quick Toggle');
  para('Click the eye/eye-off icon button on any event row to instantly toggle its published state. No confirmation is required.');

  subSubHeader('Via Edit Dialog');
  para('Open the edit dialog and check or uncheck the "Published" checkbox, then click "Update".');

  tip('Use the draft state to prepare events in advance (e.g. tentative tournament dates) and publish them once confirmed.');

  subHeader('3.5', 'Deleting an Event');

  numberedItem(1, 'Click the trash icon on the event row');
  numberedItem(2, 'A confirmation dialog will appear');
  numberedItem(3, 'Click "OK" to permanently delete the event');

  warning('Deleting a League-type event that has league ties linked to it will not delete those ties, but they will lose their calendar date reference. Only delete League events if no fixtures have been generated yet.');

  subHeader('3.6', 'Searching & Filtering');

  para('The Calendar Management page provides three ways to narrow down the event list:');

  subSubHeader('Text Search');
  para('Type in the search box to filter events by title or location. The filter is applied instantly as you type.');

  subSubHeader('Filter by Type');
  para('Use the type dropdown to show only events of a specific type (Tournament, League, Education, Meeting, Social, or Other). Select "All Types" to clear the filter.');

  subSubHeader('Filter by Status');
  para('Use the status dropdown to filter by:');
  bullet('All — Show both published and unpublished events');
  bullet('Published — Only show events visible on the public calendar');
  bullet('Unpublished — Only show draft events');

  para('The page header shows a count: "Showing X of Y events" so you can see how many events match your current filters.');

  // ============================================================
  // 4. PUBLIC CALENDAR VIEW
  // ============================================================
  sectionHeader('4', 'Public Calendar View');
  pathLine('Main Menu > Calendar (zambiatennisassociation.com/calendar)');

  para('The public calendar page is accessible to everyone without logging in. It displays only published events whose end date has not passed (i.e., upcoming and ongoing events).');

  subSubHeader('Layout');
  para('The page has two sections:');
  bullet('Event List (main area) — Shows event cards in chronological order. Each card displays the date, title, type badge, description excerpt (up to 2 lines), date range, and location.');
  bullet('Sidebar — Shows an event type legend explaining the color badges, and a link to the ZTA Facebook page.');

  subSubHeader('Date Display');
  para('Events show their date range in a human-friendly format:');
  bullet('Single-day events: "23 Feb 2026"');
  bullet('Same-month range: "23 - 28 Feb 2026"');
  bullet('Cross-month range: "28 Feb - 3 Mar 2026"');

  subSubHeader('Empty State');
  para('If there are no upcoming events, the page shows a "No upcoming events" message with a calendar icon.');

  note('The public calendar does not have search or type filtering. All upcoming published events are shown in a single chronological list.');

  // ============================================================
  // 5. LEAGUE MATCH DAY INTEGRATION
  // ============================================================
  sectionHeader('5', 'League Match Day Integration');

  para('The most important system integration for the calendar is with league fixture generation. Calendar events of type "League" serve as official match days that the system uses to schedule league ties.');

  subHeader('5.1', 'How It Works');

  para('When an admin generates fixtures for a league, the system follows this priority logic:');

  numberedItem(1, 'Check for a sibling league — If a league for the opposite gender in the same region already has fixtures, the system mirrors matchups so the same clubs play on the same dates.');
  numberedItem(2, 'Check for League calendar events — If League-type calendar events exist within the league\'s date range, each match day maps to one calendar event. Ties are assigned dates from these events.');
  numberedItem(3, 'Fallback to weekly intervals — If no League calendar events exist, the system generates fixtures at 7-day intervals starting from the league\'s start date.');

  para('Each league tie stores a reference to its calendar event. This link enables the fixtures view on the public calendar.');

  subHeader('5.2', 'Creating League Match Days');

  para('To ensure league fixtures are scheduled on the correct dates, create League-type calendar events before generating fixtures:');

  numberedItem(1, 'Go to Calendar Management');
  numberedItem(2, 'Click "Create Event"');
  numberedItem(3, 'Set the type to "League"');
  numberedItem(4, 'Enter a title like "League Matches - Week 1"');
  numberedItem(5, 'Set the start and end dates for that match day');
  numberedItem(6, 'Ensure "Published" is checked');
  numberedItem(7, 'Repeat for each match day in the season');

  subSubHeader('How Many Events to Create');
  para('The number of League calendar events needed depends on the number of teams:');

  table(
    ['Teams', 'Match Days Needed', 'Example'],
    [
      ['3', '3', '3 weeks of fixtures'],
      ['4', '6', '6 weeks of fixtures'],
      ['5', '10', '10 weeks of fixtures'],
      ['6', '15', '15 weeks of fixtures'],
    ]
  );

  para('The formula is: match days = teams x (teams - 1) / 2. If your league has multiple rounds (e.g. home and away), multiply accordingly.');

  warning('If there are fewer League calendar events than required match days, fixture generation will fail with an error: "Not enough league dates on calendar." Add more League-type events before trying again.');

  subHeader('5.3', 'Fixture Generation & Calendar Dates');

  para('Once League calendar events are in place:');

  numberedItem(1, 'Go to Admin > Leagues and select the league');
  numberedItem(2, 'Click "Generate Ties"');
  numberedItem(3, 'The system will use the League calendar events to assign dates');
  numberedItem(4, 'Each tie will store a reference to its calendar event');

  subSubHeader('Mirrored Scheduling');
  para('For leagues in the same region (e.g. Northern Region Men\'s and Northern Region Women\'s), the system automatically mirrors matchups. If the men\'s league is generated first, the women\'s league will pair the same clubs on the same dates. This ensures both leagues can share venues on the same match days.');

  tip('Always generate the first league in a region before the second. The second league will automatically mirror the first for coordinated scheduling.');

  subHeader('5.4', 'Playoff Scheduling');

  para('When generating playoff brackets, the system looks for upcoming League-type calendar events:');
  bullet('Semi-finals are scheduled on the first available League calendar event after the current date');
  bullet('The Final is scheduled on the next available League calendar event');
  bullet('If no League events are available, the system falls back to 7-day intervals from the current date');

  note('Create at least 2 League-type calendar events after the regular season ends to ensure playoff dates are set correctly.');

  // ============================================================
  // 6. CALENDAR FIXTURES VIEW
  // ============================================================
  sectionHeader('6', 'Calendar Fixtures View');

  para('When a calendar event is linked to league ties or a tournament, the system provides a fixtures endpoint that returns the associated matches.');

  subSubHeader('League Events');
  para('For League-type events, the fixtures view shows all ties scheduled on that date, including:');
  bullet('Home and Away team names');
  bullet('Match round number');
  bullet('Tie result (if completed)');
  bullet('Link to the parent league');

  subSubHeader('Tournament Events');
  para('For Tournament-type events linked to a specific tournament, the fixtures view returns the tournament details, allowing navigation to the full tournament page.');

  // ============================================================
  // 7. IMPORTING CALENDAR DATA
  // ============================================================
  sectionHeader('7', 'Importing Calendar Data');

  para('ZTA provides a bulk import tool for populating the calendar with a full season of events. This is typically done at the start of each year.');

  subSubHeader('The Seed File');
  para('The seed file is a JSON array of event objects. Each object includes:');
  bullet('title — Event name');
  bullet('description — Event details');
  bullet('startDate — ISO date string');
  bullet('endDate — ISO date string');
  bullet('location — Venue/city');
  bullet('type — One of: tournament, league, education, social, meeting, other');
  bullet('published — true or false');

  subSubHeader('Running the Import');
  numberedItem(1, 'Place the JSON seed file at server/src/seeds/calendar-2026.json');
  numberedItem(2, 'Run the import script: node server/src/scripts/importZtaCalendar2026.js');
  numberedItem(3, 'The script performs an upsert — matching events by title and start date');
  numberedItem(4, 'Existing events are updated, new events are created');
  numberedItem(5, 'Events in the database for 2026 that are not in the seed file are removed');

  warning('The import script will remove 2026 calendar events that are not present in the seed file. Make sure your seed file is complete before running it.');

  tip('The 2026 ZTA calendar seed contains 68 events spanning February through December, covering ITF circuits, local tournaments, education programs, and social events.');

  // ============================================================
  // 8. BEST PRACTICES
  // ============================================================
  sectionHeader('8', 'Best Practices');

  subSubHeader('Planning the Season Calendar');
  numberedItem(1, 'At the start of each year, prepare the full calendar with all known events');
  numberedItem(2, 'Use "Draft" status for tentative events and publish them once confirmed');
  numberedItem(3, 'Create League-type events for all match days before generating league fixtures');
  numberedItem(4, 'Include education and social events to keep the community informed');

  subSubHeader('League Scheduling');
  numberedItem(1, 'Create all League match day events before generating any fixtures');
  numberedItem(2, 'Ensure League events fall within the league\'s start and end dates');
  numberedItem(3, 'Create enough League events for the number of match days required');
  numberedItem(4, 'Add 2 extra League events after the regular season for playoffs');

  subSubHeader('Keeping the Calendar Current');
  bullet('Update event dates promptly if schedules change');
  bullet('Unpublish events that are postponed indefinitely rather than deleting them');
  bullet('Add location details to help players plan travel');
  bullet('Include descriptions with key information (registration deadlines, entry fees, contacts)');

  subSubHeader('Event Naming Conventions');
  table(
    ['Type', 'Naming Pattern', 'Example'],
    [
      ['Tournament', 'Year + City/Sponsor + Open/Championships', '2026 Lusaka Open'],
      ['League', 'League Matches - Week N', 'League Matches - Week 5'],
      ['Education', 'Course Name + Level', 'Level 1 Coaches Course'],
      ['Meeting', 'Body + Meeting Type', 'ZTA Board Meeting'],
      ['Social', 'Event Name + Context', 'ZTA Fundraising Dinner'],
    ]
  );

  // ============================================================
  // 9. TROUBLESHOOTING
  // ============================================================
  sectionHeader('9', 'Troubleshooting');

  table(
    ['Problem', 'Solution'],
    [
      ['Event not showing on public calendar', 'Ensure the event is Published and its end date has not passed'],
      ['Can\'t create event — date error', 'End date must be on or after the start date'],
      ['League fixtures fail — "not enough dates"', 'Create more League-type calendar events within the league\'s date range'],
      ['League ties have no dates', 'No League calendar events existed when fixtures were generated. Create events and regenerate.'],
      ['Fixtures not linked to calendar', 'Fixtures were generated using weekly intervals. Delete ties, add League events, and regenerate.'],
      ['Playoff dates incorrect', 'Create League-type events after the regular season. Regenerate playoffs.'],
      ['Imported events missing', 'Check that the seed JSON file has the correct format and all events are included'],
      ['Deleted event but ties remain', 'Deleting a calendar event does not delete linked ties. Ties retain their scores but lose the date reference.'],
      ['Draft events showing publicly', 'Verify the Published checkbox is unchecked. Clear your browser cache.'],
      ['Search not finding event', 'Search filters by title and location only. Try broader search terms.'],
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
