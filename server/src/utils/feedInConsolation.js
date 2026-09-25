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
//   8-draw main:   consolation semi-finals = main Round 1 losers, then final.
//                  Losers of main qualifying matches first play a main Round 1
//                  loser (Consolation Round 1) for that semi-final place — never
//                  the loser of the match their own qualifier went into.
//
// A main draw can also have a linked 3rd/4th place playoff category
// (consolationType 'third_place'): one match between the two semi-final losers.
// Semi-final losers keep their main-draw points; the playoff awards none.
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
  const { feedFromMatchNumber, feedFromQualifying, _id, ...rest } = p?.toObject ? p.toObject() : (p || {});
  return rest;
};
const isDone = m => !!m.winner || m.status === 'completed' || m.status === 'walkover';

// A slot filled by the loser of main-draw match `mainMatchNumber` (a match of
// the main draw's qualifying stage when fromQualifying).
const feedSlot = (mainMatchNumber, fromQualifying = false) => ({
  id: `feed-${fromQualifying ? 'Q' : 'M'}${mainMatchNumber}`,
  name: `Loser of ${fromQualifying ? 'qualifying ' : 'M'}${mainMatchNumber}`,
  isQualifierPlaceholder: true,
  feedFromMatchNumber: mainMatchNumber,
  ...(fromQualifying ? { feedFromQualifying: true } : {})
});

const findMain = (mainDraw, n, fromQualifying) =>
  (fromQualifying ? mainDraw?.qualifyingStage?.matches : mainDraw?.matches)?.find(x => x.matchNumber === n);

const surname = p => (p?.name || '').trim().split(/\s+/).slice(-1)[0];

// Readable name for a slot still waiting on a main-draw result — match numbers
// aren't printed on the draw, so name the two players (or the round) instead.
function describeFeed(mainDraw, mainMatchNumber, fromQualifying) {
  const m = findMain(mainDraw, mainMatchNumber, fromQualifying);
  if (!m) return `Loser of M${mainMatchNumber}`;
  if (isReal(m.player1) && isReal(m.player2)) return `Loser: ${surname(m.player1)} / ${surname(m.player2)}`;
  if (fromQualifying) return `Loser of qualifying ${mainMatchNumber}`;
  const mainMatches = mainDraw.matches;
  const roundMatches = mainMatches.filter(x => x.round === m.round).sort((a, b) => a.matchNumber - b.matchNumber);
  const rounds = Math.max(...mainMatches.map(x => x.round));
  const label = rounds - m.round === 1 ? 'SF' : rounds - m.round === 2 ? 'QF' : `R${m.round} match`;
  return `Loser of ${label} ${roundMatches.findIndex(x => x.matchNumber === mainMatchNumber) + 1}`;
}

const match = (matchNumber, round, roundName, player1, player2, extra = {}) => ({
  matchNumber, round, roundName, player1, player2, status: 'scheduled', ...extra
});

