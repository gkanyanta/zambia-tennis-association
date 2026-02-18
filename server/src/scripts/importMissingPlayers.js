#!/usr/bin/env node

/**
 * CLI script: Import reviewed missing players spreadsheet.
 *
 * Usage:
 *   node server/src/scripts/importMissingPlayers.js <file-path> [--dry-run]
 *
 * Examples:
 *   node server/src/scripts/importMissingPlayers.js ./exports/ZTA_Missing_Players_2026-02-18.csv --dry-run
 *   node server/src/scripts/importMissingPlayers.js ./exports/ZTA_Missing_Players_2026-02-18.csv
 *   node server/src/scripts/importMissingPlayers.js ./exports/ZTA_Missing_Players_2026-02-18.xlsx
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { importMissingPlayers, parseUploadedFile } from '../services/missingPlayersImport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');

  if (!filePath) {
    console.log('Usage: node importMissingPlayers.js <file-path> [--dry-run]');
    console.log('\nThe file should be a CSV or XLSX previously exported by exportMissingPlayers.js');
    console.log('Edit the file to review/adjust actions, names, and ZPINs before importing.');
    console.log('\nOptions:');
    console.log('  --dry-run    Validate the file without making changes');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`File: ${resolvedPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE IMPORT'}`);
  console.log();

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const buffer = fs.readFileSync(resolvedPath);
  const mimetype = resolvedPath.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  console.log('Parsing file...');
  const rows = await parseUploadedFile(buffer, mimetype);
  console.log(`Parsed ${rows.length} rows.\n`);

  console.log('Running import...');
  const report = await importMissingPlayers(rows, {
    userId: 'CLI',
    filename: path.basename(resolvedPath),
    dryRun,
  });

  // Print report
  console.log('\n=== IMPORT REPORT ===');
  console.log(`Timestamp:  ${report.timestamp}`);
  console.log(`File:       ${report.filename}`);
  console.log(`Dry run:    ${report.dryRun}`);
  console.log(`Total rows: ${report.totalRows}`);
  console.log(`Created:    ${report.created}`);
  console.log(`Updated:    ${report.updated}`);
  console.log(`Skipped:    ${report.skipped}`);
  console.log(`Failed:     ${report.failed}`);

  if (report.details.length > 0) {
    console.log('\n--- Details ---');
    for (const d of report.details) {
      const row = d.rowNum ? `Row ${d.rowNum}: ` : '';
      const name = d.name ? `[${d.name}] ` : '';
      const zpin = d.zpin ? `(${d.zpin}) ` : '';
      console.log(`  ${row}${d.action} ${name}${zpin}${d.reason || ''}`);
    }
  }

  // Save report to JSON
  const reportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, `import_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport saved: ${reportPath}`);

  await mongoose.connection.close();

  if (report.failed > 0 && report.created === 0 && report.updated === 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
