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

// Default file path - can be overridden via command line argument
const filePath = process.argv[2] || '/mnt/c/Users/HP/Downloads/ZTA_Junior_Clean_Final.xlsx';

// Function to convert Excel serial date to JavaScript Date
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
}

// Function to normalize names for comparison
function normalizeName(name) {
  return name?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
}

async function updateBirthdays() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the Excel file
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} players in Excel file\n`);

    let updated = 0;
    let notFound = 0;
    let noBirthday = 0;
    let alreadyHasBirthday = 0;
    let errors = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      try {
        // Extract data from row (handle the weird header name from original import)
        const firstName = row['firs+A1:V69t_name'] || row['first_name'] || '';
        const lastName = row['last_name'] || '';
        const birthdaySerial = row['birthday'];

        if (!firstName || !lastName) {
          console.log(`Row ${i + 1}: Skipping - missing name`);
          errors++;
          continue;
        }

        // Check if birthday exists in Excel
        if (!birthdaySerial) {
          noBirthday++;
          continue;
        }

        // Convert birthday
        let dateOfBirth = null;
        if (typeof birthdaySerial === 'number') {
          dateOfBirth = excelDateToJSDate(birthdaySerial);
        } else if (birthdaySerial instanceof Date) {
          dateOfBirth = birthdaySerial;
        } else if (typeof birthdaySerial === 'string') {
          dateOfBirth = new Date(birthdaySerial);
          if (isNaN(dateOfBirth.getTime())) {
            console.log(`Row ${i + 1}: Invalid date format for ${firstName} ${lastName}: ${birthdaySerial}`);
            errors++;
            continue;
          }
        }

        if (!dateOfBirth) {
          noBirthday++;
          continue;
        }

        // Find user by first name and last name (case-insensitive)
        const user = await User.findOne({
          firstName: { $regex: new RegExp(`^${normalizeName(firstName)}$`, 'i') },
          lastName: { $regex: new RegExp(`^${normalizeName(lastName)}$`, 'i') }
        });

        if (!user) {
          console.log(`Row ${i + 1}: Player not found - ${firstName} ${lastName}`);
          notFound++;
          continue;
        }

        // Check if user already has a birthday
        if (user.dateOfBirth) {
          alreadyHasBirthday++;
          continue;
        }

        // Update the user with their birthday
        await User.findByIdAndUpdate(user._id, { dateOfBirth });
        console.log(`✓ Updated ${firstName} ${lastName} (${user.zpin}) - DOB: ${dateOfBirth.toISOString().split('T')[0]}`);
        updated++;

      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Total rows in Excel: ${data.length}`);
    console.log(`Updated with birthday: ${updated}`);
    console.log(`Already had birthday: ${alreadyHasBirthday}`);
    console.log(`No birthday in Excel: ${noBirthday}`);
    console.log(`Player not found in DB: ${notFound}`);
    console.log(`Errors: ${errors}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the update
updateBirthdays();
