import Ranking from '../models/Ranking.js';
import User from '../models/User.js';
import { generateNextZPIN } from '../utils/generateZPIN.js';

// --- Category classification ---

const SENIOR_CATEGORIES = [
  'men_senior', 'women_senior',
  'men_doubles', 'women_doubles', 'mixed_doubles'
];
const JUNIOR_CATEGORIES = [
  'boys_10u', 'boys_12u', 'boys_14u', 'boys_16u', 'boys_18u',
  'girls_10u', 'girls_12u', 'girls_14u', 'girls_16u', 'girls_18u'
];

export function getSegment(category) {
  if (SENIOR_CATEGORIES.includes(category)) return 'SENIOR';
  if (JUNIOR_CATEGORIES.includes(category)) return 'JUNIOR';
  return 'UNKNOWN';
}

export function getGenderFromCategory(category) {
  if (['men_senior', 'men_doubles', 'mixed_doubles'].includes(category)) return 'male';
  if (['women_senior', 'women_doubles'].includes(category)) return 'female';
  if (category.startsWith('boys_')) return 'male';
  if (category.startsWith('girls_')) return 'female';
  return null;
}

// --- Name utilities ---

export function normalizeName(name) {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Split a full name into firstName / lastName.
 * Handles "Last, First" and "First Last" and "First Middle Last" formats.
 */
export function splitName(fullName) {
  const name = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!name) return { firstName: '', lastName: '' };

  // "Last, First" format
  if (name.includes(',')) {
    const parts = name.split(',').map(s => s.trim());
    return { firstName: parts[1] || '', lastName: parts[0] || '' };
  }

  const parts = name.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  // 3+ parts: first word is firstName, last word is lastName
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

/**
 * Convert a name to Title Case
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// --- Detection ---

/**
 * Detect ranking players not present in the User table.
 * Returns an array of candidate objects with status, matching info, etc.
 */
export async function detectMissingPlayers() {
  const allRankings = await Ranking.find({ isActive: true }).lean();
  const allUsers = await User.find({ role: 'player' }).lean();

  // Build user lookup indexes
  const userByZpin = new Map();
  const userById = new Map();
  const userByNormalizedName = new Map(); // "first last" -> [users]

  for (const user of allUsers) {
    if (user.zpin) userByZpin.set(user.zpin, user);
    userById.set(user._id.toString(), user);

    const normalizedFull = normalizeName(`${user.firstName} ${user.lastName}`);
    if (!userByNormalizedName.has(normalizedFull)) {
      userByNormalizedName.set(normalizedFull, [user]);
    } else {
      userByNormalizedName.get(normalizedFull).push(user);
    }
  }

  // Deduplicate ranking entries by (normalizedName, gender)
  const playerMap = new Map();

  for (const ranking of allRankings) {
    const normalizedName = normalizeName(ranking.playerName);
    const gender = getGenderFromCategory(ranking.category);
    const segment = getSegment(ranking.category);
    const key = `${normalizedName}|${gender}`;

    if (!playerMap.has(key)) {
      playerMap.set(key, {
        playerName: ranking.playerName.trim().replace(/\s+/g, ' '),
        normalizedName,
        gender,
        club: ranking.club || '',
        categories: [ranking.category],
        segments: new Set([segment]),
        rankingIds: [ranking._id.toString()],
        playerId: ranking.playerId || null,
        playerZpin: ranking.playerZpin || null,
      });
    } else {
      const entry = playerMap.get(key);
      if (!entry.categories.includes(ranking.category)) {
        entry.categories.push(ranking.category);
      }
      entry.segments.add(segment);
      entry.rankingIds.push(ranking._id.toString());
      if (ranking.playerId) entry.playerId = ranking.playerId;
      if (ranking.playerZpin) entry.playerZpin = ranking.playerZpin;
      if (!entry.club && ranking.club) entry.club = ranking.club;
    }
  }

  // Match each ranking player to a user
  const results = [];

  for (const [, info] of playerMap) {
    let matchedUser = null;
    let matchMethod = null;
    let status = null;
    let notes = '';

    // Method 1: Match by playerId reference
    if (info.playerId) {
      const user = userById.get(info.playerId.toString());
      if (user) {
        matchedUser = user;
        matchMethod = 'playerId';
      }
    }

    // Method 2: Match by playerZpin
    if (!matchedUser && info.playerZpin) {
      const user = userByZpin.get(info.playerZpin);
      if (user) {
        matchedUser = user;
        matchMethod = 'zpin';
      }
    }

    // Method 3: Match by normalized full name (as stored)
    if (!matchedUser) {
      const nameMatches = userByNormalizedName.get(info.normalizedName);
      if (nameMatches && nameMatches.length === 1) {
        matchedUser = nameMatches[0];
        matchMethod = 'name_exact';
      } else if (nameMatches && nameMatches.length > 1) {
        const genderFiltered = nameMatches.filter(u => u.gender === info.gender);
        if (genderFiltered.length === 1) {
          matchedUser = genderFiltered[0];
          matchMethod = 'name+gender';
        } else {
          status = 'AMBIGUOUS_MATCH';
          notes = `Multiple users match name: ${nameMatches.map(u => u.zpin || u._id).join(', ')}`;
        }
      }
    }

    // Method 4: Try reversed name (rankings often store "LAST FIRST")
    if (!matchedUser && !status) {
      const { firstName, lastName } = splitName(info.playerName);
      const reversedNorm = normalizeName(`${lastName} ${firstName}`);
      if (reversedNorm !== info.normalizedName) {
        const revMatches = userByNormalizedName.get(reversedNorm);
        if (revMatches && revMatches.length === 1) {
          matchedUser = revMatches[0];
          matchMethod = 'name_reversed';
          notes = 'Matched with reversed name order';
        } else if (revMatches && revMatches.length > 1) {
          const genderFiltered = revMatches.filter(u => u.gender === info.gender);
          if (genderFiltered.length === 1) {
            matchedUser = genderFiltered[0];
            matchMethod = 'name_reversed+gender';
            notes = 'Matched with reversed name + gender';
          }
        }
      }
    }

    // Method 5: Split name and match first/last against User.firstName/lastName
    if (!matchedUser && !status) {
      const { firstName: rFirst, lastName: rLast } = splitName(info.playerName);
      const rFirstNorm = normalizeName(rFirst);
      const rLastNorm = normalizeName(rLast);

      if (rFirstNorm && rLastNorm) {
        const partialMatches = allUsers.filter(u => {
          const uFirstNorm = normalizeName(u.firstName);
          const uLastNorm = normalizeName(u.lastName);
          return (
            (uFirstNorm === rFirstNorm && uLastNorm === rLastNorm) ||
            (uFirstNorm === rLastNorm && uLastNorm === rFirstNorm)
          );
        });

        if (partialMatches.length === 1) {
          matchedUser = partialMatches[0];
          matchMethod = 'name_split';
        } else if (partialMatches.length > 1) {
          const genderFiltered = partialMatches.filter(u => u.gender === info.gender);
          if (genderFiltered.length === 1) {
            matchedUser = genderFiltered[0];
            matchMethod = 'name_split+gender';
          } else if (genderFiltered.length > 1) {
            status = 'AMBIGUOUS_MATCH';
            notes = `Multiple users match split name: ${partialMatches.map(u => `${u.firstName} ${u.lastName} (${u.zpin || u._id})`).join('; ')}`;
          }
        }
      }
    }

    // Determine final status
    if (!status) {
      if (matchedUser) {
        if (matchedUser.zpin) {
          status = 'OK';
          notes = notes || `Matched via ${matchMethod}`;
        } else {
          status = 'HAS_PLAYER_NO_ZPIN';
          notes = `Player exists (${matchedUser._id}) but has no ZPIN. Matched via ${matchMethod}`;
        }
      } else {
        status = 'MISSING_PLAYER';
        notes = notes || 'No matching user found in database';
      }
    }

    // Determine segment
    let segment;
    if (info.segments.has('SENIOR') && info.segments.has('JUNIOR')) {
      segment = 'SENIOR';
      notes += '; Appears in both senior and junior categories';
    } else if (info.segments.has('SENIOR')) {
      segment = 'SENIOR';
    } else {
      segment = 'JUNIOR';
    }

    // Determine default action
    let action;
    if (status === 'MISSING_PLAYER') action = 'CREATE';
    else if (status === 'HAS_PLAYER_NO_ZPIN') action = 'UPDATE';
    else action = 'SKIP'; // OK or AMBIGUOUS_MATCH

    // Parse name for export
    const { firstName, lastName } = splitName(info.playerName);

    results.push({
      action,
      segment,
      status,
      proposed_zpin: '', // filled later during export
      full_name: info.playerName,
      first_name: toTitleCase(firstName),
      last_name: toTitleCase(lastName),
      gender: info.gender || '',
      date_of_birth: '',
      club: info.club,
      phone: '',
      email: '',
      ranking_source_ids: info.rankingIds.join(';'),
      categories: info.categories.join(', '),
      matched_player_id: matchedUser ? matchedUser._id.toString() : '',
      current_zpin: matchedUser ? matchedUser.zpin || '' : '',
      match_method: matchMethod || '',
      notes,
    });
  }

  // Sort: MISSING_PLAYER first, then HAS_PLAYER_NO_ZPIN, then AMBIGUOUS, then OK
  // Within each group, sort by segment then name
  const statusOrder = { MISSING_PLAYER: 0, HAS_PLAYER_NO_ZPIN: 1, AMBIGUOUS_MATCH: 2, OK: 3 };
  results.sort((a, b) => {
    const so = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    if (so !== 0) return so;
    const seg = a.segment.localeCompare(b.segment);
    if (seg !== 0) return seg;
    return a.full_name.localeCompare(b.full_name);
  });

  return results;
}

/**
 * Generate proposed ZPINs for candidates that need them.
 * Mutates the results array in-place.
 */
export async function assignProposedZpins(results) {
  // Get current highest ZPINs
  const lastJunior = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: -1 }).limit(1).lean();
  const lastSenior = await User.findOne({ zpin: /^ZTAS/ }).sort({ zpin: -1 }).limit(1).lean();

  let nextJunior = 1;
  let nextSenior = 1;

  if (lastJunior && lastJunior.zpin) {
    const num = parseInt(lastJunior.zpin.substring(4));
    if (!isNaN(num)) nextJunior = num + 1;
  }
  if (lastSenior && lastSenior.zpin) {
    const num = parseInt(lastSenior.zpin.substring(4));
    if (!isNaN(num)) nextSenior = num + 1;
  }

  // Also check for any ZPINs already proposed in this batch to avoid collisions
  const proposedZpins = new Set();
  // Add all existing ZPINs
  const existingZpins = await User.find({ zpin: { $ne: null } }).select('zpin').lean();
  for (const u of existingZpins) {
    if (u.zpin) proposedZpins.add(u.zpin);
  }

  for (const row of results) {
    if (row.action === 'CREATE' || row.action === 'UPDATE') {
      if (row.action === 'UPDATE' && row.current_zpin) {
        // Already has ZPIN, don't overwrite
        row.proposed_zpin = row.current_zpin;
        continue;
      }

      const prefix = row.segment === 'JUNIOR' ? 'ZTAJ' : 'ZTAS';
      let num = row.segment === 'JUNIOR' ? nextJunior : nextSenior;

      // Find next available number
      let candidate;
      do {
        candidate = `${prefix}${String(num).padStart(4, '0')}`;
        num++;
      } while (proposedZpins.has(candidate));

      row.proposed_zpin = candidate;
      proposedZpins.add(candidate);

      // Update the counter
      if (row.segment === 'JUNIOR') nextJunior = num;
      else nextSenior = num;
    }
  }

  return { nextJunior, nextSenior };
}

/**
 * Get summary statistics from detection results
 */
export function getSummary(results) {
  const missing = results.filter(r => r.status === 'MISSING_PLAYER');
  const noZpin = results.filter(r => r.status === 'HAS_PLAYER_NO_ZPIN');
  const ambiguous = results.filter(r => r.status === 'AMBIGUOUS_MATCH');
  const ok = results.filter(r => r.status === 'OK');

  return {
    total: results.length,
    ok: ok.length,
    missing: missing.length,
    missingSeniors: missing.filter(r => r.segment === 'SENIOR').length,
    missingJuniors: missing.filter(r => r.segment === 'JUNIOR').length,
    noZpin: noZpin.length,
    noZpinSeniors: noZpin.filter(r => r.segment === 'SENIOR').length,
    noZpinJuniors: noZpin.filter(r => r.segment === 'JUNIOR').length,
    ambiguous: ambiguous.length,
    actionable: missing.length + noZpin.length,
    actionableSeniors: missing.filter(r => r.segment === 'SENIOR').length + noZpin.filter(r => r.segment === 'SENIOR').length,
    actionableJuniors: missing.filter(r => r.segment === 'JUNIOR').length + noZpin.filter(r => r.segment === 'JUNIOR').length,
  };
}
