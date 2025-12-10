import dotenv from 'dotenv';
import { connectDatabase } from '../config/database.js';
import League from '../models/League.js';
import LeagueTeam from '../models/LeagueTeam.js';
import LeagueFixture from '../models/LeagueFixture.js';

dotenv.config();

const seedLeagues = async () => {
  try {
    await connectDatabase();

    console.log('Clearing existing league data...');
    await League.deleteMany({});
    await LeagueTeam.deleteMany({});
    await LeagueFixture.deleteMany({});

    console.log('Creating league teams...');

    // Northern Region Teams
    const northernTeams = await LeagueTeam.insertMany([
      {
        name: 'Ndola Tennis Club',
        shortName: 'NTC',
        region: 'northern',
        city: 'Ndola',
        province: 'Copperbelt',
        homeVenue: {
          name: 'Ndola Tennis Club',
          address: 'Ndola, Copperbelt Province',
          numberOfCourts: 4,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Kitwe Tennis Centre',
        shortName: 'KTC',
        region: 'northern',
        city: 'Kitwe',
        province: 'Copperbelt',
        homeVenue: {
          name: 'Kitwe Tennis Centre',
          address: 'Kitwe, Copperbelt Province',
          numberOfCourts: 3,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Mufulira Sports Club',
        shortName: 'MSC',
        region: 'northern',
        city: 'Mufulira',
        province: 'Copperbelt',
        homeVenue: {
          name: 'Mufulira Sports Club',
          address: 'Mufulira, Copperbelt Province',
          numberOfCourts: 2,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Chingola Tennis Academy',
        shortName: 'CTA',
        region: 'northern',
        city: 'Chingola',
        province: 'Copperbelt',
        homeVenue: {
          name: 'Chingola Tennis Academy',
          address: 'Chingola, Copperbelt Province',
          numberOfCourts: 3,
          courtSurface: 'hard'
        },
        isActive: true
      }
    ]);

    // Southern Region Teams
    const southernTeams = await LeagueTeam.insertMany([
      {
        name: 'Lusaka Tennis Club',
        shortName: 'LTC',
        region: 'southern',
        city: 'Lusaka',
        province: 'Lusaka',
        homeVenue: {
          name: 'Lusaka Tennis Club',
          address: 'Lusaka, Lusaka Province',
          numberOfCourts: 6,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Olympic Youth Development Centre',
        shortName: 'OYDC',
        region: 'southern',
        city: 'Lusaka',
        province: 'Lusaka',
        homeVenue: {
          name: 'Olympic Youth Development Centre',
          address: 'Lusaka, Lusaka Province',
          numberOfCourts: 8,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Kabwe Sports Complex',
        shortName: 'KSC',
        region: 'southern',
        city: 'Kabwe',
        province: 'Central',
        homeVenue: {
          name: 'Kabwe Sports Complex',
          address: 'Kabwe, Central Province',
          numberOfCourts: 4,
          courtSurface: 'hard'
        },
        isActive: true
      },
      {
        name: 'Livingstone Tennis Club',
        shortName: 'LvTC',
        region: 'southern',
        city: 'Livingstone',
        province: 'Southern',
        homeVenue: {
          name: 'Livingstone Tennis Club',
          address: 'Livingstone, Southern Province',
          numberOfCourts: 3,
          courtSurface: 'hard'
        },
        isActive: true
      }
    ]);

    console.log(`Created ${northernTeams.length + southernTeams.length} teams`);

    console.log('Creating leagues...');

    // Northern Men's League
    const northernMensLeague = await League.create({
      name: 'Northern Region Men\'s League',
      season: 'Summer',
      year: 2025,
      region: 'northern',
      gender: 'men',
      description: 'Copperbelt Provincial Tennis League - Men\'s Division',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      status: 'active',
      teams: northernTeams.map(t => t._id),
      settings: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchFormat: '2singles_1doubles',
        numberOfRounds: 1
      },
      organizer: 'Zambia Tennis Association',
      contactEmail: 'leagues@zambiatennisorg',
      contactPhone: '+260 XXX XXXXXX'
    });

    // Southern Men's League
    const southernMensLeague = await League.create({
      name: 'Southern Region Men\'s League',
      season: 'Summer',
      year: 2025,
      region: 'southern',
      gender: 'men',
      description: 'Midlands Provincial Tennis League - Men\'s Division',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      status: 'active',
      teams: southernTeams.map(t => t._id),
      settings: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchFormat: '2singles_1doubles',
        numberOfRounds: 1
      },
      organizer: 'Zambia Tennis Association',
      contactEmail: 'leagues@zambiatennisorg',
      contactPhone: '+260 XXX XXXXXX'
    });

    // Northern Women's League
    const northernWomensLeague = await League.create({
      name: 'Northern Region Women\'s League',
      season: 'Summer',
      year: 2025,
      region: 'northern',
      gender: 'women',
      description: 'Copperbelt Provincial Tennis League - Women\'s Division',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      status: 'active',
      teams: northernTeams.map(t => t._id),
      settings: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchFormat: '2singles_1doubles',
        numberOfRounds: 1
      },
      organizer: 'Zambia Tennis Association',
      contactEmail: 'leagues@zambiatennisorg',
      contactPhone: '+260 XXX XXXXXX'
    });

    // Southern Women's League
    const southernWomensLeague = await League.create({
      name: 'Southern Region Women\'s League',
      season: 'Summer',
      year: 2025,
      region: 'southern',
      gender: 'women',
      description: 'Midlands Provincial Tennis League - Women\'s Division',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-05-31'),
      status: 'active',
      teams: southernTeams.map(t => t._id),
      settings: {
        pointsForWin: 3,
        pointsForDraw: 1,
        pointsForLoss: 0,
        matchFormat: '2singles_1doubles',
        numberOfRounds: 1
      },
      organizer: 'Zambia Tennis Association',
      contactEmail: 'leagues@zambiatennisorg',
      contactPhone: '+260 XXX XXXXXX'
    });

    console.log('Created 4 leagues');

    console.log('Creating sample fixtures for Northern Men\'s League...');

    // Create some sample fixtures
    const sampleFixtures = await LeagueFixture.insertMany([
      // Northern Men's fixtures
      {
        league: northernMensLeague._id,
        round: 1,
        roundName: 'Round 1',
        homeTeam: northernTeams[0]._id,
        awayTeam: northernTeams[1]._id,
        scheduledDate: new Date('2025-02-15'),
        venue: northernTeams[0].homeVenue.name,
        status: 'completed',
        matches: [
          { matchType: 'singles1', homeScore: 2, awayScore: 1, homePlayer: 'John Banda', awayPlayer: 'Peter Mwale' },
          { matchType: 'singles2', homeScore: 1, awayScore: 2, homePlayer: 'David Phiri', awayPlayer: 'James Zulu' },
          { matchType: 'doubles', homeScore: 2, awayScore: 0, homePlayers: ['John Banda', 'David Phiri'], awayPlayers: ['Peter Mwale', 'James Zulu'] }
        ],
        overallScore: { homeWins: 2, awayWins: 1 },
        winner: northernTeams[0]._id,
        isDraw: false,
        completedAt: new Date('2025-02-15')
      },
      {
        league: northernMensLeague._id,
        round: 1,
        roundName: 'Round 1',
        homeTeam: northernTeams[2]._id,
        awayTeam: northernTeams[3]._id,
        scheduledDate: new Date('2025-02-15'),
        venue: northernTeams[2].homeVenue.name,
        status: 'completed',
        matches: [
          { matchType: 'singles1', homeScore: 2, awayScore: 0, homePlayer: 'Moses Kabwe', awayPlayer: 'Patrick Mulenga' },
          { matchType: 'singles2', homeScore: 2, awayScore: 1, homePlayer: 'Emmanuel Zulu', awayPlayer: 'Joseph Chanda' },
          { matchType: 'doubles', homeScore: 0, awayScore: 2, homePlayers: ['Moses Kabwe', 'Emmanuel Zulu'], awayPlayers: ['Patrick Mulenga', 'Joseph Chanda'] }
        ],
        overallScore: { homeWins: 2, awayWins: 1 },
        winner: northernTeams[2]._id,
        isDraw: false,
        completedAt: new Date('2025-02-15')
      },
      {
        league: northernMensLeague._id,
        round: 2,
        roundName: 'Round 2',
        homeTeam: northernTeams[1]._id,
        awayTeam: northernTeams[2]._id,
        scheduledDate: new Date('2025-02-22'),
        venue: northernTeams[1].homeVenue.name,
        status: 'scheduled',
        matches: [],
        overallScore: { homeWins: 0, awayWins: 0 }
      },
      {
        league: northernMensLeague._id,
        round: 2,
        roundName: 'Round 2',
        homeTeam: northernTeams[3]._id,
        awayTeam: northernTeams[0]._id,
        scheduledDate: new Date('2025-02-22'),
        venue: northernTeams[3].homeVenue.name,
        status: 'scheduled',
        matches: [],
        overallScore: { homeWins: 0, awayWins: 0 }
      },
      // Southern Men's fixtures
      {
        league: southernMensLeague._id,
        round: 1,
        roundName: 'Round 1',
        homeTeam: southernTeams[0]._id,
        awayTeam: southernTeams[1]._id,
        scheduledDate: new Date('2025-02-16'),
        venue: southernTeams[0].homeVenue.name,
        status: 'completed',
        matches: [
          { matchType: 'singles1', homeScore: 2, awayScore: 0, homePlayer: 'Andrew Mwale', awayPlayer: 'Michael Sichone' },
          { matchType: 'singles2', homeScore: 1, awayScore: 2, homePlayer: 'Peter Simukonda', awayPlayer: 'Francis Tembo' },
          { matchType: 'doubles', homeScore: 2, awayScore: 1, homePlayers: ['Andrew Mwale', 'Peter Simukonda'], awayPlayers: ['Michael Sichone', 'Francis Tembo'] }
        ],
        overallScore: { homeWins: 2, awayWins: 1 },
        winner: southernTeams[0]._id,
        isDraw: false,
        completedAt: new Date('2025-02-16')
      },
      {
        league: southernMensLeague._id,
        round: 1,
        roundName: 'Round 1',
        homeTeam: southernTeams[2]._id,
        awayTeam: southernTeams[3]._id,
        scheduledDate: new Date('2025-02-16'),
        venue: southernTeams[2].homeVenue.name,
        status: 'scheduled',
        matches: [],
        overallScore: { homeWins: 0, awayWins: 0 }
      }
    ]);

    console.log(`Created ${sampleFixtures.length} sample fixtures`);

    console.log('✅ League data seeded successfully!');
    console.log(`
Summary:
- Created ${northernTeams.length + southernTeams.length} teams
- Created 4 leagues (2 regions x 2 genders)
- Created ${sampleFixtures.length} sample fixtures
    `);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding league data:', error);
    process.exit(1);
  }
};

seedLeagues();
