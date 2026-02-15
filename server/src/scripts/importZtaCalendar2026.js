import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import CalendarEvent from '../models/CalendarEvent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const importCalendar2026 = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the seed data
    const seedPath = join(__dirname, '..', 'seeds', 'calendar-2026.json');
    const events = JSON.parse(readFileSync(seedPath, 'utf-8'));

    console.log(`Found ${events.length} events in seed file`);

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const event of events) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      // Upsert: match on title + startDate to avoid duplicates
      const existing = await CalendarEvent.findOne({
        title: event.title,
        startDate: startDate
      });

      if (existing) {
        // Update if the event already exists (in case data changed)
        existing.description = event.description;
        existing.endDate = endDate;
        existing.location = event.location;
        existing.type = event.type;
        existing.published = event.published;
        await existing.save();
        updated++;
        console.log(`  Updated: ${event.title} (${event.startDate})`);
      } else {
        await CalendarEvent.create({
          title: event.title,
          description: event.description,
          startDate: startDate,
          endDate: endDate,
          location: event.location,
          type: event.type,
          published: event.published
        });
        created++;
        console.log(`  Created: ${event.title} (${event.startDate})`);
      }
    }

    // Build set of imported keys (title + startDate) for cleanup
    const importedKeys = new Set(
      events.map(e => `${e.title}|||${new Date(e.startDate).toISOString()}`)
    );

    // Remove 2026 events from DB that are NOT in the seed file (stale entries)
    const all2026Events = await CalendarEvent.find({
      startDate: { $gte: new Date('2026-01-01'), $lt: new Date('2027-01-01') }
    });

    let removed = 0;
    for (const dbEvent of all2026Events) {
      const key = `${dbEvent.title}|||${dbEvent.startDate.toISOString()}`;
      if (!importedKeys.has(key)) {
        await CalendarEvent.findByIdAndDelete(dbEvent._id);
        removed++;
        console.log(`  Removed stale: ${dbEvent.title} (${dbEvent.startDate.toISOString().split('T')[0]})`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Import complete!`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Removed stale: ${removed}`);
    console.log(`  Total in seed file: ${events.length}`);

    // Verify total 2026 events in DB
    const total2026 = await CalendarEvent.countDocuments({
      startDate: { $gte: new Date('2026-01-01'), $lt: new Date('2027-01-01') }
    });
    console.log(`  Total 2026 events in DB: ${total2026}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('Error importing calendar:', error);
    process.exit(1);
  }
};

importCalendar2026();
