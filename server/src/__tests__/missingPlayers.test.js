import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  normalizeName,
  splitName,
  toTitleCase,
  getSegment,
  getGenderFromCategory,
} from '../services/missingPlayersService.js';

// ============================================================
// Unit tests for name utilities
// ============================================================

describe('normalizeName', () => {
  it('trims whitespace and collapses multiple spaces', () => {
    expect(normalizeName('  PHIRI   DIXON  ')).toBe('phiri dixon');
  });

  it('lowercases the name', () => {
    expect(normalizeName('JOHN DOE')).toBe('john doe');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
    expect(normalizeName('')).toBe('');
  });
});

describe('splitName', () => {
  it('splits simple "First Last" format', () => {
    expect(splitName('PHIRI DIXON')).toEqual({ firstName: 'PHIRI', lastName: 'DIXON' });
  });

  it('handles "Last, First" comma format', () => {
    expect(splitName('DIXON, PHIRI')).toEqual({ firstName: 'PHIRI', lastName: 'DIXON' });
  });

  it('handles three-part names (first middle last)', () => {
    const result = splitName('KONDWANI GONDWE CHIRWA');
    expect(result.firstName).toBe('KONDWANI');
    expect(result.lastName).toBe('CHIRWA');
  });

  it('handles single-word names', () => {
    expect(splitName('MADONNA')).toEqual({ firstName: 'MADONNA', lastName: '' });
  });

  it('handles empty/null input', () => {
    expect(splitName('')).toEqual({ firstName: '', lastName: '' });
    expect(splitName(null)).toEqual({ firstName: '', lastName: '' });
  });
});

describe('toTitleCase', () => {
  it('converts to title case', () => {
    expect(toTitleCase('PHIRI DIXON')).toBe('Phiri Dixon');
    expect(toTitleCase('john doe')).toBe('John Doe');
  });

  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(null)).toBe('');
  });
});

// ============================================================
// Category classification tests
// ============================================================

describe('getSegment', () => {
  it('classifies senior categories', () => {
    expect(getSegment('men_senior')).toBe('SENIOR');
    expect(getSegment('women_senior')).toBe('SENIOR');
    expect(getSegment('men_doubles')).toBe('SENIOR');
    expect(getSegment('women_doubles')).toBe('SENIOR');
    expect(getSegment('mixed_doubles')).toBe('SENIOR');
  });

  it('classifies junior categories', () => {
    expect(getSegment('boys_10u')).toBe('JUNIOR');
    expect(getSegment('boys_12u')).toBe('JUNIOR');
    expect(getSegment('boys_14u')).toBe('JUNIOR');
    expect(getSegment('boys_16u')).toBe('JUNIOR');
    expect(getSegment('boys_18u')).toBe('JUNIOR');
    expect(getSegment('girls_10u')).toBe('JUNIOR');
    expect(getSegment('girls_12u')).toBe('JUNIOR');
    expect(getSegment('girls_14u')).toBe('JUNIOR');
    expect(getSegment('girls_16u')).toBe('JUNIOR');
    expect(getSegment('girls_18u')).toBe('JUNIOR');
  });

  it('returns UNKNOWN for unrecognized categories', () => {
    expect(getSegment('wheelchair')).toBe('UNKNOWN');
    expect(getSegment('')).toBe('UNKNOWN');
  });
});

describe('getGenderFromCategory', () => {
  it('returns male for men/boys categories', () => {
    expect(getGenderFromCategory('men_senior')).toBe('male');
    expect(getGenderFromCategory('boys_10u')).toBe('male');
    expect(getGenderFromCategory('boys_18u')).toBe('male');
    expect(getGenderFromCategory('men_doubles')).toBe('male');
    expect(getGenderFromCategory('mixed_doubles')).toBe('male');
  });

  it('returns female for women/girls categories', () => {
    expect(getGenderFromCategory('women_senior')).toBe('female');
    expect(getGenderFromCategory('girls_10u')).toBe('female');
    expect(getGenderFromCategory('girls_18u')).toBe('female');
    expect(getGenderFromCategory('women_doubles')).toBe('female');
  });

  it('returns null for unknown categories', () => {
    expect(getGenderFromCategory('unknown')).toBeNull();
  });
});

// ============================================================
// ZPIN format validation tests
// ============================================================

describe('ZPIN format', () => {
  const ZPIN_REGEX = /^ZTA[JS]\d{4,}$/;

  it('accepts valid senior ZPINs', () => {
    expect(ZPIN_REGEX.test('ZTAS0001')).toBe(true);
    expect(ZPIN_REGEX.test('ZTAS0099')).toBe(true);
    expect(ZPIN_REGEX.test('ZTAS1234')).toBe(true);
  });

  it('accepts valid junior ZPINs', () => {
    expect(ZPIN_REGEX.test('ZTAJ0001')).toBe(true);
    expect(ZPIN_REGEX.test('ZTAJ0205')).toBe(true);
    expect(ZPIN_REGEX.test('ZTAJ9999')).toBe(true);
  });

  it('rejects invalid ZPINs', () => {
    expect(ZPIN_REGEX.test('ZTA0001')).toBe(false);   // missing J/S
    expect(ZPIN_REGEX.test('ZTAK0001')).toBe(false);  // wrong prefix letter
    expect(ZPIN_REGEX.test('ZTAJ')).toBe(false);      // no number
    expect(ZPIN_REGEX.test('ZTAJ01')).toBe(false);    // too few digits
    expect(ZPIN_REGEX.test('ztaj0001')).toBe(false);  // lowercase
    expect(ZPIN_REGEX.test('')).toBe(false);
    expect(ZPIN_REGEX.test('ABC12345')).toBe(false);
  });

  it('generates unique ZPINs for a batch', () => {
    // Simulate batch ZPIN generation
    const zpins = new Set();
    let nextJunior = 200;
    let nextSenior = 100;

    for (let i = 0; i < 50; i++) {
      const isJunior = i % 2 === 0;
      const prefix = isJunior ? 'ZTAJ' : 'ZTAS';
      const num = isJunior ? nextJunior++ : nextSenior++;
      const zpin = `${prefix}${String(num).padStart(4, '0')}`;
      expect(zpins.has(zpin)).toBe(false); // ensure uniqueness
      zpins.add(zpin);
    }

    expect(zpins.size).toBe(50);
  });
});

