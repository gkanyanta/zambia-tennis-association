import apiClient from './apiClient';

const API_URL = '/api/leagues';

export interface League {
  _id: string;
  name: string;
  season: string;
  year: number;
  region: 'northern' | 'southern';
  gender: 'men' | 'women';
  description?: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  teams: LeagueTeam[];
  settings: {
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
    matchFormat: string;
    numberOfRounds: number;
  };
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueTeam {
  _id: string;
  name: string;
  shortName: string;
  region: 'northern' | 'southern';
  city: string;
  province?: string;
  homeVenue: {
    name: string;
    address?: string;
    numberOfCourts?: number;
    courtSurface?: string;
  };
  captain?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  coach?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  roster?: any[];
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  isActive: boolean;
}

export interface MatchResult {
  matchType: 'singles1' | 'singles2' | 'singles3' | 'doubles' | 'doubles2';
  homeScore: number;
  awayScore: number;
  homePlayer?: string;
  awayPlayer?: string;
  homePlayers?: string[];
  awayPlayers?: string[];
  detailedScore?: string;
  duration?: number;
  completedAt?: string;
}

export interface LeagueFixture {
  _id: string;
  league: string;
  round: number;
  roundName?: string;
  homeTeam: LeagueTeam;
  awayTeam: LeagueTeam;
  scheduledDate: string;
  scheduledTime?: string;
  venue: string;
  venueAddress?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | 'walkover';
  matches: MatchResult[];
  overallScore: {
    homeWins: number;
    awayWins: number;
  };
  winner?: LeagueTeam;
  isDraw: boolean;
  notes?: string;
  referee?: string;
  weather?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueStanding {
  team: LeagueTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  matchesFor: number;
  matchesAgainst: number;
  matchesDifference: number;
  points: number;
}

// Fetch all leagues
export const fetchLeagues = async (params?: {
  region?: 'northern' | 'southern';
  gender?: 'men' | 'women';
  season?: string;
  year?: number;
  status?: string;
}): Promise<{ success: boolean; count: number; data: League[] }> => {
  const response = await apiClient.get(API_URL, { params });
  return response.data;
};

// Fetch single league
export const fetchLeague = async (id: string): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.get(`${API_URL}/${id}`);
  return response.data;
};

// Create league (admin only)
export const createLeague = async (leagueData: Partial<League>): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.post(API_URL, leagueData);
  return response.data;
};

// Update league (admin only)
export const updateLeague = async (id: string, leagueData: Partial<League>): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.put(`${API_URL}/${id}`, leagueData);
  return response.data;
};

// Delete league (admin only)
export const deleteLeague = async (id: string): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`${API_URL}/${id}`);
  return response.data;
};

// Get league standings
export const fetchLeagueStandings = async (leagueId: string): Promise<{ success: boolean; data: LeagueStanding[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/standings`);
  return response.data;
};

// Get league fixtures
export const fetchLeagueFixtures = async (
  leagueId: string,
  params?: { status?: string; round?: number }
): Promise<{ success: boolean; count: number; data: LeagueFixture[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/fixtures`, { params });
  return response.data;
};

// Generate fixtures for league (admin only)
export const generateLeagueFixtures = async (
  leagueId: string,
  data?: { startDate?: string }
): Promise<{ success: boolean; count: number; data: LeagueFixture[] }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/fixtures/generate`, data);
  return response.data;
};

// Update fixture result (admin only)
export const updateFixtureResult = async (
  leagueId: string,
  fixtureId: string,
  data: {
    matches?: MatchResult[];
    status?: string;
    notes?: string;
  }
): Promise<{ success: boolean; data: LeagueFixture }> => {
  const response = await apiClient.put(`${API_URL}/${leagueId}/fixtures/${fixtureId}`, data);
  return response.data;
};

// League Teams API
const TEAMS_API_URL = '/api/league-teams';

// Fetch all league teams
export const fetchLeagueTeams = async (params?: {
  region?: 'northern' | 'southern';
  city?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; count: number; data: LeagueTeam[] }> => {
  const response = await apiClient.get(TEAMS_API_URL, { params });
  return response.data;
};

// Fetch single league team
export const fetchLeagueTeam = async (id: string): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.get(`${TEAMS_API_URL}/${id}`);
  return response.data;
};

// Create league team (admin only)
export const createLeagueTeam = async (teamData: Partial<LeagueTeam>): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.post(TEAMS_API_URL, teamData);
  return response.data;
};

// Update league team (admin only)
export const updateLeagueTeam = async (id: string, teamData: Partial<LeagueTeam>): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.put(`${TEAMS_API_URL}/${id}`, teamData);
  return response.data;
};

// Delete league team (admin only)
export const deleteLeagueTeam = async (id: string): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`${TEAMS_API_URL}/${id}`);
  return response.data;
};

// Add player to team roster (admin only)
export const addPlayerToRoster = async (
  teamId: string,
  playerData: {
    playerId: string;
    playerName: string;
    gender?: string;
    ranking?: number;
    position?: string;
  }
): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.post(`${TEAMS_API_URL}/${teamId}/roster`, playerData);
  return response.data;
};

// Remove player from team roster (admin only)
export const removePlayerFromRoster = async (teamId: string, playerId: string): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.delete(`${TEAMS_API_URL}/${teamId}/roster/${playerId}`);
  return response.data;
};

// Update player position in roster (admin only)
export const updatePlayerPosition = async (
  teamId: string,
  playerId: string,
  data: { position?: string; ranking?: number }
): Promise<{ success: boolean; data: LeagueTeam }> => {
  const response = await apiClient.put(`${TEAMS_API_URL}/${teamId}/roster/${playerId}`, data);
  return response.data;
};
