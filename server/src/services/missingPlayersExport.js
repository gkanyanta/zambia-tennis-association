import xlsx from 'xlsx';
import { detectMissingPlayers, assignProposedZpins, getSummary } from './missingPlayersService.js';

/**
 * CSV column headers in the required order
 */
const EXPORT_COLUMNS = [
  'action',
  'segment',
  'status',
  'proposed_zpin',
  'full_name',
  'first_name',
  'last_name',
  'gender',
  'date_of_birth',
  'club',
  'phone',
  'email',
  'ranking_source_ids',
  'categories',
  'matched_player_id',
  'current_zpin',
  'match_method',
  'notes',
];

/**
 * Run detection + ZPIN assignment and return export-ready data.
 */
export async function generateExportData() {
  const results = await detectMissingPlayers();
  await assignProposedZpins(results);
  const summary = getSummary(results);
  return { rows: results, summary };
}

/**
 * Generate CSV string from export data
 */
export function toCSV(rows) {
  const escapeCsvField = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = EXPORT_COLUMNS.map(escapeCsvField).join(',');
  const lines = rows.map(row =>
    EXPORT_COLUMNS.map(col => escapeCsvField(row[col])).join(',')
  );
  return [header, ...lines].join('\n');
}

/**
 * Generate XLSX buffer from export data
 */
export function toXLSX(rows) {
  const data = rows.map(row => {
    const obj = {};
    for (const col of EXPORT_COLUMNS) {
      obj[col] = row[col] ?? '';
    }
    return obj;
  });

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data, { header: EXPORT_COLUMNS });

  // Column widths
  worksheet['!cols'] = [
    { wch: 8 },  // action
    { wch: 8 },  // segment
    { wch: 20 }, // status
    { wch: 10 }, // proposed_zpin
    { wch: 30 }, // full_name
    { wch: 18 }, // first_name
    { wch: 18 }, // last_name
    { wch: 8 },  // gender
    { wch: 12 }, // date_of_birth
    { wch: 20 }, // club
    { wch: 15 }, // phone
    { wch: 25 }, // email
    { wch: 28 }, // ranking_source_ids
    { wch: 25 }, // categories
    { wch: 26 }, // matched_player_id
    { wch: 12 }, // current_zpin
    { wch: 18 }, // match_method
    { wch: 50 }, // notes
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Missing Players');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