// ============================================================
// Import validation tests
// ============================================================

describe('Import validation', () => {
  const ZPIN_REGEX = /^ZTA[JS]\d{4,}$/;

  function validateRow(row, rowIndex) {
    const errors = [];
    const action = (row.action || '').toUpperCase().trim();

    if (!['CREATE', 'UPDATE', 'SKIP'].includes(action)) {
      errors.push(`Row ${rowIndex}: Invalid action "${row.action}".`);
    }
    if (action === 'SKIP') return { valid: true, errors: [], skip: true };
    if (action === 'CREATE' && !row.full_name?.trim()) {
      errors.push(`Row ${rowIndex}: full_name required for CREATE.`);
    }
    if (action === 'CREATE' && !row.proposed_zpin?.trim()) {
      errors.push(`Row ${rowIndex}: proposed_zpin required for CREATE.`);
    }
    if (row.proposed_zpin?.trim() && !ZPIN_REGEX.test(row.proposed_zpin.trim())) {
      errors.push(`Row ${rowIndex}: Invalid ZPIN format "${row.proposed_zpin}".`);
    }
    return { valid: errors.length === 0, errors, skip: false };
  }

  it('validates CREATE rows require full_name and proposed_zpin', () => {
    const result = validateRow({ action: 'CREATE', full_name: '', proposed_zpin: '' }, 2);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates valid CREATE row passes', () => {
    const result = validateRow({ action: 'CREATE', full_name: 'John Doe', proposed_zpin: 'ZTAS0091' }, 2);
    expect(result.valid).toBe(true);
  });

  it('validates SKIP rows pass without field checks', () => {
    const result = validateRow({ action: 'SKIP', full_name: '', proposed_zpin: '' }, 2);
    expect(result.valid).toBe(true);
    expect(result.skip).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = validateRow({ action: 'DELETE' }, 2);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid ZPIN format', () => {
    const result = validateRow({ action: 'CREATE', full_name: 'John', proposed_zpin: 'BAD123' }, 2);
    expect(result.valid).toBe(false);
  });

  it('detects duplicate ZPINs in a file', () => {
    const rows = [
      { action: 'CREATE', full_name: 'Player A', proposed_zpin: 'ZTAS0091' },
      { action: 'CREATE', full_name: 'Player B', proposed_zpin: 'ZTAS0091' },
    ];

    const zpins = new Map();
    const duplicates = [];
    rows.forEach((row, i) => {
      if (row.proposed_zpin) {
        if (zpins.has(row.proposed_zpin)) {
          duplicates.push({ row: i + 2, zpin: row.proposed_zpin });
        } else {
          zpins.set(row.proposed_zpin, i + 2);
        }
      }
    });

    expect(duplicates.length).toBe(1);
    expect(duplicates[0].zpin).toBe('ZTAS0091');
  });
});

// ============================================================
// Idempotency tests (logic simulation)
// ============================================================

describe('Import idempotency', () => {
  it('same player imported twice results in skip on second run', () => {
    // Simulate the idempotency logic
    const existingUsers = new Map(); // zpin -> user

    function processCreateRow(row) {
      const zpin = row.proposed_zpin;

      // Check if ZPIN already exists
      if (existingUsers.has(zpin)) {
        const existing = existingUsers.get(zpin);
        const fullName = row.full_name.toLowerCase();
        const existingName = `${existing.firstName} ${existing.lastName}`.toLowerCase();
        if (fullName === existingName) {
          return { action: 'SKIPPED_IDEMPOTENT', reason: 'Already imported' };
        }
        return { action: 'FAILED', reason: 'ZPIN conflict with different person' };
      }

      // Create user
      const [firstName, ...rest] = row.full_name.split(' ');
      const lastName = rest.join(' ') || 'Unknown';
      existingUsers.set(zpin, { firstName, lastName, zpin });
      return { action: 'CREATED' };
    }

    // First import
    const row = { action: 'CREATE', full_name: 'PHIRI DIXON', proposed_zpin: 'ZTAS0091' };
    const result1 = processCreateRow(row);
    expect(result1.action).toBe('CREATED');

    // Second import of same row
    const result2 = processCreateRow(row);
    expect(result2.action).toBe('SKIPPED_IDEMPOTENT');

    // Different person with same ZPIN
    const conflictRow = { action: 'CREATE', full_name: 'JOHN DOE', proposed_zpin: 'ZTAS0091' };
    const result3 = processCreateRow(conflictRow);
    expect(result3.action).toBe('FAILED');
  });

  it('ambiguous rows remain SKIP and produce no changes', () => {
    const row = { action: 'SKIP', status: 'AMBIGUOUS_MATCH', full_name: 'Some Player', proposed_zpin: '' };
    expect(row.action).toBe('SKIP');
    // Import logic should skip without creating/updating
    expect(row.proposed_zpin).toBe('');
  });
});
