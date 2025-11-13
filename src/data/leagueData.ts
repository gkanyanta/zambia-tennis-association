import { Team, Fixture, LeagueStanding, League } from '@/types/league'

// Northern Region Teams
const northernTeams: Team[] = [
  { id: 1, name: 'Ndola Tennis Club', region: 'northern', city: 'Ndola' },
  { id: 2, name: 'Kitwe Tennis Centre', region: 'northern', city: 'Kitwe' },
  { id: 3, name: 'Mufulira Sports Club', region: 'northern', city: 'Mufulira' },
  { id: 4, name: 'Chingola Tennis Academy', region: 'northern', city: 'Chingola' },
]

// Southern Region Teams
const southernTeams: Team[] = [
  { id: 5, name: 'Lusaka Tennis Club', region: 'southern', city: 'Lusaka' },
  { id: 6, name: 'Olympic Youth Development Centre', region: 'southern', city: 'Lusaka' },
  { id: 7, name: 'Kabwe Sports Complex', region: 'southern', city: 'Kabwe' },
  { id: 8, name: 'Livingstone Tennis Club', region: 'southern', city: 'Livingstone' },
]

// Northern Men's Fixtures
const northernMensFixtures: Fixture[] = [
  {
    id: 1,
    round: 1,
    homeTeam: northernTeams[0],
    awayTeam: northernTeams[1],
    date: '2025-02-15',
    venue: 'Ndola Tennis Club',
    status: 'completed',
    results: [
      { matchType: 'singles1', homeScore: 2, awayScore: 1, homePlayer: 'John Banda', awayPlayer: 'Peter Mwale' },
      { matchType: 'singles2', homeScore: 1, awayScore: 2, homePlayer: 'David Phiri', awayPlayer: 'James Zulu' },
      { matchType: 'doubles', homeScore: 2, awayScore: 0, homePlayers: ['John Banda', 'David Phiri'], awayPlayers: ['Peter Mwale', 'James Zulu'] },
    ],
  },
  {
    id: 2,
    round: 1,
    homeTeam: northernTeams[2],
    awayTeam: northernTeams[3],
    date: '2025-02-15',
    venue: 'Mufulira Sports Club',
    status: 'completed',
    results: [
      { matchType: 'singles1', homeScore: 2, awayScore: 0, homePlayer: 'Moses Kabwe', awayPlayer: 'Patrick Mulenga' },
      { matchType: 'singles2', homeScore: 2, awayScore: 1, homePlayer: 'Emmanuel Zulu', awayPlayer: 'Joseph Chanda' },
      { matchType: 'doubles', homeScore: 0, awayScore: 2, homePlayers: ['Moses Kabwe', 'Emmanuel Zulu'], awayPlayers: ['Patrick Mulenga', 'Joseph Chanda'] },
    ],
  },
  {
    id: 3,
    round: 2,
    homeTeam: northernTeams[1],
    awayTeam: northernTeams[2],
    date: '2025-02-22',
    venue: 'Kitwe Tennis Centre',
    status: 'scheduled',
  },
  {
    id: 4,
    round: 2,
    homeTeam: northernTeams[3],
    awayTeam: northernTeams[0],
    date: '2025-02-22',
    venue: 'Chingola Tennis Academy',
    status: 'scheduled',
  },
]

// Southern Men's Fixtures
const southernMensFixtures: Fixture[] = [
  {
    id: 5,
    round: 1,
    homeTeam: southernTeams[0],
    awayTeam: southernTeams[1],
    date: '2025-02-16',
    venue: 'Lusaka Tennis Club',
    status: 'completed',
    results: [
      { matchType: 'singles1', homeScore: 2, awayScore: 0, homePlayer: 'Andrew Mwale', awayPlayer: 'Michael Sichone' },
      { matchType: 'singles2', homeScore: 1, awayScore: 2, homePlayer: 'Peter Simukonda', awayPlayer: 'Francis Tembo' },
      { matchType: 'doubles', homeScore: 2, awayScore: 1, homePlayers: ['Andrew Mwale', 'Peter Simukonda'], awayPlayers: ['Michael Sichone', 'Francis Tembo'] },
    ],
  },
  {
    id: 6,
    round: 1,
    homeTeam: southernTeams[2],
    awayTeam: southernTeams[3],
    date: '2025-02-16',
    venue: 'Kabwe Sports Complex',
    status: 'scheduled',
  },
]

