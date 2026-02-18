#!/usr/bin/env node

/**
 * CLI script: Export missing ranked players to CSV and XLSX.
 *
 * Usage:
 *   node server/src/scripts/exportMissingPlayers.js [--output-dir <dir>] [--format csv|xlsx|both]
 *
 * Examples:
 *   node server/src/scripts/exportMissingPlayers.js
 *   node server/src/scripts/exportMissingPlayers.js --output-dir ./exports --format both
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateExportData, toCSV, toXLSX } from '../services/missingPlayersExport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

function parseArgs(args) {
  const opts = { outputDir: path.join(__dirname, '../../exports'), format: 'both' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output-dir' && args[i + 1]) {
      opts.outputDir = path.resolve(args[++i]);
    } else if (args[i] === '--format' && args[i + 1]) {
      opts.format = args[++i];
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  console.log('Detecting missing players...');
  const { rows, summary } = await generateExportData();

  // Print summary
  console.log('\n=== DETECTION SUMMARY ===');
  console.log(`Total distinct ranked players: ${summary.total}`);
  console.log(`  OK (matched with ZPIN):      ${summary.ok}`);
  console.log(`  MISSING_PLAYER:              ${summary.missing}`);
  console.log(`    - Seniors:                 ${summary.missingSeniors}`);
  console.log(`    - Juniors:                 ${summary.missingJuniors}`);
  console.log(`  HAS_PLAYER_NO_ZPIN:          ${summary.noZpin}`);
  console.log(`  AMBIGUOUS_MATCH:             ${summary.ambiguous}`);
  console.log(`  Total actionable:            ${summary.actionable}`);

  console.log('\n=== EXPECTED vs ACTUAL ===');
  console.log(`Expected SENIOR missing: 74   | Actual: ${summary.missingSeniors}`);
  console.log(`Expected JUNIOR missing: 123  | Actual: ${summary.missingJuniors}`);
  console.log(`Expected total:          197  | Actual: ${summary.missing}`);

  if (summary.missingSeniors !== 74 || summary.missingJuniors !== 123) {
    console.log('\n!! COUNTS DO NOT MATCH EXPECTED VALUES !!');
    console.log('This is expected if the ranking database does not yet contain all categories.');
    console.log('Currently only these categories have data:');
    const catSet = new Set();
    for (const row of rows) {
      row.categories.split(', ').forEach(c => catSet.add(c));
    }
    console.log(`  ${[...catSet].sort().join(', ')}`);
    console.log('Missing junior categories (no data in DB): boys_14u, boys_16u, boys_18u, girls_12u, girls_14u, girls_16u, girls_18u');
  }

  // Ensure output directory
  if (!fs.existsSync(opts.outputDir)) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];

  if (opts.format === 'csv' || opts.format === 'both') {
    const csvPath = path.join(opts.outputDir, `ZTA_Missing_Players_${dateStr}.csv`);
    fs.writeFileSync(csvPath, toCSV(rows), 'utf-8');
    console.log(`\nCSV exported: ${csvPath}`);
  }

  if (opts.format === 'xlsx' || opts.format === 'both') {
    const xlsxPath = path.join(opts.outputDir, `ZTA_Missing_Players_${dateStr}.xlsx`);
    fs.writeFileSync(xlsxPath, toXLSX(rows));
    console.log(`XLSX exported: ${xlsxPath}`);
  }

  const actionableRows = rows.filter(r => r.action !== 'SKIP');
  console.log(`\nExported ${rows.length} total rows (${actionableRows.length} actionable: ${actionableRows.filter(r => r.action === 'CREATE').length} CREATE, ${actionableRows.filter(r => r.action === 'UPDATE').length} UPDATE)`);

  await mongoose.connection.close();
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
