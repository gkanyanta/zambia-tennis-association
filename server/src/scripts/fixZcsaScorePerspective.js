/**
 * One-time migration: rewrite ZCSA match score strings so that the
 * winner's games always appear first in every set (ITF standard).
 * Run idempotently — safe to run multiple times.
 */
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';

const MONGO_URI =
  'mongodb+srv://ztaadmin:Mwapelishas1%40@zta-cluster.bo4yp7q.mongodb.net/zta_database?appName=ZTA-Cluster';
const ZCSA_ID = '69e682d1e80d2b6b8b52e55f';

function extractSuffix(body) {
  if (/\s*\bret\.?\s*$/i.test(body))
    return { body: body.replace(/\s*\bret\.?\s*$/i, '').trim(), suffix: ' ret.' };
  if (/\s*\bdef\.?\s*$/i.test(body))
    return { body: body.replace(/\s*\bdef\.?\s*$/i, '').trim(), suffix: ' def.' };
  return { body: body.trim(), suffix: '' };
}

function parseToken(token) {
  // [N-M]  bracket format (match tiebreak, winner's pts first)
  const br = token.match(/^\[(\d+)-(\d+)\]$/);
  if (br) return { type: 'bracket', g1: +br[1], g2: +br[2], tb: '' };

  // N-M or N-M(K) or N-M[K]  (normalise [K] → (K))
  const st = token.match(/^(\d+)-(\d+)(?:\((\d+)\)|\[(\d+)\])?$/);
  if (st) {
    const tbVal = st[3] ?? st[4];
    return { type: 'set', g1: +st[1], g2: +st[2], tb: tbVal ? `(${tbVal})` : '' };
  }

  return { type: 'unknown', raw: token };
}

function renderToken(t, flip) {
  if (t.type === 'unknown') return t.raw;
  const a = flip ? t.g2 : t.g1;
  const b = flip ? t.g1 : t.g2;
  if (t.type === 'bracket') return `[${a}-${b}]`;
  return `${a}-${b}${t.tb}`;
}

function fixScore(score, isP2Winner) {
  if (!score) return { fixed: score, action: 'skip-empty' };
  const trimmed = score.trim();
  if (!trimmed || /^w\/o$/i.test(trimmed) || /^walkover$/i.test(trimmed))
    return { fixed: trimmed, action: 'skip-wo' };

  const { body, suffix } = extractSuffix(trimmed);
  const tokens = body.split(/\s+/).filter(Boolean);
  const parsed = tokens.map(parseToken);
  const hasUnknown = parsed.some(p => p.type === 'unknown');

  if (hasUnknown) {
    const normalised = parsed.map(p => renderToken(p, false)).join(' ') + suffix;
    return { fixed: normalised, action: 'normalise-only (unknown token — manual review needed)' };
  }

  if (!isP2Winner) {
    const normalised = parsed.map(p => renderToken(p, false)).join(' ') + suffix;
    return { fixed: normalised, action: 'normalise-only (p1 winner)' };
  }

  // Winner = p2: count apparent set winners to decide if flip is needed.
  // If p2 appears to win the majority from the current string, the string is
  // from p1's (loser's) perspective and needs to be flipped.
  let p1Sets = 0, p2Sets = 0;
  for (const p of parsed) {
    if (p.g1 > p.g2) p1Sets++;
    else if (p.g2 > p.g1) p2Sets++;
  }
  const flip = p2Sets > p1Sets;
  const result = parsed.map(p => renderToken(p, flip)).join(' ') + suffix;
  return {
    fixed: result,
    action: flip ? 'flipped' : 'normalise-only (already winner perspective)',
  };
}

await mongoose.connect(MONGO_URI);
const col = mongoose.connection.db.collection('tournaments');
const t = await col.findOne({ _id: new ObjectId(ZCSA_ID) });
if (!t) { console.error('ZCSA tournament not found'); process.exit(1); }

console.log(`\nTournament: ${t.name}\n${'─'.repeat(60)}`);

let totalFixed = 0, totalFlagged = 0;

for (const cat of t.categories) {
  const allMatches = [
    ...(cat.draw?.matches || []),
    ...(cat.draw?.knockoutStage?.matches || []),
    ...((cat.draw?.roundRobinGroups || []).flatMap(g => g.matches || [])),
  ].filter(m => m.winner && m.score);

  if (allMatches.length === 0) continue;
  console.log(`\n▸ ${cat.name}`);

  for (const m of allMatches) {
    const isP2Winner = m.winner?.toString() === m.player2?.id?.toString();
    const { fixed, action } = fixScore(m.score, isP2Winner);
    const changed = fixed !== m.score;

    if (changed || action.includes('manual')) {
      console.log(
        `  ${m.player1?.name} vs ${m.player2?.name}\n` +
        `    before : "${m.score}"\n` +
        `    after  : "${fixed}"  [${action}]`
      );
    }

    if (action.includes('manual')) totalFlagged++;
    if (changed) { m.score = fixed; totalFixed++; }
  }
}

// Write back using raw collection update to avoid Mongoose schema conflicts
await col.replaceOne({ _id: new ObjectId(ZCSA_ID) }, t);

console.log(`\n${'─'.repeat(60)}`);
console.log(`Done. ${totalFixed} score(s) updated, ${totalFlagged} flagged for manual review.`);
await mongoose.disconnect();