export function buildFeedInConsolationDraw(mainDraw) {
  const byRound = r => mainDraw.matches.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
  const r1 = byRound(1);
  const size = mainDraw.bracketSize || r1.length * 2;
  const now = new Date();

  const mainQualifying = (mainDraw.qualifyingStage?.matches || []).slice().sort((a, b) => a.matchNumber - b.matchNumber);

  if (size === 8) {
    // Semi-final slots: loser of main R1 match i → slot i
    const slots = r1.map(m => feedSlot(m.matchNumber));
    const qualifying = [];
    const intoR1 = new Set(mainQualifying.map(q => q.advancesToMatchNumber));
    const opponents = r1.filter(m => !intoR1.has(m.matchNumber));
    if (mainQualifying.length > opponents.length) {
      throw new Error('Too many qualifying matches to fit into the consolation draw');
    }
    const sf = mainQualifying.length + 1; // consolation draw match numbers follow its play-ins
    mainQualifying.forEach((q, i) => {
      const idx = r1.indexOf(opponents[i]);
      qualifying.push(match(i + 1, 1, 'Consolation Round 1',
        feedSlot(q.matchNumber, true), feedSlot(opponents[i].matchNumber),
        { advancesToMatchNumber: sf + Math.floor(idx / 2), advancesToSlot: idx % 2 === 0 ? 'player1' : 'player2' }));
      slots[idx] = { id: `cons-q${i + 1}`, name: `Winner of Cons. R1 match ${i + 1}`, isQualifierPlaceholder: true, qualifierLabel: `C${i + 1}` };
    });
    return {
      type: 'single_elimination',
      bracketSize: 4,
      numberOfRounds: 2,
      generatedAt: now,
      matches: [
        match(sf, 1, 'Consolation Semi-final', slots[0], slots[1]),
        match(sf + 1, 1, 'Consolation Semi-final', slots[2], slots[3]),
        match(sf + 2, 2, 'Consolation Final', undefined, undefined)
      ],
      ...(qualifying.length ? {
        qualifyingStage: { label: 'Consolation Round 1', matches: qualifying, numberOfRounds: 1, generatedAt: now, status: 'pending' }
      } : {})
    };
  }

  if (size !== 16) {
    throw new Error(`Feed-in consolation is only set up for 8- and 16-player main draws (this one is ${size})`);
  }
  if (mainQualifying.length) {
    throw new Error('Feed-in consolation for a 16-player main draw with qualifying matches is not supported');
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
      { id: `cons-q${k + 1}`, name: `Winner of Cons. R1 match ${k + 1}`, isQualifierPlaceholder: true, qualifierLabel: `C${k + 1}` },
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
  // (m is a main-draw or main-qualifying match)
  if (!m) return null;
  if (isBye(m.player1) || isBye(m.player2)) return m.winner ? BYE() : null;
  if (!m.winner || !['completed', 'walkover'].includes(m.status)) return null;
  const loser = m.player1?.id === m.winner ? m.player2 : m.player1;
  return isReal(loser) ? { id: loser.id, name: loser.name } : null;
}

// A real played result — BYE advancements don't count
const hasResult = m => !!m.winner && !isBye(m.player1) && !isBye(m.player2);

function setSlot(m, slot, player, feedFromMatchNumber, feedFromQualifying) {
  m[slot] = {
    ...player,
    ...(feedFromMatchNumber != null ? { feedFromMatchNumber } : {}),
    ...(feedFromQualifying ? { feedFromQualifying: true } : {})
  };
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
    const mainDraw = main?.draw;

    // Only these rounds take players fed in from the main draw
    const feedMatches = [...(cons.draw.qualifyingStage?.matches || []), ...cons.draw.matches.filter(m => m.round === 1)];
    for (const m of feedMatches) {
      if (hasResult(m)) continue; // never disturb a match that has been played
      for (const slot of ['player1', 'player2']) {
        const from = m[slot]?.feedFromMatchNumber;
        if (from == null) continue;
        const fromQ = !!m[slot].feedFromQualifying;
        const loser = mainLoser(findMain(mainDraw, from, fromQ));
        if (loser) setSlot(m, slot, loser, from, fromQ);
        else setSlot(m, slot, { ...feedSlot(from, fromQ), name: describeFeed(mainDraw, from, fromQ) }, from, fromQ); // waiting (or main result cleared)
      }
    }
    resolveByes(cons.draw);
    cons.markModified('draw');
  }
}

// True once any real consolation match has a result (byes don't count).
export function consolationHasResults(consolation) {
  const d = consolation?.draw;
  return [...(d?.qualifyingStage?.matches || []), ...(d?.matches || [])].some(hasResult);
}

// 3rd/4th place playoff: the two main-draw semi-final losers.
export function buildThirdPlaceDraw(mainDraw) {
  const rounds = mainDraw.numberOfRounds || Math.max(...mainDraw.matches.map(m => m.round));
  const sf = mainDraw.matches.filter(m => m.round === rounds - 1).sort((a, b) => a.matchNumber - b.matchNumber);
  if (sf.length !== 2) throw new Error('A 3rd place playoff needs a main draw with two semi-finals');
  return {
    type: 'single_elimination',
    bracketSize: 2,
    numberOfRounds: 1,
    generatedAt: new Date(),
    matches: [match(1, 1, '3rd Place Playoff', feedSlot(sf[0].matchNumber), feedSlot(sf[1].matchNumber))]
  };
}

export function buildLinkedDraw(linkedCategory, mainDraw) {
  return linkedCategory.consolationType === 'third_place'
    ? buildThirdPlaceDraw(mainDraw)
    : buildFeedInConsolationDraw(mainDraw);
}

export const linkedCategoriesOf = (tournament, mainCategory) =>
  tournament.categories.filter(c => c.consolationOf?.toString() === mainCategory._id.toString());

// The main draw of `mainCategory` was replaced: rebuild its linked consolation
// and playoff draws to match. Throws if any of them has already been played.
export function rebuildLinkedConsolation(tournament, mainCategory) {
  const linked = linkedCategoriesOf(tournament, mainCategory);
  const played = linked.find(consolationHasResults);
  if (played) {
    throw new Error(`${played.name} already has results — it cannot be rebuilt for a new main draw`);
  }
  for (const cons of linked) cons.draw = buildLinkedDraw(cons, mainCategory.draw);
  if (linked.length) syncFeedInConsolation(tournament, mainCategory);
  return linked;
}
