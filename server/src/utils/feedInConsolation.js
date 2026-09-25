// Feed-in consolation (FIC) draws for developmental categories.
//
// The main draw stays a normal single-elimination category (so advancement,
// finalizing and ranking points work unchanged). A separate category with
// `consolationOf` pointing at the main category holds the consolation draw:
//
//   16-draw main:  C1 (qualifyingStage) = main Round 1 losers, paired as in the main draw
//                  C2 (draw round 1)     = C1 winners v main Round 2 (QF) losers,
//                                          fed in reverse order to avoid instant rematches
//                  C3, consolation final = normal knockout
//   8-draw main:   consolation draw round 1 = main Round 1 losers, then knockout
//
// Consolation slots waiting for a main-draw loser are placeholders carrying
// `feedFromMatchNumber`. Whenever a main-draw result is saved,
// syncFeedInConsolation() drops the loser into that slot (or a BYE if the main
// match was a bye) and auto-advances players who face a BYE. Consolation
// categories never award ranking points (see rankingCategoryFor).

const BYE = () => ({ id: 'bye', name: 'BYE', isBye: true });
const isBye = p => !!p?.isBye;
const isReal = p => !!p?.id && !p.isBye && !p.isQualifierPlaceholder;
const winnerOf = m => (m.player1?.id === m.winner ? m.player1 : m.player2);
// Copy of a player for the next round, without the feed-in marker of the slot they came from
const carry = p => {
  const { feedFromMatchNumber, _id, ...rest } = p?.toObject ? p.toObject() : (p || {});
  return rest;
};
const isDone = m => !!m.winner || m.status === 'completed' || m.status === 'walkover';

const feedSlot = (mainMatchNumber) => ({
  id: `feed-M${mainMatchNumber}`,
  name: `Loser of M${mainMatchNumber}`,
  isQualifierPlaceholder: true,
  feedFromMatchNumber: mainMatchNumber
});

const match = (matchNumber, round, roundName, player1, player2, extra = {}) => ({
  matchNumber, round, roundName, player1, player2, status: 'scheduled', ...extra
});

export function buildFeedInConsolationDraw(mainDraw) {
  const byRound = r => mainDraw.matches.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
  const r1 = byRound(1);
  const size = mainDraw.bracketSize || r1.length * 2;
  const now = new Date();

  if (size === 8) {
    // 4 main R1 losers → 2 matches → consolation final
    return {
      type: 'single_elimination',
      bracketSize: 4,
      numberOfRounds: 2,
      generatedAt: now,
      matches: [
        match(1, 1, 'Consolation Semi-final', feedSlot(r1[0].matchNumber), feedSlot(r1[1].matchNumber)),
        match(2, 1, 'Consolation Semi-final', feedSlot(r1[2].matchNumber), feedSlot(r1[3].matchNumber)),
        match(3, 2, 'Consolation Final', undefined, undefined)
      ]
    };
  }

  if (size !== 16) {
    throw new Error(`Feed-in consolation is only set up for 8- and 16-player main draws (this one is ${size})`);
  }

  const r2 = byRound(2);
  const qualifying = [];
  const main = [];
  for (let k = 0; k < 4; k++) {
    qualifying.push(match(k + 1, 1, 'Consolation Round 1',
      feedSlot(r1[2 * k].matchNumber), feedSlot(r1[2 * k + 1].matchNumber),
      { advancesToMatchNumber: 5 + k, advancesToSlot: 'player1' }));
  }
  for (let k = 0; k < 4; k++) {
    main.push(match(5 + k, 1, 'Consolation Round 2',
      { id: `cons-q${k + 1}`, name: `Winner of C${k + 1}`, isQualifierPlaceholder: true, qualifierLabel: `C${k + 1}` },
      feedSlot(r2[3 - k].matchNumber)));
  }
  main.push(match(9, 2, 'Consolation Semi-final'));
  main.push(match(10, 2, 'Consolation Semi-final'));
  main.push(match(11, 3, 'Consolation Final'));

  return {
    type: 'single_elimination',
    bracketSize: 8,
    numberOfRounds: 3,
    generatedAt: now,
    matches: main,
    qualifyingStage: { label: 'Consolation Round 1', matches: qualifying, numberOfRounds: 1, generatedAt: now, status: 'pending' }
  };
}

