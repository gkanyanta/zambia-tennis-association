import XLSX from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const filePath = '/mnt/c/Users/HP/Downloads/ZTA_Junior_Clean_Final.xlsx';

// Function to convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Function to generate ZPIN
function generateZPIN(index) {
  // Format: ZTAJ + 4-digit number (ZTAJ for ZTA Junior)
  const paddedIndex = String(index).padStart(4, '0');
  return `ZTAJ${paddedIndex}`;
}

// Function to generate email from name
function generateEmail(firstName, lastName, index) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  return `${cleanFirst}.${cleanLast}.${index}@ztajunior.org`;
}

// Function to determine membership type
function getMembershipType(category) {
  return 'junior';
}

async function importPlayers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the Excel file
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} players to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Get the highest existing ZPIN number to avoid conflicts
    const existingUsers = await User.find({ zpin: /^ZTAJ/ }).sort({ zpin: -1 }).limit(1);
    let startIndex = 1;
    if (existingUsers.length > 0) {
      const lastZPIN = existingUsers[0].zpin;
      const lastNumber = parseInt(lastZPIN.replace('ZTAJ', ''));
      startIndex = lastNumber + 1;
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const zpinIndex = startIndex + i;

      try {
        // Extract data from row (handle the weird header name)
        const firstName = row['firs+A1:V69t_name'] || row['first_name'] || 'Unknown';
        const middleName = row['middle_name'] || '';
        const lastName = row['last_name'] || 'Unknown';
        const gender = row['gender_x'];
        const birthdaySerial = row['birthday'];
        const age = row['age'];
        const club = row['club'];
        const category = row['category'];

        // Generate ZPIN and email
        const zpin = generateZPIN(zpinIndex);
        const email = generateEmail(firstName, lastName, zpinIndex);

        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { email },
            { zpin }
          ]
        });

        if (existingUser) {
          console.log(`Skipping ${firstName} ${lastName} - already exists`);
          skipped++;
          continue;
        }

        // Convert birthday if it's a number (Excel serial)
        let dateOfBirth = null;
        if (typeof birthdaySerial === 'number') {
          dateOfBirth = excelDateToJSDate(birthdaySerial);
        }

        // Create user object
        const userData = {
          firstName,
          lastName,
          email,
          password: 'ZTA@2025', // Default password - users should change on first login
          phone: '', // Not in Excel file
          role: 'player',
          zpin,
          membershipType: getMembershipType(category),
          membershipStatus: 'active',
          membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          isEmailVerified: false
        };

        // Create user
        const user = await User.create(userData);
        imported++;

        if ((imported + skipped + errors) % 10 === 0) {
          console.log(`Progress: ${imported + skipped + errors}/${data.length}`);
        }

      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Import Complete ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importPlayers();
