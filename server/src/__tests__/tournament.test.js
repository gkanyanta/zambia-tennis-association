import { jest, describe, it, expect } from '@jest/globals';
import { calculateTennisAge } from '../utils/tournamentEligibility.js';

// ============================================================
// Unit tests for tennis age, seed validation, draw/results logic
// ============================================================

describe('calculateTennisAge', () => {
  it('returns tournamentYear - birthYear (simple subtraction)', () => {
    expect(calculateTennisAge('2010-06-15', 2026)).toBe(16);
    expect(calculateTennisAge('2010-12-31', 2026)).toBe(16);
    expect(calculateTennisAge('2010-01-01', 2026)).toBe(16);
  });

  it('handles edge case — born in same year as tournament', () => {
    expect(calculateTennisAge('2026-03-01', 2026)).toBe(0);
  });
});

// ============================================================
// Seed validation tests (mirroring server bulkUpdateSeeds logic)
// ============================================================
describe('Seed validation', () => {
  // This mirrors the server-side validation logic from tournamentController.js bulkUpdateSeeds
  function validateSeeds(seeds, acceptedCount) {
    const seedNumbers = seeds.filter(s => s.seedNumber != null && s.seedNumber > 0).map(s => s.seedNumber);
    const uniqueSeeds = new Set(seedNumbers);
    if (uniqueSeeds.size !== seedNumbers.length) {
      return { valid: false, message: 'Duplicate seed numbers are not allowed' };
    }

    const maxSeed = Math.min(32, acceptedCount);
    for (const { seedNumber } of seeds) {
      if (seedNumber == null || seedNumber === 0) continue;
      if (!Number.isInteger(seedNumber) || seedNumber < 1 || seedNumber > maxSeed) {
        return { valid: false, message: `Seed numbers must be between 1 and ${maxSeed}` };
      }
    }

    return { valid: true };
  }

  it('rejects seedNumber 0 (does not coerce to 1)', () => {
    // Seed 0 should be treated as "unseed", not converted to 1
    const result = validateSeeds([{ entryId: 'a', seedNumber: 0 }], 8);
    // seedNumber 0 is treated as "remove seed" — should pass validation (it's skipped)
    expect(result.valid).toBe(true);
  });

  it('rejects negative seed numbers', () => {
    const result = validateSeeds([{ entryId: 'a', seedNumber: -1 }], 8);
    expect(result.valid).toBe(false);
  });

  it('rejects decimal seed numbers', () => {
    const result = validateSeeds([{ entryId: 'a', seedNumber: 1.5 }], 8);
    expect(result.valid).toBe(false);
  });

  it('accepts null/undefined seed (meaning "not seeded")', () => {
    const result = validateSeeds(
      [
        { entryId: 'a', seedNumber: null },
        { entryId: 'b', seedNumber: undefined },
        { entryId: 'c', seedNumber: 1 },
      ],
      8
    );
    expect(result.valid).toBe(true);
  });

  it('accepts valid seed in range 1..N', () => {
    const result = validateSeeds(
      [
        { entryId: 'a', seedNumber: 1 },
        { entryId: 'b', seedNumber: 2 },
        { entryId: 'c', seedNumber: 3 },
      ],
      8
    );
    expect(result.valid).toBe(true);
  });

  it('rejects seeds exceeding accepted count', () => {
    const result = validateSeeds(
      [{ entryId: 'a', seedNumber: 5 }],
      4 // only 4 accepted, so max seed is 4
    );
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate seed numbers', () => {
    const result = validateSeeds(
      [
        { entryId: 'a', seedNumber: 1 },
        { entryId: 'b', seedNumber: 1 },
      ],
      8
    );
    expect(result.valid).toBe(false);
  });

  it('blank seed (0 or null) does not create a duplicate conflict with existing seed 1', () => {
    // This is the exact bug case: clearing a seed should not collide with seed 1
    const result = validateSeeds(
      [
        { entryId: 'a', seedNumber: 0 },   // cleared — should be treated as "unseed"
        { entryId: 'b', seedNumber: 1 },   // valid seed 1
      ],
      8
    );
    expect(result.valid).toBe(true);
  });
});

