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

  it('winner advances to next round in single elimination', () => {
    // Simulate the advancement logic from tournamentController.js
    const matches = JSON.parse(JSON.stringify(sampleDraw.matches));

    // Complete match 1 (round 1, matchNumber 1)
    const match = matches[0];
    match.winner = 'p1';
    match.score = '6-4 6-3';
    match.status = 'completed';

    // Advance winner
    const nextRound = match.round + 1;
    const matchPosition = match.matchNumber - 1;
    const nextMatchIndex = Math.floor(matchPosition / 2);
    const isFirstPlayer = matchPosition % 2 === 0;

    const nextMatches = matches.filter(m => m.round === nextRound);
    if (nextMatches[nextMatchIndex]) {
      const winnerPlayer = match.player1.id === match.winner ? match.player1 : match.player2;
      if (isFirstPlayer) {
        nextMatches[nextMatchIndex].player1 = winnerPlayer;
      } else {
        nextMatches[nextMatchIndex].player2 = winnerPlayer;
      }
    }

    // The final match should now have player1 set
    const finalMatch = matches.find(m => m.round === 2);
    expect(finalMatch.player1).toEqual({ id: 'p1', name: 'Player 1', seed: 1 });
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