// Northern Men's Standings
const northernMensStandings: LeagueStanding[] = [
  { team: northernTeams[2], played: 1, won: 1, lost: 0, matchesFor: 4, matchesAgainst: 1, points: 3 },
  { team: northernTeams[0], played: 1, won: 1, lost: 0, matchesFor: 4, matchesAgainst: 3, points: 3 },
  { team: northernTeams[3], played: 1, won: 0, lost: 1, matchesFor: 2, matchesAgainst: 4, points: 0 },
  { team: northernTeams[1], played: 1, won: 0, lost: 1, matchesFor: 3, matchesAgainst: 4, points: 0 },
]

// Southern Men's Standings
const southernMensStandings: LeagueStanding[] = [
  { team: southernTeams[0], played: 1, won: 1, lost: 0, matchesFor: 5, matchesAgainst: 3, points: 3 },
  { team: southernTeams[1], played: 1, won: 0, lost: 1, matchesFor: 3, matchesAgainst: 5, points: 0 },
  { team: southernTeams[2], played: 0, won: 0, lost: 0, matchesFor: 0, matchesAgainst: 0, points: 0 },
  { team: southernTeams[3], played: 0, won: 0, lost: 0, matchesFor: 0, matchesAgainst: 0, points: 0 },
]

// Northern Women's Standings
const northernWomensStandings: LeagueStanding[] = [
  { team: northernTeams[0], played: 1, won: 1, lost: 0, matchesFor: 5, matchesAgainst: 2, points: 3 },
  { team: northernTeams[1], played: 1, won: 1, lost: 0, matchesFor: 4, matchesAgainst: 3, points: 3 },
  { team: northernTeams[2], played: 1, won: 0, lost: 1, matchesFor: 3, matchesAgainst: 4, points: 0 },
  { team: northernTeams[3], played: 1, won: 0, lost: 1, matchesFor: 2, matchesAgainst: 5, points: 0 },
]

// Southern Women's Standings
const southernWomensStandings: LeagueStanding[] = [
  { team: southernTeams[0], played: 1, won: 1, lost: 0, matchesFor: 6, matchesAgainst: 1, points: 3 },
  { team: southernTeams[1], played: 1, won: 1, lost: 0, matchesFor: 5, matchesAgainst: 2, points: 3 },
  { team: southernTeams[2], played: 1, won: 0, lost: 1, matchesFor: 2, matchesAgainst: 5, points: 0 },
  { team: southernTeams[3], played: 1, won: 0, lost: 1, matchesFor: 1, matchesAgainst: 6, points: 0 },
]

export const leagues: League[] = [
  {
    region: 'northern',
    gender: 'men',
    teams: northernTeams,
    fixtures: northernMensFixtures,
    standings: northernMensStandings,
  },
  {
    region: 'southern',
    gender: 'men',
    teams: southernTeams,
    fixtures: southernMensFixtures,
    standings: southernMensStandings,
  },
  {
    region: 'northern',
    gender: 'women',
    teams: northernTeams,
    fixtures: [],
    standings: northernWomensStandings,
  },
  {
    region: 'southern',
    gender: 'women',
    teams: southernTeams,
    fixtures: [],
    standings: southernWomensStandings,
  },
]

export function getLeague(region: 'northern' | 'southern', gender: 'men' | 'women'): League | undefined {
  return leagues.find(l => l.region === region && l.gender === gender)
}
