/**
 * 1. UPDATE women_senior — replace totalPoints with latest sheet totals (re-ranks all records).
 * 2. SEED women_doubles — opening balance from Google Sheet.
 * 3. SEED men_doubles   — opening balance from Google Sheet.
 *
 * Idempotent: re-running updates women_senior totals and skips already-seeded doubles records.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Ranking from '../models/Ranking.js';
import User from '../models/User.js';

const PERIOD = '2026';
const YEAR   = 2026;

// ─── SHEET DATA ───────────────────────────────────────────────────────────────

const WOMEN_SENIOR = [
  { rank:  1, name: 'CHRISTABEL CHISONGO',   club: 'Kantanshi',        totalPoints: 684 },
  { rank:  2, name: 'ISABEL CHISONGO',        club: 'Kantanshi',        totalPoints: 544 },
  { rank:  3, name: 'SORAYA MUMENA',          club: 'Green Buffaloes',  totalPoints: 349 },
  { rank:  4, name: 'MARGARET CHEWE',         club: 'Green Buffaloes',  totalPoints: 322 },
  { rank:  5, name: 'MITRESS NALWIZYA',       club: 'Nkana',            totalPoints: 186 },
  { rank:  6, name: 'NALUNGWE NATASHA',       club: 'Green Buffaloes',  totalPoints: 177 },
  { rank:  7, name: 'MUKANGWA SIAME',         club: 'Nkana',            totalPoints: 167 },
  { rank:  8, name: 'BEATRICE PHIRI',         club: 'Red Arrows',       totalPoints: 162 },
  { rank:  9, name: 'MUTALE MAGGIE',          club: 'ZNS',              totalPoints: 140 },
  { rank: 10, name: 'ANGELA MWANSA',          club: 'Mufulira',         totalPoints:  99 },
  { rank: 11, name: 'VIOLET MULENGA',         club: 'Nkana',            totalPoints:  78 },
  { rank: 12, name: 'FEBBY CHILEMBO',         club: 'Kalulushi',        totalPoints:  73 },
  { rank: 13, name: 'MUKUKA MWENYA',          club: 'ZNS',              totalPoints:  65 },
  { rank: 14, name: 'BLESSINGS NGULUBE',      club: 'Kantanshi',        totalPoints:  60 },
  { rank: 15, name: 'JANET MWAPE',            club: 'Mufulira',         totalPoints:  59 },
  { rank: 16, name: 'ALICE MULENGA SOKO',     club: 'ZNS',              totalPoints:  54 },
  { rank: 17, name: 'DIANA KITAIN',           club: '',                 totalPoints:  53 },
  { rank: 18, name: 'KABANSHI MAGRET',        club: 'Kantanshi',        totalPoints:  41 },
  { rank: 19, name: 'KANYAMA HOPE',           club: 'Red Arrows',       totalPoints:  38 },
  { rank: 20, name: 'MWELWA FAITH',           club: 'ZNS',              totalPoints:  33 },
  { rank: 21, name: 'RUTH NYIRENDA',          club: '',                 totalPoints:  30 },
  { rank: 22, name: 'MWILA IREEN',            club: 'Green Buffaloes',  totalPoints:  29 },
  { rank: 23, name: 'SAZAMBILE PATRICIA',     club: 'ZNS',              totalPoints:  28 },
  { rank: 24, name: 'GONDWE DIANA',           club: 'Correctional',     totalPoints:  27 },
  { rank: 25, name: 'KAYLA MUIMO',            club: '',                 totalPoints:  26 },
  { rank: 26, name: 'WINFRIDAH LUBEMBA',      club: 'Green Buffaloes',  totalPoints:  22 },
  { rank: 27, name: 'JESSY MUSUNGA',          club: 'Mufulira',         totalPoints:  20 },
  { rank: 27, name: 'CHIPULU NATASHA',        club: '',                 totalPoints:  20 },
  { rank: 29, name: 'CHEWE EMMY',             club: 'Kamenza',          totalPoints:  19 },
  { rank: 30, name: 'BALAMURALI TEJESVI',     club: '',                 totalPoints:  18 },
  { rank: 30, name: 'LISA CHISONGO',          club: 'Kantanshi',        totalPoints:  18 },
  { rank: 30, name: 'MIRRIAM ZULU',           club: '',                 totalPoints:  18 },
  { rank: 33, name: 'DEBRA BANDA MATETA',     club: '',                 totalPoints:  15 },
  { rank: 34, name: 'MEDIA CHISWASWA',        club: '',                 totalPoints:  14 },
  { rank: 35, name: 'MPHANDE PURITY',         club: '',                 totalPoints:  10 },
  { rank: 36, name: 'LETISHA CHIKWA',         club: '',                 totalPoints:   9 },
  { rank: 36, name: 'MWANSA MAMBWE',          club: '',                 totalPoints:   9 },
  { rank: 36, name: 'NALWIZYA JOYCE',         club: '',                 totalPoints:   9 },
  { rank: 36, name: 'EUNICE CHISAMU',         club: '',                 totalPoints:   9 },
  { rank: 40, name: 'PATRICIA CHIBESA',       club: '',                 totalPoints:   8 },
  { rank: 40, name: 'NAOMI CHILESHE',         club: '',                 totalPoints:   8 },
  { rank: 40, name: 'MULIMA PENELOPE',        club: 'Lusaka Club',      totalPoints:   8 },
  { rank: 40, name: 'NKOLE FELISTUS',         club: '',                 totalPoints:   8 },
  { rank: 40, name: 'MUSONDA CHANDA',         club: 'Green Buffaloes',  totalPoints:   8 },
  { rank: 45, name: 'FAITH KAMWANGA',         club: '',                 totalPoints:   5 },
  { rank: 45, name: 'ISABLE KAPOSA',          club: '',                 totalPoints:   5 },
  { rank: 45, name: 'ROYDAH MWASA',           club: '',                 totalPoints:   5 },
  { rank: 45, name: 'TIYAMIKE NAMONJE',       club: 'Ndola',            totalPoints:   5 },
  { rank: 45, name: 'FAITH NAMBAYA',          club: 'Mufulira',         totalPoints:   5 },
  { rank: 45, name: 'KONDWANI NAMBU',         club: 'Ndola',            totalPoints:   5 },
  { rank: 45, name: 'ZYNAB MUSOMA',           club: '',                 totalPoints:   5 },
  { rank: 45, name: 'BUTEMWA SHAMANO',        club: 'Ndola',            totalPoints:   5 },
  { rank: 45, name: 'YOLANDA PANTOJA',        club: 'Nkana',            totalPoints:   5 },
  { rank: 45, name: 'MUNDIA IMBOELA',         club: 'Nkana',            totalPoints:   5 },
  { rank: 45, name: 'CHIBESA LUBEMBA',        club: '',                 totalPoints:   5 },
  { rank: 45, name: 'DENISE MBAZIMA',         club: '',                 totalPoints:   5 },
  { rank: 45, name: 'KOMBE NYENDWA GORRET',   club: '',                 totalPoints:   5 },
  { rank: 45, name: 'MWALE ESNART',           club: '',                 totalPoints:   5 },
  { rank: 45, name: 'BERTHA MWANDWE',         club: '',                 totalPoints:   5 },
  { rank: 45, name: 'LOVENESS MAMBWE',        club: '',                 totalPoints:   5 },
  { rank: 45, name: 'NTIBA LUNGU',            club: '',                 totalPoints:   5 },
  { rank: 45, name: 'ESTHER SAKALA',          club: '',                 totalPoints:   5 },
  { rank: 45, name: 'MPEZA SAKALA',           club: '',                 totalPoints:   5 },
  { rank: 45, name: 'MONICA MWEENE',          club: '',                 totalPoints:   5 },
  { rank: 64, name: 'KUDZAI MEDA',            club: '',                 totalPoints:   3 },
  { rank: 64, name: 'MERCY MUSONDA',          club: '',                 totalPoints:   3 },
  { rank: 64, name: 'LOVENESS M KAWIMBE',     club: '',                 totalPoints:   3 },
];

const WOMEN_DOUBLES = [
  { rank:  1, name: 'CHRISTABEL CHISONGO',   club: 'Kantanshi',        totalPoints: 641 },
  { rank:  2, name: 'ISABEL CHISONGO',        club: 'Kantanshi',        totalPoints: 636 },
  { rank:  3, name: 'MARGARET CHEWE',         club: 'Green Buffaloes',  totalPoints: 352 },
  { rank:  4, name: 'SORAYA MUMENA',          club: 'Green Buffaloes',  totalPoints: 313 },
  { rank:  5, name: 'MUKANGWA SIAME',         club: 'Nkana',            totalPoints: 237 },
  { rank:  6, name: 'MITRESS NALWIZYA',       club: 'Nkana',            totalPoints: 228 },
  { rank:  7, name: 'BEATRICE PHIRI',         club: 'Red Arrows',       totalPoints: 225 },
  { rank:  7, name: 'MUTALE MAGGIE',          club: 'ZNS',              totalPoints: 225 },
  { rank:  9, name: 'NALUNGWE NATASHA',       club: 'Green Buffaloes',  totalPoints: 188 },
  { rank: 10, name: 'ANGELA MWANSA',          club: 'Mufulira',         totalPoints: 156 },
  { rank: 11, name: 'KANYAMA HOPE',           club: 'Red Arrows',       totalPoints:  90 },
  { rank: 12, name: 'ALICE MULENGA SOKO',     club: 'ZNS',              totalPoints:  72 },
  { rank: 13, name: 'BLESSINGS NGULUBE',      club: 'Kantanshi',        totalPoints:  63 },
  { rank: 13, name: 'MWILA IREEN',            club: 'Green Buffaloes',  totalPoints:  63 },
  { rank: 15, name: 'FEBBY CHILEMBO',         club: 'Kalulushi',        totalPoints:  54 },
  { rank: 16, name: 'KABANSHI MAGRET',        club: 'Kantanshi',        totalPoints:  45 },
  { rank: 16, name: 'DIANA KITAIN',           club: 'Red Arrows',       totalPoints:  45 },
  { rank: 16, name: 'VIOLET MULENGA',         club: 'Nkana',            totalPoints:  45 },
  { rank: 19, name: 'CHEWE EMMY',             club: 'Kamenza',          totalPoints:  36 },
  { rank: 19, name: 'BALAMURALI TEJESVI',     club: '',                 totalPoints:  36 },
  { rank: 19, name: 'MWANSA MAMBWE',          club: '',                 totalPoints:  36 },
  { rank: 19, name: 'MUKUKA MWENYA',          club: 'ZNS',              totalPoints:  36 },
  { rank: 19, name: 'JANET MWAPE',            club: 'Mufulira',         totalPoints:  36 },
  { rank: 24, name: 'RUTH NYIRENDA',          club: '',                 totalPoints:  29 },
  { rank: 25, name: 'SAZAMBILE PATRICIA',     club: 'ZNS',              totalPoints:  27 },
  { rank: 26, name: 'MWELWA FAITH',           club: 'ZNS',              totalPoints:  18 },
  { rank: 26, name: 'CHOONGO LUKUNDO',        club: '',                 totalPoints:  18 },
  { rank: 26, name: 'LISA CHISONGO',          club: 'Kantanshi',        totalPoints:  18 },
  { rank: 26, name: 'JESSY MUSUNGA',          club: 'Mufulira',         totalPoints:  18 },
  { rank: 26, name: 'PRISCILA KAPUNGWE',      club: 'Ndola',            totalPoints:  18 },
  { rank: 26, name: 'MEDIA CHISWASWA',        club: 'Mufulira',         totalPoints:  18 },
  { rank: 26, name: 'JOYCE NALWIZYA',         club: 'Nkana',            totalPoints:  18 },
  { rank: 26, name: 'GONDWE DIANA',           club: 'Correctional',     totalPoints:  18 },
  { rank: 34, name: 'PATRICIA CHIBESA',       club: '',                 totalPoints:   9 },
  { rank: 34, name: 'MULIMA PENELOPE',        club: 'Lusaka Club',      totalPoints:   9 },
  { rank: 34, name: 'YOLANDA PANTOJA',        club: 'Nkana',            totalPoints:   9 },
  { rank: 34, name: 'KAYLA MUIMO',            club: '',                 totalPoints:   9 },
];

const MEN_DOUBLES = [
  { rank:  1, name: 'KAZEMBE EDGAR',          club: 'Correctional',     totalPoints: 579 },
  { rank:  2, name: 'CHILESHE ROBERT',        club: 'Green Buffaloes',  totalPoints: 454 },
  { rank:  3, name: 'PHIRI DIXON',            club: 'Correctional',     totalPoints: 297 },
  { rank:  4, name: 'MWALE JORDAN',           club: 'ZNS',              totalPoints: 276 },
  { rank:  5, name: 'SIMBEYE PETER',          club: 'ZNS',              totalPoints: 246 },
  { rank:  6, name: 'HAMAYANGWE NAKALANGA',   club: 'Green Buffaloes',  totalPoints: 198 },
  { rank:  7, name: 'CHANSA CHILESHE',        club: 'Mufulira',         totalPoints: 164 },
  { rank:  8, name: 'SOKO SYDNEY',            club: 'Red Arrows',       totalPoints: 126 },
  { rank:  9, name: 'NKHATA MAXWELL',         club: 'Green Buffaloes',  totalPoints: 117 },
  { rank: 10, name: 'MABO KOMBE SNR',         club: 'Red Arrows',       totalPoints: 113 },
  { rank: 11, name: 'MWALE OWEN',             club: 'ZNS',              totalPoints: 108 },
  { rank: 12, name: "N'GANDU MOSES",          club: 'Mufulira',         totalPoints:  99 },
  { rank: 13, name: 'MALUNGA MWAMBA',         club: 'Green Buffaloes',  totalPoints:  95 },
  { rank: 13, name: 'KUNDA ABEDNEGO',         club: 'Correctional',     totalPoints:  95 },
  { rank: 15, name: 'SIMBAYA EDWIN',          club: 'Mufulira',         totalPoints:  72 },
  { rank: 16, name: 'HANGWEWE GIFT',          club: 'Red Arrows',       totalPoints:  63 },
  { rank: 17, name: 'NDEFWAI LYTON',          club: 'Mufulira',         totalPoints:  60 },
  { rank: 18, name: 'MABO KOMBE JNR',         club: 'Green Buffaloes',  totalPoints:  55 },
  { rank: 18, name: 'MWALE BLESSING',         club: 'ZNS',              totalPoints:  55 },
  { rank: 20, name: 'SIMBAYA RICHARD',        club: 'ZNS',              totalPoints:  46 },
  { rank: 20, name: 'BANDA GRANT',            club: 'Nkana',            totalPoints:  46 },
  { rank: 22, name: 'MUMBI JUSTINE',          club: 'Nkana',            totalPoints:  41 },
  { rank: 22, name: 'NTUMBA SYLVESTER',       club: 'Lusaka Club',      totalPoints:  41 },
  { rank: 22, name: 'BANDA MUMANGO',          club: 'Lusaka Club',      totalPoints:  41 },
  { rank: 22, name: 'BANDA KONDWANI',         club: 'Nkana',            totalPoints:  41 },
  { rank: 26, name: 'LUWIKA NATHAN',          club: 'Chibuluma',        totalPoints:  37 },
  { rank: 26, name: 'CHISHALA MACMILLAN',     club: 'Nkana',            totalPoints:  37 },
  { rank: 28, name: 'SIMUKONDA JONATHAN',     club: 'Green Buffaloes',  totalPoints:  36 },
  { rank: 28, name: 'MWALE BENJAMIN',         club: 'Green Buffaloes',  totalPoints:  36 },
  { rank: 30, name: 'MUTAYACHALO KANJA',      club: 'Ndola',            totalPoints:  32 },
  { rank: 30, name: 'MUKUPA ANDREW',          club: '',                 totalPoints:  32 },
  { rank: 32, name: 'MWANZA FRED',            club: 'Nkana',            totalPoints:  28 },
  { rank: 33, name: 'MANSOUR HITHAN',         club: '',                 totalPoints:  24 },
  { rank: 33, name: 'MAMFUNDA CHARLES',       club: 'Nkana',            totalPoints:  24 },
  { rank: 35, name: 'ZULU CHILITO',           club: 'Lusaka Club',      totalPoints:  23 },
  { rank: 35, name: 'MULENGA REUBEN',         club: 'Nkana',            totalPoints:  23 },
  { rank: 35, name: 'MVULA ALEX',             club: 'Red Arrows',       totalPoints:  23 },
  { rank: 35, name: 'NKHOMA VICTOR',          club: 'Ndola',            totalPoints:  23 },
  { rank: 35, name: 'HANKINS JERMAINE',       club: 'Ndola',            totalPoints:  23 },
  { rank: 40, name: 'MWEENE KALEBI',          club: 'Lusaka Club',      totalPoints:  22 },
  { rank: 41, name: 'CHIWENA MUWELE',         club: '',                 totalPoints:  19 },
  { rank: 41, name: 'EZRA MULENGA',           club: 'Ndola',            totalPoints:  19 },
  { rank: 41, name: 'CHIMFWEMBE LESA',        club: 'Chibuluma',        totalPoints:  19 },
  { rank: 44, name: 'SAMPA REMMY',            club: '',                 totalPoints:  18 },
  { rank: 44, name: 'CHICHIMA ISAAC',         club: 'Nkana',            totalPoints:  18 },
  { rank: 44, name: 'NSAKANYA JOSEPHAT',      club: 'Ndola',            totalPoints:  18 },
  { rank: 44, name: 'MWANZA CHANDA',          club: 'Nchanga',          totalPoints:  18 },
  { rank: 44, name: 'MATETA SYDNEY',          club: '',                 totalPoints:  18 },
  { rank: 49, name: 'TEMBO CHAZANGA',         club: 'ZNS',              totalPoints:  14 },
  { rank: 49, name: 'GONDWE UNGWELU',         club: '',                 totalPoints:  14 },
  { rank: 49, name: 'HAMAYANGWE NABUSANGA',   club: '',                 totalPoints:  14 },
  { rank: 49, name: 'BWALE JOSHUA',           club: 'Nchanga',          totalPoints:  14 },
  { rank: 49, name: 'GUPTA OM',               club: '',                 totalPoints:  14 },
  { rank: 54, name: 'MANSOUR AHMED',          club: '',                 totalPoints:  13 },
  { rank: 55, name: 'KAONGA KENAN',           club: 'Correctional',     totalPoints:  10 },
  { rank: 55, name: 'SANDO HECTOR',           club: 'ZNS',              totalPoints:  10 },
  { rank: 55, name: 'NAWA ALBERT',            club: 'Kantanshi',        totalPoints:  10 },
  { rank: 55, name: 'SAILI GREG',             club: 'Lusaka Club',      totalPoints:  10 },
  { rank: 55, name: 'PHIRI CHIMBA',           club: 'Nchanga',          totalPoints:  10 },
  { rank: 55, name: 'KALEBI LUYANDO',         club: '',                 totalPoints:  10 },
  { rank: 55, name: 'ENERST SHAMANO',         club: 'Ndola',            totalPoints:  10 },
  { rank: 62, name: 'MAVUKA JONATHAN',        club: 'Nkana',            totalPoints:   9 },
  { rank: 62, name: 'MUTALE MULENGA',         club: 'Chibuluma',        totalPoints:   9 },
  { rank: 62, name: 'NGALASA ANDREW',         club: '',                 totalPoints:   9 },
  { rank: 62, name: 'NSAMA CHILESHE',         club: '',                 totalPoints:   9 },
  { rank: 62, name: 'PHIRI CHOYESO',          club: '',                 totalPoints:   9 },
  { rank: 62, name: 'MONTA MOSES',            club: '',                 totalPoints:   9 },
  { rank: 62, name: 'CHIRWA MARK',            club: 'Nkana',            totalPoints:   9 },
  { rank: 62, name: 'HAAMIYANDA EUGINE',      club: 'Nkana',            totalPoints:   9 },
  { rank: 62, name: 'ZULU TOLANI',            club: 'Lusaka Club',      totalPoints:   9 },
  { rank: 62, name: 'MPEMPULWA SAMUEL',       club: 'Nchanga',          totalPoints:   9 },
  { rank: 62, name: 'MBAZIMA JOEL',           club: 'Nchanga',          totalPoints:   9 },
  { rank: 73, name: 'CHILUBA CHANDA',         club: 'Ndola',            totalPoints:   5 },
  { rank: 73, name: 'MUSONDA MAPALO',         club: '',                 totalPoints:   5 },
  { rank: 73, name: 'PHAKATI REVAI',          club: 'Red Arrows',       totalPoints:   5 },
  { rank: 73, name: 'BURROWS JACK',           club: '',                 totalPoints:   5 },
  { rank: 73, name: 'SEBASTIAN MORONELL',     club: '',                 totalPoints:   5 },
  { rank: 73, name: 'CUMMINGS SCOT',          club: '',                 totalPoints:   5 },
  { rank: 73, name: 'KAMANGA POINT',          club: 'Green Buffaloes',  totalPoints:   5 },
  { rank: 73, name: 'SEAMAN MATTHEW',         club: '',                 totalPoints:   5 },
  { rank: 73, name: 'ZULU OSWARD',            club: '',                 totalPoints:   5 },
  { rank: 73, name: 'MILETIC PAVLE',          club: '',                 totalPoints:   5 },
  { rank: 73, name: 'NGWIRA CHRISTOPHER',     club: '',                 totalPoints:   5 },
  { rank: 73, name: 'KANGAZA GIFT',           club: 'Lusaka Club',      totalPoints:   5 },
  { rank: 73, name: 'MUSANA FUNGAI',          club: '',                 totalPoints:   5 },
  { rank: 73, name: 'MUSONDA AQA',            club: '',                 totalPoints:   5 },
  { rank: 73, name: 'MUTALE JUSTINE',         club: '',                 totalPoints:   5 },
  { rank: 73, name: 'PHIRI BERNARD',          club: 'Lusaka Club',      totalPoints:   5 },
  { rank: 73, name: 'CHANDA JUSTINE',         club: 'Mufulira',         totalPoints:   5 },
  { rank: 73, name: 'CHIRWA KONDWA GONDWE',   club: '',                 totalPoints:   5 },
  { rank: 73, name: 'SIAME ZANGA',            club: '',                 totalPoints:   5 },
  { rank: 73, name: 'MULENGA MALAMBO',        club: 'Nkana',            totalPoints:   5 },
  { rank: 73, name: 'MUMA ERIC',              club: 'Nchanga',          totalPoints:   5 },
  { rank: 73, name: 'JERE PATULANI',          club: '',                 totalPoints:   5 },
];

// ─── ZPIN OVERRIDES ───────────────────────────────────────────────────────────
// For players whose display names don't match their registered account names.
const ZPIN_OVERRIDES = {
  'ABEDNIGO KUNDA':      'ZTAS0021',
  'KUNDA ABEDNEGO':      'ZTAS0021',
  'MABO KOMBE JNR':      'ZTAJ0084',
  'PHIRI DIXON':         'ZTAS0064',
  'CHISHALA MACMILLAN':  'ZTAJ0203',
  'MUMBI JUSTINE':       'ZTAS0036',
  "N'GANDU MOSES":       'ZTAS0067',
  'ALICE MULENGA SOKO':  'ZTAS0113',
  'ALICE MULENGA':       'ZTAS0113',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const findUser = async (fullName) => {
  const override = ZPIN_OVERRIDES[fullName.trim().toUpperCase()];
  if (override) {
    const u = await User.findOne({ zpin: override });
    if (u) return u;
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;

  // Try LASTNAME FIRSTNAME
  let user = await User.findOne({
    lastName:  { $regex: new RegExp(`^${parts[0]}$`, 'i') },
    firstName: { $regex: new RegExp(`^${parts.slice(1).join(' ')}$`, 'i') }
  });
  if (user) return user;

  // Try FIRSTNAME LASTNAME
  user = await User.findOne({
    firstName: { $regex: new RegExp(`^${parts[0]}$`, 'i') },
    lastName:  { $regex: new RegExp(`^${parts.slice(1).join(' ')}$`, 'i') }
  });
  return user || null;
};

// ─── UPDATE women_senior ──────────────────────────────────────────────────────
// Updates existing records' opening-balance entry (and totalPoints) to match
// the latest sheet totals. Creates new records for players not yet in the DB.

const updateWomenSenior = async (players) => {
  let updated = 0, created = 0, unmatched = 0;

  for (const p of players) {
    const user = await findUser(p.name);
    if (!user) unmatched++;

    // Find existing record
    const query = user?.zpin
      ? { playerZpin: user.zpin, category: 'women_senior', rankingPeriod: PERIOD }
      : { playerName: { $regex: new RegExp(`^${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, category: 'women_senior', rankingPeriod: PERIOD };

    let ranking = await Ranking.findOne(query);

    const obEntry = {
      tournamentName: 'Opening Balance 2026',
      tournamentDate: new Date('2026-01-01'),
      points: p.totalPoints,
      position: '–',
      year: YEAR
    };

    if (ranking) {
      // Update (or insert) the Opening Balance entry
      const obIdx = ranking.tournamentResults.findIndex(r => r.tournamentName === 'Opening Balance 2026');
      if (obIdx >= 0) {
        ranking.tournamentResults[obIdx] = obEntry;
      } else {
        ranking.tournamentResults.unshift(obEntry);
      }
      // totalPoints = opening balance + any real tournament results beyond opening
      ranking.totalPoints = ranking.tournamentResults.reduce((s, r) => s + (r.points || 0), 0);
      ranking.rank = p.rank;
      if (user?.zpin && !ranking.playerZpin) ranking.playerZpin = user.zpin;
      if (user?._id && !ranking.playerId)   ranking.playerId   = user._id;
      await ranking.save();
      updated++;
    } else {
      // Create new record
      const doc = new Ranking({
        playerName:    p.name,
        playerZpin:    user?.zpin || null,
        playerId:      user?._id  || null,
        club:          p.club || '',
        category:      'women_senior',
        rank:          p.rank,
        previousRank:  p.rank,
        totalPoints:   p.totalPoints,
        rankingPeriod: PERIOD,
        isActive:      true,
        tournamentResults: [obEntry]
      });
      await doc.save();
      created++;
    }
  }

  return { updated, created, unmatched };
};

// ─── SEED new doubles category ────────────────────────────────────────────────
// Skips players whose record already exists (idempotent).

const seedCategory = async (players, rankingCategory) => {
  let created = 0, skipped = 0, unmatched = 0;

  for (const p of players) {
    const user = await findUser(p.name);
    if (!user) unmatched++;

    // Idempotency check — match by ZPIN if available, else name
    const exists = user?.zpin
      ? await Ranking.findOne({ playerZpin: user.zpin, category: rankingCategory, rankingPeriod: PERIOD })
      : await Ranking.findOne({ playerName: { $regex: new RegExp(`^${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, category: rankingCategory, rankingPeriod: PERIOD });

    if (exists) { skipped++; continue; }

    const doc = new Ranking({
      playerName:    p.name,
      playerZpin:    user?.zpin || null,
      playerId:      user?._id  || null,
      club:          p.club || '',
      category:      rankingCategory,
      rank:          p.rank,
      previousRank:  p.rank,
      totalPoints:   p.totalPoints,
      rankingPeriod: PERIOD,
      isActive:      true,
      tournamentResults: [{
        tournamentName: 'Opening Balance 2026',
        tournamentDate: new Date('2026-01-01'),
        points:         p.totalPoints,
        position:       '–',
        year:           YEAR
      }]
    });
    await doc.save();
    created++;
  }

  return { created, skipped, unmatched };
};

// ─── RE-RANK ──────────────────────────────────────────────────────────────────
const rerank = async (category) => {
  const all = await Ranking.find({ category, rankingPeriod: PERIOD, isActive: true })
    .sort({ totalPoints: -1 });
  for (let i = 0; i < all.length; i++) {
    all[i].previousRank = all[i].rank;
    all[i].rank = i + 1;
    await all[i].save();
  }
  console.log(`  Re-ranked ${all.length} records for ${category}`);
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const run = async () => {
  await connectDatabase();

  console.log('\nUpdating women_senior...');
  const ws = await updateWomenSenior(WOMEN_SENIOR);
  console.log(`  updated: ${ws.updated}, created: ${ws.created}, no ZPIN match: ${ws.unmatched}`);
  await rerank('women_senior');

  console.log('\nSeeding women_doubles...');
  const wd = await seedCategory(WOMEN_DOUBLES, 'women_doubles');
  console.log(`  created: ${wd.created}, skipped: ${wd.skipped}, no ZPIN match: ${wd.unmatched}`);
  await rerank('women_doubles');

  console.log('\nSeeding men_doubles...');
  const md = await seedCategory(MEN_DOUBLES, 'men_doubles');
  console.log(`  created: ${md.created}, skipped: ${md.skipped}, no ZPIN match: ${md.unmatched}`);
  await rerank('men_doubles');

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => { console.error(err); process.exit(1); });