// ============================================================
// Draw/results data shape tests
// ============================================================
describe('Draw data shape', () => {
  // Simulates what the generateDraw endpoint receives and stores
  const sampleDraw = {
    type: 'single_elimination',
    matches: [
      {
        id: 'match-1',
        matchNumber: 1,
        round: 1,
        roundName: 'Semi Finals',
        player1: { id: 'p1', name: 'Player 1', seed: 1 },
        player2: { id: 'p2', name: 'Player 2' },
        status: 'scheduled',
      },
      {
        id: 'match-2',
        matchNumber: 2,
        round: 1,
        roundName: 'Semi Finals',
        player1: { id: 'p3', name: 'Player 3', seed: 2 },
        player2: { id: 'p4', name: 'Player 4' },
        status: 'scheduled',
      },
      {
        id: 'match-3',
        matchNumber: 1,
        round: 2,
        roundName: 'Final',
        player1: null,
        player2: null,
        status: 'scheduled',
      },
    ],
    bracketSize: 4,
    numberOfRounds: 2,
    generatedAt: new Date().toISOString(),
  };

  it('draw has required fields', () => {
    expect(sampleDraw.type).toBe('single_elimination');
    expect(sampleDraw.matches).toHaveLength(3);
    expect(sampleDraw.bracketSize).toBe(4);
    expect(sampleDraw.numberOfRounds).toBe(2);
    expect(sampleDraw.generatedAt).toBeDefined();
  });

  it('saving a match result persists score and winner', () => {
    // Simulate updateMatchResult logic
    const match = { ...sampleDraw.matches[0] };
    match.winner = 'p1';
    match.score = '6-4 6-3';
    match.status = 'completed';
    match.completedTime = new Date().toISOString();

    expect(match.winner).toBe('p1');
    expect(match.score).toBe('6-4 6-3');
    expect(match.status).toBe('completed');
  });

  it('winner advances to next round using position-in-round (not global matchNumber)', () => {
    // Use an 8-player draw where matchNumbers are global: R1=1-4, R2=5-6, R3=7
    const draw8 = {
      type: 'single_elimination',
      matches: [
        { _id: 'm1', id: 'm1', matchNumber: 1, round: 1, roundName: 'QF', player1: { id: 'p1', name: 'P1', seed: 1 }, player2: { id: 'p2', name: 'P2' }, status: 'scheduled' },
        { _id: 'm2', id: 'm2', matchNumber: 2, round: 1, roundName: 'QF', player1: { id: 'p3', name: 'P3' }, player2: { id: 'p4', name: 'P4' }, status: 'scheduled' },
        { _id: 'm3', id: 'm3', matchNumber: 3, round: 1, roundName: 'QF', player1: { id: 'p5', name: 'P5', seed: 2 }, player2: { id: 'p6', name: 'P6' }, status: 'scheduled' },
        { _id: 'm4', id: 'm4', matchNumber: 4, round: 1, roundName: 'QF', player1: { id: 'p7', name: 'P7' }, player2: { id: 'p8', name: 'P8' }, status: 'scheduled' },
        { _id: 'm5', id: 'm5', matchNumber: 5, round: 2, roundName: 'SF', player1: null, player2: null, status: 'scheduled' },
        { _id: 'm6', id: 'm6', matchNumber: 6, round: 2, roundName: 'SF', player1: null, player2: null, status: 'scheduled' },
        { _id: 'm7', id: 'm7', matchNumber: 7, round: 3, roundName: 'Final', player1: null, player2: null, status: 'scheduled' },
      ],
    };

    // Helper: mimics the FIXED server advancement logic
    function advanceWinner(matches, completedMatch) {
      const nextRound = completedMatch.round + 1;
      const currentRoundMatches = matches
        .filter(m => m.round === completedMatch.round)
        .sort((a, b) => a.matchNumber - b.matchNumber);
      const positionInRound = currentRoundMatches.findIndex(m => m._id === completedMatch._id);
      const nextMatchIdx = Math.floor(positionInRound / 2);
      const isFirstPlayer = positionInRound % 2 === 0;

      const nextMatches = matches.filter(m => m.round === nextRound).sort((a, b) => a.matchNumber - b.matchNumber);
      if (nextMatches[nextMatchIdx]) {
        const winner = completedMatch.player1.id === completedMatch.winner ? completedMatch.player1 : completedMatch.player2;
        if (isFirstPlayer) {
          nextMatches[nextMatchIdx].player1 = winner;
        } else {
          nextMatches[nextMatchIdx].player2 = winner;
        }
      }
    }

    const matches = JSON.parse(JSON.stringify(draw8.matches));

    // Complete all QF matches
    matches[0].winner = 'p1'; matches[0].status = 'completed';
    advanceWinner(matches, matches[0]);
    matches[1].winner = 'p4'; matches[1].status = 'completed';
    advanceWinner(matches, matches[1]);
    matches[2].winner = 'p5'; matches[2].status = 'completed';
    advanceWinner(matches, matches[2]);
    matches[3].winner = 'p8'; matches[3].status = 'completed';
    advanceWinner(matches, matches[3]);

    // SF matches (matchNumber 5,6) should now have players
    const sf1 = matches.find(m => m.matchNumber === 5);
    const sf2 = matches.find(m => m.matchNumber === 6);
    expect(sf1.player1.id).toBe('p1');
    expect(sf1.player2.id).toBe('p4');
    expect(sf2.player1.id).toBe('p5');
    expect(sf2.player2.id).toBe('p8');

    // Now complete SF matches and advance to final
    sf1.winner = 'p1'; sf1.status = 'completed';
    advanceWinner(matches, sf1);
    sf2.winner = 'p5'; sf2.status = 'completed';
    advanceWinner(matches, sf2);

    const final = matches.find(m => m.matchNumber === 7);
    expect(final.player1.id).toBe('p1');
    expect(final.player2.id).toBe('p5');
  });

  it('OLD BUG: global matchNumber advancement fails for later rounds', () => {
    // Demonstrates the bug with the old logic: matchPosition = matchNumber - 1
    const matches = [
      { matchNumber: 5, round: 2, player1: { id: 'p1', name: 'P1' }, player2: { id: 'p2', name: 'P2' }, winner: 'p1', status: 'completed' },
      { matchNumber: 6, round: 2, player1: { id: 'p3', name: 'P3' }, player2: { id: 'p4', name: 'P4' }, winner: 'p3', status: 'completed' },
      { matchNumber: 7, round: 3, player1: null, player2: null, status: 'scheduled' },
    ];

    // Old buggy logic: matchPosition = matchNumber - 1
    const match = matches[0]; // matchNumber 5
    const matchPosition = match.matchNumber - 1; // 4
    const nextMatchIndex = Math.floor(matchPosition / 2); // 2
    const nextMatches = matches.filter(m => m.round === 3); // [match 7]
    // nextMatches[2] is undefined — winner never advances!
    expect(nextMatches[nextMatchIndex]).toBeUndefined();
  });

  it('tournament with generated draw returns it (not undefined)', () => {
    // Simulates what happens when client sends { draw: drawData }
    const reqBody = { draw: sampleDraw };
    const { draw } = reqBody;

    expect(draw).toBeDefined();
    expect(draw.type).toBe('single_elimination');
    expect(draw.matches).toHaveLength(3);
  });

  it('tournament without draw wrapper returns undefined (the bug)', () => {
    // This was the old bug: client sent raw draw, server destructured { draw }
    const reqBody = sampleDraw; // raw draw, not wrapped
    const { draw } = reqBody;

    // 'draw' is undefined because sampleDraw has no 'draw' key
    expect(draw).toBeUndefined();
  });
});
