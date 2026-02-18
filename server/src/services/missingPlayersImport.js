import mongoose from 'mongoose';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import User from '../models/User.js';
import Ranking from '../models/Ranking.js';

const ZPIN_REGEX = /^ZTA[JS]\d{4,}$/;

const REQUIRED_COLUMNS = ['action', 'proposed_zpin', 'full_name'];

/**
 * Parse CSV buffer/string into rows
 */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

/**
 * Parse XLSX buffer into rows
 */
function parseXLSX(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

/**
 * Validate a single row before import.
 * Returns { valid: boolean, errors: string[] }
 */
function validateRow(row, rowIndex) {
  const errors = [];
  const action = (row.action || '').toUpperCase().trim();

  if (!['CREATE', 'UPDATE', 'SKIP'].includes(action)) {
    errors.push(`Row ${rowIndex}: Invalid action "${row.action}". Must be CREATE, UPDATE, or SKIP.`);
  }

  if (action === 'SKIP') {
    return { valid: true, errors: [], skip: true };
  }

  if (action === 'CREATE' && !row.full_name?.trim()) {
    errors.push(`Row ${rowIndex}: full_name is required for CREATE action.`);
  }

  if (action === 'CREATE' && !row.proposed_zpin?.trim()) {
    errors.push(`Row ${rowIndex}: proposed_zpin is required for CREATE action.`);
  }

  if (row.proposed_zpin?.trim() && !ZPIN_REGEX.test(row.proposed_zpin.trim())) {
    errors.push(`Row ${rowIndex}: proposed_zpin "${row.proposed_zpin}" does not match format ZTA[J|S]NNNN.`);
  }

  return { valid: errors.length === 0, errors, skip: false };
}

/**
 * Import players from a parsed spreadsheet.
 *
 * @param {Array} rows - Parsed spreadsheet rows
 * @param {Object} options - { userId, filename, dryRun }
 * @returns {Object} Import report
 */
export async function importMissingPlayers(rows, options = {}) {
  const { userId = null, filename = 'unknown', dryRun = false } = options;

  const report = {
    timestamp: new Date().toISOString(),
    filename,
    userId,
    dryRun,
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: [], // per-row log
  };

  // Phase 1: Validate all rows
  const validationErrors = [];
  const zpinsInFile = new Map(); // proposed_zpin -> row index (detect duplicates within file)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row
    const { valid, errors, skip } = validateRow(row, rowNum);

    if (!valid) {
      validationErrors.push(...errors);
    }

    if (!skip && row.proposed_zpin?.trim()) {
      const zpin = row.proposed_zpin.trim().toUpperCase();
      if (zpinsInFile.has(zpin)) {
        validationErrors.push(`Row ${rowNum}: Duplicate proposed_zpin "${zpin}" (also in row ${zpinsInFile.get(zpin)}).`);
      } else {
        zpinsInFile.set(zpin, rowNum);
      }
    }
  }

  if (validationErrors.length > 0) {
    report.failed = validationErrors.length;
    report.details = validationErrors.map(e => ({ action: 'VALIDATION_ERROR', error: e }));
    return report;
  }

  // Phase 2: Check ZPIN uniqueness against DB
  const proposedZpins = [...zpinsInFile.keys()];
  if (proposedZpins.length > 0) {
    const existingWithZpins = await User.find({ zpin: { $in: proposedZpins } }).select('zpin firstName lastName').lean();
    const existingZpinSet = new Map();
    for (const u of existingWithZpins) {
      existingZpinSet.set(u.zpin, u);
    }

    // For idempotency: if an existing user already has this ZPIN and the same name,
    // it means this row was already imported — we'll skip it gracefully.
    // If a different user has the ZPIN, that's a conflict.
    for (const [zpin, rowNum] of zpinsInFile) {
      const existing = existingZpinSet.get(zpin);
      if (existing) {
        const row = rows[rowNum - 2];
        const action = (row.action || '').toUpperCase().trim();
        if (action === 'CREATE') {
          // Check if it's the same person (idempotent re-run)
          const fullName = (row.full_name || '').trim().toLowerCase();
          const existingName = `${existing.firstName} ${existing.lastName}`.toLowerCase();
          const existingNameReversed = `${existing.lastName} ${existing.firstName}`.toLowerCase();

          if (fullName !== existingName && fullName !== existingNameReversed) {
            validationErrors.push(`Row ${rowNum}: ZPIN "${zpin}" already assigned to ${existing.firstName} ${existing.lastName} (conflict with "${row.full_name}").`);
          }
          // If same person, it'll be handled as idempotent skip during import
        }
      }
    }
  }

  if (validationErrors.length > 0) {
    report.failed = validationErrors.length;
    report.details = validationErrors.map(e => ({ action: 'VALIDATION_ERROR', error: e }));
    return report;
  }

  if (dryRun) {
    report.details.push({ action: 'DRY_RUN', message: 'Validation passed. No changes made.' });
    return report;
  }

  // Phase 3: Process rows within a session (transaction)
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const action = (row.action || '').toUpperCase().trim();

      if (action === 'SKIP') {
        report.skipped++;
        report.details.push({
          rowNum,
          action: 'SKIPPED',
          name: row.full_name,
          reason: row.notes || 'Action is SKIP',
        });
        continue;
      }

      const zpin = (row.proposed_zpin || '').trim().toUpperCase();
      const segment = (row.segment || '').toUpperCase().trim();
      const gender = (row.gender || '').toLowerCase().trim() || null;
      const firstName = (row.first_name || '').trim();
      const lastName = (row.last_name || '').trim();
      const fullName = (row.full_name || '').trim();
      const club = (row.club || '').trim();
      const phone = (row.phone || '').trim();
      const email = (row.email || '').trim();
      const dob = row.date_of_birth ? new Date(row.date_of_birth) : null;

      try {
        if (action === 'CREATE') {
          // Idempotency check: does a user with this ZPIN already exist?
          const existingByZpin = await User.findOne({ zpin }).session(session).lean();
          if (existingByZpin) {
            report.skipped++;
            report.details.push({
              rowNum,
              action: 'SKIPPED_IDEMPOTENT',
              name: fullName,
              zpin,
              playerId: existingByZpin._id.toString(),
              reason: `ZPIN ${zpin} already exists (idempotent re-run). Player: ${existingByZpin.firstName} ${existingByZpin.lastName}`,
            });
            continue;
          }

          // Also check by name+gender to avoid creating duplicate people
          const existingByName = await User.findOne({
            firstName: { $regex: new RegExp(`^${escapeRegex(firstName)}$`, 'i') },
            lastName: { $regex: new RegExp(`^${escapeRegex(lastName)}$`, 'i') },
            ...(gender ? { gender } : {}),
          }).session(session).lean();

          if (existingByName) {
            // Person exists but may not have ZPIN — update them instead
            if (!existingByName.zpin) {
              await User.updateOne(
                { _id: existingByName._id },
                { $set: { zpin, club: club || existingByName.club } },
                { session }
              );
              report.updated++;
              report.details.push({
                rowNum,
                action: 'UPDATED_EXISTING',
                name: fullName,
                zpin,
                playerId: existingByName._id.toString(),
                reason: `Player already existed without ZPIN. Assigned ${zpin}.`,
              });
            } else {
              report.skipped++;
              report.details.push({
                rowNum,
                action: 'SKIPPED_EXISTS',
                name: fullName,
                zpin: existingByName.zpin,
                playerId: existingByName._id.toString(),
                reason: `Player already exists with ZPIN ${existingByName.zpin}.`,
              });
            }
            continue;
          }

          // Create new user
          const membershipType = segment === 'JUNIOR' ? 'junior' : 'adult';
          const placeholderEmail = `${zpin}@noemail.zambiatennis.local`;

          const userData = {
            firstName: firstName || fullName.split(' ')[0],
            lastName: lastName || fullName.split(' ').slice(1).join(' ') || 'Unknown',
            email: email || placeholderEmail,
            phone: phone || '',
            club: club || '',
            gender: gender || undefined,
            dateOfBirth: dob || undefined,
            role: 'player',
            zpin,
            membershipType,
            membershipStatus: 'inactive',
            isEmailVerified: false,
          };

          const [newUser] = await User.create([userData], { session });

          // Link ranking entries to the new user
          const rankingIds = (row.ranking_source_ids || '').split(';').filter(Boolean);
          if (rankingIds.length > 0) {
            await Ranking.updateMany(
              { _id: { $in: rankingIds.map(id => new mongoose.Types.ObjectId(id)) } },
              { $set: { playerId: newUser._id, playerZpin: zpin } },
              { session }
            );
          }

          report.created++;
          report.details.push({
            rowNum,
            action: 'CREATED',
            name: fullName,
            zpin,
            playerId: newUser._id.toString(),
            reason: 'New player created and linked to ranking entries.',
          });

        } else if (action === 'UPDATE') {
          const matchedPlayerId = row.matched_player_id?.trim();
          if (!matchedPlayerId) {
            report.failed++;
            report.details.push({
              rowNum,
              action: 'FAILED',
              name: fullName,
              reason: 'UPDATE action requires matched_player_id.',
            });
            continue;
          }

          const existingUser = await User.findById(matchedPlayerId).session(session);
          if (!existingUser) {
            report.failed++;
            report.details.push({
              rowNum,
              action: 'FAILED',
              name: fullName,
              reason: `User ${matchedPlayerId} not found.`,
            });
            continue;
          }

          // Don't overwrite existing ZPIN
          if (existingUser.zpin) {
            report.skipped++;
            report.details.push({
              rowNum,
              action: 'SKIPPED_HAS_ZPIN',
              name: fullName,
              zpin: existingUser.zpin,
              playerId: matchedPlayerId,
              reason: `Player already has ZPIN ${existingUser.zpin}. Not overwriting.`,
            });
            continue;
          }

          existingUser.zpin = zpin;
          if (club) existingUser.club = club;
          await existingUser.save({ session });

          // Link ranking entries
          const rankingIds = (row.ranking_source_ids || '').split(';').filter(Boolean);
          if (rankingIds.length > 0) {
            await Ranking.updateMany(
              { _id: { $in: rankingIds.map(id => new mongoose.Types.ObjectId(id)) } },
              { $set: { playerId: existingUser._id, playerZpin: zpin } },
              { session }
            );
          }

          report.updated++;
          report.details.push({
            rowNum,
            action: 'UPDATED',
            name: fullName,
            zpin,
            playerId: matchedPlayerId,
            reason: `ZPIN ${zpin} assigned to existing player.`,
          });
        }
      } catch (rowError) {
        report.failed++;
        report.details.push({
          rowNum,
          action: 'FAILED',
          name: fullName,
          reason: rowError.message,
        });

        // If this is a critical error (e.g., duplicate key), abort
        if (rowError.code === 11000) {
          await session.abortTransaction();
          session.endSession();
          report.details.push({
            action: 'ABORTED',
            reason: `Transaction aborted due to duplicate key error at row ${rowNum}: ${rowError.message}`,
          });
          return report;
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

  } catch (txError) {
    await session.abortTransaction();
    session.endSession();
    report.failed++;
    report.details.push({
      action: 'ABORTED',
      reason: `Transaction failed: ${txError.message}`,
    });
  }

  return report;
}

/**
 * Parse an uploaded file (CSV or XLSX) into rows
 */
export async function parseUploadedFile(buffer, mimetype) {
  if (mimetype === 'text/csv' || mimetype === 'application/csv') {
    return parseCSV(buffer);
  }
  // XLSX
  return parseXLSX(buffer);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
