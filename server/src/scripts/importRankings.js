import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ranking from '../models/Ranking.js';

// ES module equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Category mapping
const categoryMapping = {
  'Men Senior': 'men_senior',
  'Women Senior': 'women_senior',
  'Boys 10 & U': 'boys_10u',
  'Boys 12 & U': 'boys_12u',
  'Boys 14 & U': 'boys_14u',
  'Boys 16 and Under': 'boys_16u',
  'Boys 18 and Under': 'boys_18u',
  'Girls 10 & U': 'girls_10u',
  'Girls 12 & U': 'girls_12u',
  'Girls 14 & Under': 'girls_14u',
  'Girls 16 and Under': 'girls_16u',
  'Girls 18 and Under': 'girls_18u',
  'Men Senior Doubles': 'men_doubles',
  'Women Senior Doubles': 'women_doubles'
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zta_database', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Parse CSV and import rankings
async function importRankingsFromCSV(csvFilePath, category, rankingPeriod) {
  console.log(`\nImporting ${category} rankings for ${rankingPeriod}...`);
  console.log(`Reading file: ${csvFilePath}\n`);

  const results = [];
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    errors: []
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push(row);
      })
      .on('end', async () => {
        stats.total = results.length;
        console.log(`Parsed ${results.length} rows from CSV\n`);

        for (const row of results) {
          try {
            // Extract player info
            const playerName = row['Player Name']?.trim();
            const club = row['Club/Academy']?.trim();
            const rank = parseInt(row['Rank']) || 0;
            const totalPoints = parseInt(row['Total Points']) || 0;

            if (!playerName) continue;

            // Extract tournament results
            const tournamentResults = [];
            const tournamentColumns = Object.keys(row).filter(
              key => !['Rank', 'Player Name', 'Club/Academy', '', 'Total Points'].includes(key)
            );

            for (const tournamentName of tournamentColumns) {
              const points = parseInt(row[tournamentName]) || 0;
              if (points > 0) {
                // Extract year from tournament name
                const yearMatch = tournamentName.match(/\d{4}/);
                const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
                
                // Create date for tournament (first day of January for the year)
                const tournamentDate = new Date(year, 0, 1);

                tournamentResults.push({
                  tournamentName,
                  tournamentDate,
                  points,
                  year
                });
              }
            }

            // Create or update ranking
            const ranking = await Ranking.findOneAndUpdate(
              {
                playerName,
                category,
                rankingPeriod,
                isActive: true
              },
              {
                playerName,
                club,
                category,
                rank,
                tournamentResults,
                totalPoints,
                rankingPeriod,
                lastUpdated: new Date()
              },
              {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
              }
            );

            if (ranking.isNew) {
              stats.created++;
            } else {
              stats.updated++;
            }

            console.log(`✓ ${playerName} - Rank ${rank} (${totalPoints} points)`);

          } catch (error) {
            stats.errors.push({
              player: row['Player Name'],
              error: error.message
            });
            console.error(`✗ Error processing ${row['Player Name']}:`, error.message);
          }
        }

        console.log(`\n=== Import Summary ===`);
        console.log(`Total rows: ${stats.total}`);
        console.log(`Created: ${stats.created}`);
        console.log(`Updated: ${stats.updated}`);
        console.log(`Errors: ${stats.errors.length}`);

        if (stats.errors.length > 0) {
          console.log('\nErrors:');
          stats.errors.forEach(err => {
            console.log(`  - ${err.player}: ${err.error}`);
          });
        }

        resolve(stats);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node importRankings.js <csv-file-path> <category-name> [ranking-period]');
    console.log('\nExample:');
    console.log('  node importRankings.js "rankings.csv" "Men Senior" "2025"');
    console.log('\nAvailable categories:');
    Object.keys(categoryMapping).forEach(cat => console.log(`  - ${cat}`));
    process.exit(1);
  }

  const csvFilePath = args[0];
  const categoryName = args[1];
  const rankingPeriod = args[2] || '2025';

  // Validate category
  const category = categoryMapping[categoryName];
  if (!category) {
    console.error(`\nError: Invalid category "${categoryName}"`);
    console.log('\nAvailable categories:');
    Object.keys(categoryMapping).forEach(cat => console.log(`  - ${cat}`));
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`\nError: File not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    await importRankingsFromCSV(csvFilePath, category, rankingPeriod);
    console.log('\n✓ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  }
}

// Run main function
main();