// The loser of a finished main-draw match, BYE for a bye match, or null if
// the match has no result yet.
function mainLoser(m) {
  if (!m) return null;
  if (isBye(m.player1) || isBye(m.player2)) return m.winner ? BYE() : null;
  if (!m.winner || !['completed', 'walkover'].includes(m.status)) return null;
  const loser = m.player1?.id === m.winner ? m.player2 : m.player1;
  return isReal(loser) ? { id: loser.id, name: loser.name } : null;
}

const hasResult = m => !!m.winner || (['completed', 'walkover'].includes(m.status) && !isBye(m.player1) && !isBye(m.player2));

function setSlot(m, slot, player, feedFromMatchNumber) {
  m[slot] = { ...player, ...(feedFromMatchNumber != null ? { feedFromMatchNumber } : {}) };
}

function advanceInBracket(draw, m) {
  const roundMatches = draw.matches.filter(x => x.round === m.round).sort((a, b) => a.matchNumber - b.matchNumber);
  const pos = roundMatches.findIndex(x => x.matchNumber === m.matchNumber);
  const next = draw.matches.filter(x => x.round === m.round + 1).sort((a, b) => a.matchNumber - b.matchNumber)[Math.floor(pos / 2)];
  if (!next || hasResult(next)) return;
  next[pos % 2 === 0 ? 'player1' : 'player2'] = m.winner ? carry(winnerOf(m)) : BYE();
}

// Auto-complete matches where a player meets a BYE, and pass BYEs on when both
// sides are BYEs, until nothing changes.
function resolveByes(draw) {
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const m of draw.qualifyingStage?.matches || []) {
      if (isDone(m)) continue;
      const target = draw.matches.find(x => x.matchNumber === m.advancesToMatchNumber);
      if (isBye(m.player1) && isBye(m.player2)) {
        m.status = 'completed';
        if (target && target[m.advancesToSlot]?.isQualifierPlaceholder) target[m.advancesToSlot] = BYE();
        changed = true;
      } else if ((isBye(m.player1) && isReal(m.player2)) || (isBye(m.player2) && isReal(m.player1))) {
        const p = isReal(m.player1) ? m.player1 : m.player2;
        m.winner = p.id;
        m.status = 'completed';
        if (target && target[m.advancesToSlot]?.isQualifierPlaceholder) {
          target[m.advancesToSlot] = { id: p.id, name: p.name, qualifierLabel: target[m.advancesToSlot].qualifierLabel };
        }
        changed = true;
      }
    }
    for (const m of draw.matches) {
      if (isDone(m)) continue;
      if (isBye(m.player1) && isBye(m.player2)) {
        m.status = 'completed';
        advanceInBracket(draw, m);
        changed = true;
      } else if ((isBye(m.player1) && isReal(m.player2)) || (isBye(m.player2) && isReal(m.player1))) {
        m.winner = (isReal(m.player1) ? m.player1 : m.player2).id;
        m.status = 'completed';
        advanceInBracket(draw, m);
        changed = true;
      }
    }
    if (!changed) return;
  }
}

// Call after any draw result change in `category` (main or consolation),
// before saving the tournament.
export function syncFeedInConsolation(tournament, category) {
  const consolations = category.consolationOf
    ? [category]
    : tournament.categories.filter(c => c.consolationOf && c.consolationOf.toString() === category._id.toString());

  for (const cons of consolations) {
    if (!cons.draw) continue;
    const main = category.consolationOf ? tournament.categories.id(cons.consolationOf) : category;
    const mainMatches = main?.draw?.matches || [];

    // Only these rounds take players fed in from the main draw
    const feedMatches = [...(cons.draw.qualifyingStage?.matches || []), ...cons.draw.matches.filter(m => m.round === 1)];
    for (const m of feedMatches) {
      if (hasResult(m)) continue; // never disturb a match that has been played
      for (const slot of ['player1', 'player2']) {
        const from = m[slot]?.feedFromMatchNumber;
        if (from == null) continue;
        const loser = mainLoser(mainMatches.find(x => x.matchNumber === from));
        if (loser) setSlot(m, slot, loser, from);
        else if (!m[slot].isQualifierPlaceholder) setSlot(m, slot, feedSlot(from), from); // main result was cleared
      }
    }
    resolveByes(cons.draw);
    cons.markModified('draw');
  }
}
