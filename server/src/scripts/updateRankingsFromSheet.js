/**
 * Update men_senior and women_senior rankings from CSV exports of the Google Sheet.
 * CSV files expected at /tmp/men_senior.csv and /tmp/women_senior.csv.
 * Does NOT touch any Tournament documents.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Ranking from '../models/Ranking.js';

const RANKING_PERIOD = '2026';

// Parse a CSV line that uses double-quoted fields separated by commas
function parseCsvLine(line) {
  const result = [];
  let inQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Build a map from normalized name → Ranking doc
function buildLookup(docs) {
  const map = new Map();
  for (const doc of docs) {
    map.set(normalizeName(doc.playerName), doc);
  }
  return map;
}

// Read CSV rows. Women's sheet has a header; men's does not.
function readCsv(filePath, hasHeader) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  const rows = [];
  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const rankRaw = cols[0] || '';
    const name = (cols[1] || '').trim();
    const club = (cols[2] || '').trim();
    const totalPoints = parseInt(cols[16] || '0', 10);
    if (!name || isNaN(totalPoints)) continue;
    rows.push({ rankRaw, name, club, totalPoints });
  }
  return rows;
}

async function processCategory(category, rows, label) {
  console.log(`\n=== ${label} (${rows.length} rows from sheet) ===`);

  const existing = await Ranking.find({ category, rankingPeriod: RANKING_PERIOD });
  const lookup = buildLookup(existing);

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.totalPoints === 0) { skipped++; continue; }

    const key = normalizeName(row.name);
    const doc = lookup.get(key);

    if (doc) {
      // Update existing
      const changed = doc.totalPoints !== row.totalPoints || doc.club !== row.club;
      if (changed) {
        console.log(`  UPDATE "${row.name}": points ${doc.totalPoints} → ${row.totalPoints}, club "${doc.club}" → "${row.club}"`);
        doc.totalPoints = row.totalPoints;
        doc.club = row.club;
        // Keep existing tournamentResults; update the opening-balance entry if present
        const obIdx = doc.tournamentResults.findIndex(r => r.tournamentName === 'Opening Balance 2026');
        if (obIdx >= 0) {
          doc.tournamentResults[obIdx].points = row.totalPoints;
        } else {
          doc.tournamentResults.push({
            tournamentName: 'Opening Balance 2026',
            tournamentDate: new Date('2026-01-01'),
            points: row.totalPoints,
            position: '—',
            year: 2026
          });
        }
        await doc.save();
        updated++;
      }
    } else {
      // Create new record — rank will be recalculated below
      console.log(`  CREATE "${row.name}" (${row.club}): ${row.totalPoints} pts`);
      const newDoc = new Ranking({
        playerName: row.name,
        club: row.club,
        category,
        rankingPeriod: RANKING_PERIOD,
        rank: 9999,
        previousRank: null,
        totalPoints: row.totalPoints,
        isActive: true,
        tournamentResults: [{
          tournamentName: 'Opening Balance 2026',
          tournamentDate: new Date('2026-01-01'),
          points: row.totalPoints,
          position: '—',
          year: 2026
        }]
      });
      await newDoc.save();
      created++;
    }
  }

  console.log(`  ${updated} updated, ${created} created, ${skipped} skipped (0 pts)`);

  console.log(`  Recalculating ranks...`);
  const ranked = await Ranking.updateRankings(category, RANKING_PERIOD);
  console.log(`  Done. ${ranked.length} players ranked.`);
}

const run = async () => {
  await connectDatabase();

  const menRows = readCsv('/tmp/men_senior.csv', false);   // no header
  const womenRows = readCsv('/tmp/women_senior.csv', true); // has header

  await processCategory('men_senior', menRows, 'Men Senior');
  await processCategory('women_senior', womenRows, 'Women Senior');

  console.log('\nAll done.');
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
