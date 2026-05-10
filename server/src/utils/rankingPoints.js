// Points awarded per finish position, by tournament grade
export const POINTS_TABLE = {
  A: { W: 130, F: 80, SF: 48, QF: 24, R16: 12, R32: 8, R64: 4, R128: 1 },
  B: { W: 100, F: 60, SF: 36, QF: 18, R16: 9,  R32: 5, R64: 3, R128: 1 },
  C: { W: 50,  F: 30, SF: 18, QF: 9,  R16: 5,  R32: 2 },
  D: { W: 25,  F: 15, SF: 9,  QF: 5,  R16: 2,  R32: 1 },
  E: { W: 10,  F: 6,  SF: 4,  QF: 2,  R16: 1 },
  F: { W: 5,   F: 3,  SF: 1 },
};

// Maps a round number to a position code given the total rounds in the draw.
// round == totalRounds        → 'F'   (final)
// round == totalRounds - 1   → 'SF'
// round == totalRounds - 2   → 'QF'
// round == totalRounds - 3   → 'R16'
// …etc.
// Returns null for rounds that earn no points under any grade.
export function roundToPosition(round, totalRounds) {
  const fromFinal = totalRounds - round;
  switch (fromFinal) {
    case 0: return 'F';    // loser of final = runner-up
    case 1: return 'SF';
    case 2: return 'QF';
    case 3: return 'R16';
    case 4: return 'R32';
    case 5: return 'R64';
    case 6: return 'R128';
    default: return null;
  }
}

export function getPoints(grade, position) {
  return POINTS_TABLE[grade]?.[position] ?? 0;
}

// Derive the Ranking category string from a tournament category document.
// Returns null if the category has no matching ranking category.
export function rankingCategoryFor(cat) {
  const { type, gender, format, ageGroup } = cat;

  if (type === 'senior') {
    if (format === 'singles') {
      if (gender === 'mens')   return 'men_senior';
      if (gender === 'womens') return 'women_senior';
    }
    if (format === 'doubles') {
      if (gender === 'mens')   return 'men_doubles';
      if (gender === 'womens') return 'women_doubles';
    }
    if (format === 'mixed_doubles') return 'mixed_doubles';
  }

  if (type === 'junior') {
    const ag = ageGroup?.toLowerCase().replace('+', 'plus') || '';
    if (gender === 'boys') {
      if (ag === 'u10') return 'boys_10u';
      if (ag === 'u12') return 'boys_12u';
      if (ag === 'u14') return 'boys_14u';
      if (ag === 'u16') return 'boys_16u';
      if (ag === 'u18') return 'boys_18u';
    }
    if (gender === 'girls') {
      if (ag === 'u10') return 'girls_10u';
      if (ag === 'u12') return 'girls_12u';
      if (ag === 'u14') return 'girls_14u';
      if (ag === 'u16') return 'girls_16u';
      if (ag === 'u18') return 'girls_18u';
    }
  }

  if (type === 'madalas') return null; // madalas handled separately in finalizeResults

  return null;
}
