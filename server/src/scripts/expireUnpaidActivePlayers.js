/**
 * Flip User.membershipStatus from 'active' to 'expired' for players who do
 * not have an active MembershipSubscription for the current year.
 *
 * RUN backfillRegistrationSubscriptions.js --apply FIRST so legitimate
 * REG-* legacy payers get their subscription row created before this
 * script would otherwise wrongly demote them.
 *
 * Only User.membershipStatus is changed. membershipExpiry is left
 * untouched so the prior expiry date remains as an audit trail.
 *
 * Usage:
 *   cd server
 *   node src/scripts/expireUnpaidActivePlayers.js          # dry run (default)
 *   node src/scripts/expireUnpaidActivePlayers.js --apply  # write changes
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import User from '../models/User.js';

const APPLY = process.argv.includes('--apply');
const SAMPLE_LIMIT = 20;

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

const run = async () => {
  await connectDatabase();
  console.log(`Connected — mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}\n`);

  const currentYear = MembershipSubscription.getCurrentYear();
  console.log(`Current membership year: ${currentYear}\n`);

  // Entities that DO have an active subscription for the current year.
  // These are the paid-up players — they must be excluded from demotion.
  const activeEntityIds = await MembershipSubscription.distinct('entityId', {
    entityType: 'player',
    year: currentYear,
    status: 'active',
  });
  console.log(`Active current-year subscriptions: ${activeEntityIds.length}`);

  // Also include entities who only ever held a player subscription in past
  // years (mirrors the /api/players directory inclusion rule — staff who
  // hold a ZPIN should be considered players for this scan).
  const anyPlayerEntityIds = await MembershipSubscription.distinct('entityId', {
    entityType: 'player',
  });

  const candidateFilter = {
    membershipStatus: 'active',
    $or: [{ role: 'player' }, { _id: { $in: anyPlayerEntityIds } }],
    _id: { $nin: activeEntityIds },
  };

  const candidates = await User.find(candidateFilter)
    .select('firstName lastName email zpin role membershipStatus membershipExpiry')
    .sort({ lastName: 1, firstName: 1 })
    .lean();

  console.log(`Candidates to flip active → expired: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log('Nothing to do. Exiting.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Sample (first ${Math.min(SAMPLE_LIMIT, candidates.length)}):`);
  console.log('─'.repeat(90));
  console.log(
    'name'.padEnd(30) +
      'zpin'.padEnd(12) +
      'role'.padEnd(10) +
      'email'.padEnd(30) +
      'expiry'
  );
  console.log('─'.repeat(90));
  for (const u of candidates.slice(0, SAMPLE_LIMIT)) {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    console.log(
      name.slice(0, 28).padEnd(30) +
        (u.zpin || '—').padEnd(12) +
        (u.role || '—').padEnd(10) +
        (u.email || '—').slice(0, 28).padEnd(30) +
        fmtDate(u.membershipExpiry)
    );
  }
  if (candidates.length > SAMPLE_LIMIT) {
    console.log(`… and ${candidates.length - SAMPLE_LIMIT} more.`);
  }
  console.log('─'.repeat(90));
  console.log();

  if (!APPLY) {
    console.log('DRY RUN — no changes written. Re-run with --apply to commit.');
    await mongoose.disconnect();
    return;
  }

  const ids = candidates.map((u) => u._id);
  const result = await User.updateMany(
    { _id: { $in: ids } },
    { $set: { membershipStatus: 'expired' } }
  );

  console.log(`Updated ${result.modifiedCount} user(s). matched=${result.matchedCount}.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Script failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
