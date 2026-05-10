/**
 * One-time seed: imports men_senior and women_senior static rankings into the
 * live Ranking collection as "Opening Balance 2026" records.
 *
 * Safe to run multiple times — skips any player that already has a ranking
 * record for that category + period (idempotent).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Ranking from '../models/Ranking.js';
import User from '../models/User.js';

const PERIOD = '2026';
const YEAR   = 2026;

// Static data (copied from src/data/rankingsData.ts)
// Name format: "LASTNAME FIRSTNAME" or "FIRSTNAME LASTNAME" — we try both.
const MEN_SENIOR = [
  { rank: 1,  name: "KAZEMBE EDGAR",             club: "Correctional",       totalPoints: 478 },
  { rank: 2,  name: "CHANSA CHILESHE",            club: "Mufulira",           totalPoints: 313 },
  { rank: 3,  name: "PHIRI DIXON",                club: "Correctional",       totalPoints: 275 },
  { rank: 4,  name: "MWALE OWEN",                 club: "ZNS",                totalPoints: 230 },
  { rank: 5,  name: "CHILESHE ROBERT",            club: "Green Buffaloes",    totalPoints: 135 },
  { rank: 6,  name: "SOKO SYDNEY",                club: "Red Arrows",         totalPoints: 99  },
  { rank: 7,  name: "MWALE JORDAN",               club: "ZNS",                totalPoints: 84  },
  { rank: 8,  name: "SIMBEYE PETER",              club: "ZNS",                totalPoints: 81  },
  { rank: 9,  name: "HAMAYANGWE NAKALANGA",       club: "Green Buffaloes",    totalPoints: 78  },
  { rank: 10, name: "ABEDNIGO KUNDA",             club: "Correctional",       totalPoints: 77  },
  { rank: 11, name: "MABO KOMBE SNR",             club: "Red Arrows",         totalPoints: 71  },
  { rank: 12, name: "MWALE BLESSING",             club: "ZNS",                totalPoints: 61  },
  { rank: 13, name: "SIMBAYA RICHARD",            club: "ZNS",                totalPoints: 59  },
  { rank: 14, name: "SIMUKONDA JONATHAN",         club: "Green Buffaloes",    totalPoints: 57  },
  { rank: 15, name: "MALUNGA MWAMBA",             club: "Green Buffaloes",    totalPoints: 55  },
  { rank: 16, name: "BANDA KONDWANI",             club: "Nkana",              totalPoints: 54  },
  { rank: 17, name: "MWALE BENJAMIN",             club: "Green Buffaloes",    totalPoints: 51  },
  { rank: 18, name: "NKHATA MAXWELL",             club: "Green Buffaloes",    totalPoints: 50  },
  { rank: 19, name: "MABO KOMBE JNR",             club: "Green Buffaloes",    totalPoints: 45  },
  { rank: 20, name: "N'GANDU MOSES",              club: "Mufulira",           totalPoints: 43  },
  { rank: 21, name: "JERMAINE HANKINS",           club: "Ndola",              totalPoints: 34  },
  { rank: 22, name: "NKHOMA VICTOR",              club: "Ndola",              totalPoints: 32  },
  { rank: 23, name: "MUTAYACHALO KANJA",          club: "Ndola",              totalPoints: 31  },
  { rank: 24, name: "CHABU JUSTINE",              club: "",                   totalPoints: 28  },
  { rank: 25, name: "MUMBI JUSTINE",              club: "Nkana",              totalPoints: 27  },
  { rank: 25, name: "MVULA ALEX",                 club: "Red Arrows",         totalPoints: 27  },
  { rank: 25, name: "BANDA GRANT",                club: "Nkana",              totalPoints: 27  },
  { rank: 28, name: "CHISHALA MACMILLAN",         club: "Nkana",              totalPoints: 26  },
  { rank: 29, name: "BANDA MUMANGO",              club: "Lusaka Club",        totalPoints: 25  },
  { rank: 29, name: "MWEENE KALEBI",              club: "Lusaka Club",        totalPoints: 25  },
  { rank: 31, name: "MBULO RONALD",               club: "Correctional",       totalPoints: 23  },
  { rank: 31, name: "MULENGA MALAMBO",            club: "Nkana",              totalPoints: 23  },
  { rank: 31, name: "NTUMBA SYLVESTER",           club: "Lusaka Club",        totalPoints: 23  },
  { rank: 34, name: "SIMBAYA EDWIN",              club: "Mufulira",           totalPoints: 22  },
  { rank: 34, name: "MUKUPA ANDREW",              club: "",                   totalPoints: 22  },
  { rank: 36, name: "LUWIKA NATHAN",              club: "Chibuluma",          totalPoints: 21  },
  { rank: 37, name: "CHICHIMA ISAAC",             club: "Nkana",              totalPoints: 20  },
  { rank: 37, name: "MANSOUR HITHAM",             club: "",                   totalPoints: 20  },
  { rank: 37, name: "SANDO HECTOR",               club: "ZNS",                totalPoints: 20  },
  { rank: 40, name: "BANDA SYLVESTER",            club: "Green Buffaloes",    totalPoints: 19  },
  { rank: 41, name: "HANGWEWE GIFT",              club: "Red Arrows",         totalPoints: 18  },
  { rank: 41, name: "JONATHAN MAVUKA",            club: "",                   totalPoints: 18  },
  { rank: 43, name: "MULENGA REUBEN",             club: "Nkana",              totalPoints: 16  },
  { rank: 43, name: "HAMAYANGWE NABUSANGA",       club: "",                   totalPoints: 16  },
  { rank: 45, name: "MWANZA FRED",                club: "Nkana",              totalPoints: 14  },
  { rank: 46, name: "PHIRI BERNARD",              club: "Lusaka Club",        totalPoints: 13  },
  { rank: 46, name: "JOSEPHAT NSAKANYA",          club: "",                   totalPoints: 13  },
  { rank: 48, name: "NDEFWAI LYTON",              club: "Mufulira",           totalPoints: 12  },
  { rank: 49, name: "GONDWE UNGWELU",             club: "",                   totalPoints: 11  },
  { rank: 49, name: "NAWA ALBERT",                club: "Kantanshi",          totalPoints: 11  },
  { rank: 49, name: "SYDNEY MATETA",              club: "",                   totalPoints: 11  },
  { rank: 52, name: "MUTALE MULENGA",             club: "Chibuluma",          totalPoints: 10  },
  { rank: 53, name: "CHIBOLELA BENNY",            club: "Correctional",       totalPoints: 9   },
  { rank: 53, name: "KAONGA KENAN",               club: "",                   totalPoints: 9   },
  { rank: 53, name: "SILOMBA IVWANANJI",          club: "Green Buffaloes",    totalPoints: 9   },
  { rank: 53, name: "MUSONDA MAPALO",             club: "",                   totalPoints: 9   },
  { rank: 53, name: "JERE PATULANI",              club: "",                   totalPoints: 9   },
  { rank: 53, name: "MILETIC PAVLE",              club: "",                   totalPoints: 9   },
  { rank: 59, name: "NGALASA ANDREW",             club: "",                   totalPoints: 8   },
  { rank: 59, name: "CHIMFWEMBE LESA",            club: "Chibuluma",          totalPoints: 8   },
  { rank: 59, name: "JUSTIN MUTALE",              club: "",                   totalPoints: 8   },
  { rank: 59, name: "KONDWANI GONDWE CHIRWA",     club: "",                   totalPoints: 8   },
  { rank: 59, name: "KENAN CHIBALE",              club: "",                   totalPoints: 8   },
  { rank: 59, name: "DAKA MELVIN",                club: "",                   totalPoints: 8   },
  { rank: 59, name: "MULENGA MUONGA EZRA",        club: "",                   totalPoints: 8   },
  { rank: 66, name: "TEMBO CHAZANGA",             club: "ZNS",                totalPoints: 6   },
  { rank: 66, name: "ZULU CHILITO",               club: "Lusaka Club",        totalPoints: 6   },
  { rank: 66, name: "CHILUBA CHANDA",             club: "Ndola",              totalPoints: 6   },
  { rank: 66, name: "KAPINI ELIJAH",              club: "ZNS",                totalPoints: 6   },
  { rank: 66, name: "CHANDA JUSTINE",             club: "Mufulira",           totalPoints: 6   },
  { rank: 66, name: "MAMFUNDA CHARLES",           club: "Nkana",              totalPoints: 6   },
  { rank: 66, name: "CHRISTOPHER MWANSA",         club: "",                   totalPoints: 6   },
  { rank: 66, name: "AHMED MANSOUR",              club: "",                   totalPoints: 6   },
  { rank: 66, name: "OM GUPTA",                   club: "",                   totalPoints: 6   },
  { rank: 66, name: "NSAMA CHILESHE",             club: "",                   totalPoints: 6   },
  { rank: 76, name: "EMMANUEL NSOFWA",            club: "Correctional",       totalPoints: 5   },
  { rank: 76, name: "COSTA DAVID",                club: "Ndola",              totalPoints: 5   },
  { rank: 76, name: "FRANCIS SIMFUKWE",           club: "Correctional",       totalPoints: 5   },
  { rank: 76, name: "JOEL MBAZIMA",               club: "Nchanga",            totalPoints: 5   },
  { rank: 76, name: "ELISHA SILUNBWE",            club: "ZNS",                totalPoints: 5   },
  { rank: 76, name: "ROSSIGNOL THOMAS",           club: "",                   totalPoints: 5   },
  { rank: 76, name: "KANGAZA GIFT",               club: "",                   totalPoints: 5   },
  { rank: 83, name: "PHAKATI REVAI",              club: "Red Arrows",         totalPoints: 4   },
  { rank: 83, name: "BOWA DANIEL",                club: "",                   totalPoints: 4   },
  { rank: 83, name: "KAMANGA POINT",              club: "Green Buffaloes",    totalPoints: 4   },
  { rank: 86, name: "LUYANDO KALEBI",             club: "",                   totalPoints: 3   },
  { rank: 86, name: "BURROWS JACK",               club: "",                   totalPoints: 3   },
  { rank: 86, name: "KABANDA MUSONDA",            club: "",                   totalPoints: 3   },
  { rank: 86, name: "MULENGA MAYBIN",             club: "Mufulira",           totalPoints: 3   },
  { rank: 86, name: "KANYANTA GERALD",            club: "Kamenza Tennis Club", totalPoints: 3  },
  { rank: 86, name: "MWANZA JOE",                 club: "",                   totalPoints: 3   },
  { rank: 86, name: "SAMPA REMMY",                club: "",                   totalPoints: 3   },
  { rank: 86, name: "CHOLA JOSEPH",               club: "Chibuluma",          totalPoints: 3   },
  { rank: 86, name: "KALUNGA EDGAR",              club: "Nkana",              totalPoints: 3   },
  { rank: 86, name: "CHILESHE MISHECK",           club: "Nkana",              totalPoints: 3   },
  { rank: 86, name: "KAI MULENGA",                club: "Nkana",              totalPoints: 3   },
  { rank: 86, name: "EUGINE HAMIYANDA",           club: "Nkana",              totalPoints: 3   },
  { rank: 86, name: "MOSES MONTA",                club: "Chibuluma",          totalPoints: 3   },
  { rank: 86, name: "CHIMBA PHIRI",               club: "Nchanga",            totalPoints: 3   },
  { rank: 86, name: "JOSHUA BWALE",               club: "Nchanga",            totalPoints: 3   },
  { rank: 86, name: "GWIRA THEMBIKILE",           club: "",                   totalPoints: 3   },
  { rank: 86, name: "SAILI GREG",                 club: "",                   totalPoints: 3   },
  { rank: 86, name: "PHIRI NELSON",               club: "",                   totalPoints: 3   },
  { rank: 86, name: "MUSANA FUNGAI",              club: "",                   totalPoints: 3   },
  { rank: 86, name: "MUSONDA MWAMBA",             club: "",                   totalPoints: 3   },
  { rank: 86, name: "SARAN SHIVAN",               club: "",                   totalPoints: 3   },
  { rank: 86, name: "ZULU ZAIN",                  club: "",                   totalPoints: 3   },
  { rank: 86, name: "ACTON MATHEW",               club: "",                   totalPoints: 3   },
  { rank: 86, name: "VALAND ADARSH",              club: "",                   totalPoints: 3   },
  { rank: 86, name: "PHIRI CHIYESO",              club: "Chibuluma",          totalPoints: 3   },
  { rank: 86, name: "CHANDA MWANZA",              club: "Nchanga",            totalPoints: 3   },
  { rank: 112, name: "MULENGA FIDELITY",          club: "",                   totalPoints: 2   },
  { rank: 113, name: "SEBASTIAN MORONELL",        club: "",                   totalPoints: 1   },
  { rank: 113, name: "CHONYA DERRICK",            club: "",                   totalPoints: 1   },
  { rank: 113, name: "CUMMINGS SCOT",             club: "",                   totalPoints: 1   },
  { rank: 113, name: "CHITANDA IAN",              club: "",                   totalPoints: 1   },
  { rank: 113, name: "MWENYA MUBANGA",            club: "Nkana",              totalPoints: 1   },
  { rank: 113, name: "MWANGELWA EMMANUEL",        club: "",                   totalPoints: 1   },
  { rank: 113, name: "SEAMAN MATTHEW",            club: "",                   totalPoints: 1   },
  { rank: 113, name: "KAN'GOMBE GEUTHAN",         club: "",                   totalPoints: 1   },
];

const WOMEN_SENIOR = [
  { rank: 1,  name: "CHRISTABEL CHISONGO",        club: "Kantanshi",          totalPoints: 630 },
  { rank: 2,  name: "ISABEL CHISONGO",            club: "Kantanshi",          totalPoints: 426 },
  { rank: 3,  name: "MARGARET CHEWE",             club: "Green Buffaloes",    totalPoints: 304 },
  { rank: 4,  name: "SORAYA MUMENA",              club: "Green Buffaloes",    totalPoints: 289 },
  { rank: 5,  name: "MITRESS NALWIZYA",           club: "Nkana",              totalPoints: 168 },
  { rank: 6,  name: "MUKANGWA SIAME",             club: "Nkana",              totalPoints: 167 },
  { rank: 7,  name: "BEATRICE PHIRI",             club: "Red Arrows",         totalPoints: 162 },
  { rank: 8,  name: "NALUNGWE NATASHA",           club: "Green Buffaloes",    totalPoints: 159 },
  { rank: 9,  name: "MUTALE MAGGIE",              club: "ZNS",                totalPoints: 135 },
  { rank: 10, name: "ANGELA MWANSA",              club: "Mufulira",           totalPoints: 90  },
  { rank: 11, name: "FEBBY CHILEMBO",             club: "Kalulushi",          totalPoints: 73  },
  { rank: 12, name: "VIOLET MULENGA",             club: "Nkana",              totalPoints: 69  },
  { rank: 13, name: "DIANA KITAIN",               club: "",                   totalPoints: 53  },
  { rank: 14, name: "BLESSINGS NGULUBE",          club: "Kantanshi",          totalPoints: 51  },
  { rank: 15, name: "JANET MWAPE",                club: "Mufulira",           totalPoints: 50  },
  { rank: 16, name: "ALICE MULENGA SOKO",         club: "ZNS",                totalPoints: 45  },
  { rank: 17, name: "KANYAMA HOPE",               club: "Red Arrows",         totalPoints: 38  },
  { rank: 18, name: "KABANSHI MAGRET",            club: "Kantanshi",          totalPoints: 36  },
  { rank: 19, name: "MWELWA FAITH",               club: "ZNS",                totalPoints: 33  },
  { rank: 20, name: "MWILA IREEN",                club: "Green Buffaloes",    totalPoints: 29  },
  { rank: 20, name: "MUKUKA MWENYA",              club: "ZNS",                totalPoints: 29  },
  { rank: 22, name: "SAZAMBILE PATRICIA",         club: "ZNS",                totalPoints: 28  },
  { rank: 23, name: "RUTH NYIRENDA",              club: "",                   totalPoints: 27  },
  { rank: 24, name: "GONDWE DIANA",               club: "Correctional",       totalPoints: 24  },
  { rank: 25, name: "CHEWE EMMY",                 club: "Kamenza",            totalPoints: 19  },
  { rank: 26, name: "BALAMURALI TEJESVI",         club: "",                   totalPoints: 18  },
  { rank: 26, name: "LISA CHISONGO",              club: "Kantanshi",          totalPoints: 18  },
  { rank: 28, name: "WINFRIDAH LUBEMBA",          club: "Green Buffaloes",    totalPoints: 17  },
  { rank: 28, name: "KAYLA MUIMO",                club: "",                   totalPoints: 17  },
  { rank: 30, name: "JESSY MUSUNGA",              club: "Mufulira",           totalPoints: 15  },
  { rank: 30, name: "CHIPULU NATASHA",            club: "",                   totalPoints: 15  },
  { rank: 32, name: "MEDIA CHISWASWA",            club: "",                   totalPoints: 14  },
  { rank: 33, name: "DEBRA BANDA MATETA",         club: "",                   totalPoints: 10  },
  { rank: 34, name: "LETISHA CHIKWA",             club: "",                   totalPoints: 9   },
  { rank: 34, name: "MWANSA MAMBWE",              club: "",                   totalPoints: 9   },
  { rank: 34, name: "NALWIZYA JOYCE",             club: "",                   totalPoints: 9   },
  { rank: 37, name: "PATRICIA CHIBESA",           club: "",                   totalPoints: 8   },
  { rank: 37, name: "NAOMI CHILESHE",             club: "",                   totalPoints: 8   },
  { rank: 37, name: "MULIMA PENELOPE",            club: "Lusaka Club",        totalPoints: 8   },
  { rank: 37, name: "NKOLE FELISTUS",             club: "",                   totalPoints: 8   },
  { rank: 41, name: "FAITH KAMWANGA",             club: "",                   totalPoints: 5   },
  { rank: 41, name: "ISABLE KAPOSA",              club: "",                   totalPoints: 5   },
  { rank: 41, name: "ROYDAH MWASA",               club: "",                   totalPoints: 5   },
  { rank: 41, name: "TIYAMIKE NAMONJE",           club: "Ndola",              totalPoints: 5   },
  { rank: 41, name: "FAITH NAMBAYA",              club: "Mufulira",           totalPoints: 5   },
  { rank: 41, name: "KONDWANI NAMBU",             club: "Ndola",              totalPoints: 5   },
  { rank: 41, name: "ZYNAB MUSOMA",               club: "",                   totalPoints: 5   },
  { rank: 41, name: "BUTEMWA SHAMANO",            club: "Ndola",              totalPoints: 5   },
  { rank: 41, name: "MUSONDA CHANDA",             club: "Green Buffaloes",    totalPoints: 5   },
  { rank: 41, name: "YOLANDA PANTOJA",            club: "Nkana",              totalPoints: 5   },
  { rank: 41, name: "MUNDIA IMBOELA",             club: "Nkana",              totalPoints: 5   },
  { rank: 41, name: "CHIBESA LUBEMBA",            club: "",                   totalPoints: 5   },
  { rank: 41, name: "DENISE MBAZIMA",             club: "",                   totalPoints: 5   },
  { rank: 41, name: "MPHANDE PURITY",             club: "",                   totalPoints: 5   },
  { rank: 41, name: "KOMBE NYENDWA GORRET",       club: "",                   totalPoints: 5   },
  { rank: 41, name: "MWALE ESNART",               club: "",                   totalPoints: 5   },
];

// Manual ZPIN overrides for players whose names in the static data
// don't match their registered account names.
const ZPIN_OVERRIDES = {
  'ABEDNIGO KUNDA':    'ZTAS0021',
  'MABO KOMBE JNR':    'ZTAJ0084',
  'PHIRI DIXON':       'ZTAS0064',
  'CHISHALA MACMILLAN':'ZTAJ0203',
  'MUMBI JUSTINE':     'ZTAS0036',
  "N'GANDU MOSES":     'ZTAS0067',
  'ALICE MULENGA SOKO':'ZTAS0113',
};

// Try to find a User by name (static data uses "LASTNAME FIRSTNAME" or "FIRSTNAME LASTNAME")
const findUser = async (fullName) => {
  // Check manual override first
  const overrideZpin = ZPIN_OVERRIDES[fullName.trim().toUpperCase()];
  if (overrideZpin) {
    const u = await User.findOne({ zpin: overrideZpin });
    if (u) return u;
  }

  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;

  // Try "LASTNAME FIRSTNAME"
  const lastName  = parts[0];
  const firstName = parts.slice(1).join(' ');
  let user = await User.findOne({
    lastName:  { $regex: new RegExp(`^${lastName}$`,  'i') },
    firstName: { $regex: new RegExp(`^${firstName}$`, 'i') }
  });
  if (user) return user;

  // Try "FIRSTNAME LASTNAME"
  const firstName2 = parts[0];
  const lastName2  = parts.slice(1).join(' ');
  user = await User.findOne({
    firstName: { $regex: new RegExp(`^${firstName2}$`, 'i') },
    lastName:  { $regex: new RegExp(`^${lastName2}$`,  'i') }
  });
  return user || null;
};

const seedCategory = async (players, rankingCategory) => {
  let created = 0, skipped = 0, unmatched = 0;

  for (const p of players) {
    // Skip if already seeded
    const exists = await Ranking.findOne({ playerName: p.name, category: rankingCategory, rankingPeriod: PERIOD, isActive: true });
    if (exists) { skipped++; continue; }

    const user = await findUser(p.name);
    if (!user) unmatched++;

    const doc = new Ranking({
      playerName:    p.name,
      playerZpin:    user?.zpin   || null,
      playerId:      user?._id    || null,
      club:          p.club       || '',
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

const run = async () => {
  await connectDatabase();

  console.log('Seeding men_senior...');
  const men = await seedCategory(MEN_SENIOR, 'men_senior');
  console.log(`  created: ${men.created}, skipped: ${men.skipped}, no ZPIN match: ${men.unmatched}`);

  console.log('Seeding women_senior...');
  const women = await seedCategory(WOMEN_SENIOR, 'women_senior');
  console.log(`  created: ${women.created}, skipped: ${women.skipped}, no ZPIN match: ${women.unmatched}`);

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch(err => { console.error(err); process.exit(1); });
