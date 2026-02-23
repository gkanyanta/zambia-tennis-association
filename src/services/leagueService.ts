import apiClient from './apiClient';
import { Club } from './clubService';

const API_URL = '/leagues';

// ─── Match format definitions (mirrors backend) ────────────────

export const MATCH_FORMATS: Record<string, { rubberNumber: number; type: string; label: string }[]> = {
  '2s1d': [
    { rubberNumber: 1, type: 'singles1', label: 'Singles 1' },
    { rubberNumber: 2, type: 'singles2', label: 'Singles 2' },
    { rubberNumber: 3, type: 'doubles1', label: 'Doubles' }
  ],
  '3s2d': [
    { rubberNumber: 1, type: 'singles1', label: 'Singles 1' },
    { rubberNumber: 2, type: 'singles2', label: 'Singles 2' },
    { rubberNumber: 3, type: 'singles3', label: 'Singles 3' },
    { rubberNumber: 4, type: 'doubles1', label: 'Doubles 1' },
    { rubberNumber: 5, type: 'doubles2', label: 'Doubles 2' }
  ],
  '4s1d': [
    { rubberNumber: 1, type: 'singles1', label: 'Singles 1' },
    { rubberNumber: 2, type: 'singles2', label: 'Singles 2' },
    { rubberNumber: 3, type: 'singles3', label: 'Singles 3' },
    { rubberNumber: 4, type: 'singles4', label: 'Singles 4' },
    { rubberNumber: 5, type: 'doubles1', label: 'Doubles' }
  ]
};

export const FORMAT_LABELS: Record<string, string> = {
  '2s1d': '2 Singles + 1 Doubles',
  '3s2d': '3 Singles + 2 Doubles',
  '4s1d': '4 Singles + 1 Doubles'
};

// ─── Types ──────────────────────────────────────────────────────

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
  teams: Club[];
  settings: {
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
    matchFormat: string;
    numberOfRounds: number;
    bestOfSets: number;
    matchTiebreak: boolean;
    noAdScoring: boolean;
  };
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TieSet {
  setNumber: number;
  homeGames: number;
  awayGames: number;
  tiebreak?: {
    played: boolean;
    homePoints?: number;
    awayPoints?: number;
  };
  isMatchTiebreak?: boolean;
}

export interface Rubber {
  rubberNumber: number;
  type: string;
  homePlayer?: { _id: string; firstName: string; lastName: string; zpin?: string; club?: Club };
  awayPlayer?: { _id: string; firstName: string; lastName: string; zpin?: string; club?: Club };
  homePlayers?: { _id: string; firstName: string; lastName: string }[];
  awayPlayers?: { _id: string; firstName: string; lastName: string }[];
  sets: TieSet[];
  score: {
    homeSetsWon: number;
    awaySetsWon: number;
  };
  winner: 'home' | 'away' | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'retired' | 'walkover' | 'defaulted';
  duration?: number;
  completedAt?: string;
  retirementReason?: string;
  walkoverTeam?: string;
}

export interface Tie {
  _id: string;
  league: string;
  round: number;
  roundName?: string;
  homeTeam: Club;
  awayTeam: Club;
  scheduledDate: string;
  scheduledTime?: string;
  venue: string;
  venueAddress?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed' | 'walkover';
  rubbers: Rubber[];
  score: {
    home: number;
    away: number;
  };
  stats: {
    home: { rubbersWon: number; setsWon: number; gamesWon: number };
    away: { rubbersWon: number; setsWon: number; gamesWon: number };
  };
  winner?: Club;
  isDraw: boolean;
  notes?: string;
  referee?: string;
  completedAt?: string;
  walkoverTeam?: string;
  walkoverReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeagueStanding {
  team: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  rubbersFor: number;
  rubbersAgainst: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number;
}

export interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  gender?: string;
  zpin?: string;
  club?: string;
  clubId?: string;
  dateOfBirth?: string;
}

// ─── League API ─────────────────────────────────────────────────

export const fetchLeagues = async (params?: {
  region?: string;
  gender?: string;
  season?: string;
  year?: number;
  status?: string;
}): Promise<{ success: boolean; count: number; data: League[] }> => {
  const response = await apiClient.get(API_URL, { params });
  return response.data;
};

export const fetchLeague = async (id: string): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.get(`${API_URL}/${id}`);
  return response.data;
};

export const createLeague = async (data: Partial<League>): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.post(API_URL, data);
  return response.data;
};

export const updateLeague = async (id: string, data: Partial<League>): Promise<{ success: boolean; data: League }> => {
  const response = await apiClient.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const deleteLeague = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiClient.delete(`${API_URL}/${id}`);
  return response.data;
};

// ─── Standings API ──────────────────────────────────────────────

export const fetchLeagueStandings = async (leagueId: string): Promise<{ success: boolean; data: LeagueStanding[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/standings`);
  return response.data;
};

// ─── Ties API ───────────────────────────────────────────────────

export const fetchLeagueTies = async (
  leagueId: string,
  params?: { status?: string; round?: number }
): Promise<{ success: boolean; count: number; data: Tie[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/ties`, { params });
  return response.data;
};

export const fetchTie = async (
  leagueId: string,
  tieId: string
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/ties/${tieId}`);
  return response.data;
};

export const generateLeagueTies = async (
  leagueId: string,
  data?: { startDate?: string }
): Promise<{ success: boolean; count: number; data: Tie[] }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/ties/generate`, data);
  return response.data;
};

export const createTie = async (
  leagueId: string,
  data: {
    homeTeam: string;
    awayTeam: string;
    round?: number;
    roundName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    venue?: string;
    venueAddress?: string;
  }
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/ties`, data);
  return response.data;
};

export const updateTie = async (
  leagueId: string,
  tieId: string,
  data: { status?: string; notes?: string; scheduledDate?: string; scheduledTime?: string; venue?: string; venueAddress?: string; postponementReason?: string }
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.put(`${API_URL}/${leagueId}/ties/${tieId}`, data);
  return response.data;
};

// ─── Player selection API ───────────────────────────────────────

export const fetchAvailablePlayers = async (
  leagueId: string,
  tieId: string
): Promise<{ success: boolean; count: number; data: Player[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/ties/${tieId}/available-players`);
  return response.data;
};

export const updateTiePlayers = async (
  leagueId: string,
  tieId: string,
  data: {
    rubbers: Array<{
      homePlayer?: string;
      awayPlayer?: string;
      homePlayers?: string[];
      awayPlayers?: string[];
    }>;
  }
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.put(`${API_URL}/${leagueId}/ties/${tieId}/players`, data);
  return response.data;
};

// ─── Rubber scoring API ─────────────────────────────────────────

export const updateRubberScore = async (
  leagueId: string,
  tieId: string,
  rubberIndex: number,
  data: {
    sets: TieSet[];
    status?: string;
  }
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.put(`${API_URL}/${leagueId}/ties/${tieId}/rubbers/${rubberIndex}/score`, data);
  return response.data;
};

// ─── Walkover API ───────────────────────────────────────────────

export const recordWalkover = async (
  leagueId: string,
  tieId: string,
  data: { walkoverTeam: string; reason?: string; rubberIndex?: number }
): Promise<{ success: boolean; data: Tie }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/ties/${tieId}/walkover`, data);
  return response.data;
};

// ─── League Registration API ───────────────────────────────────

export interface LeagueRegistration {
  _id: string;
  league: string;
  club: { _id: string; name: string; city?: string; province?: string };
  registeredBy: { _id: string; firstName: string; lastName: string; email?: string };
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  reviewedBy?: { _id: string; firstName: string; lastName: string };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const registerForLeague = async (
  leagueId: string,
  data?: { notes?: string }
): Promise<{ success: boolean; data: LeagueRegistration }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/register`, data || {});
  return response.data;
};

export const fetchLeagueRegistrations = async (
  leagueId: string
): Promise<{ success: boolean; count: number; data: LeagueRegistration[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/registrations`);
  return response.data;
};

export const reviewLeagueRegistration = async (
  leagueId: string,
  registrationId: string,
  data: { status: 'approved' | 'rejected'; rejectionReason?: string }
): Promise<{ success: boolean; data: LeagueRegistration }> => {
  const response = await apiClient.put(`${API_URL}/${leagueId}/registrations/${registrationId}`, data);
  return response.data;
};

// ─── Playoffs API ──────────────────────────────────────────────

export const generatePlayoffs = async (
  leagueId: string
): Promise<{ success: boolean; count: number; data: Tie[]; bracket: any }> => {
  const response = await apiClient.post(`${API_URL}/${leagueId}/playoffs/generate`);
  return response.data;
};

export const fetchPlayoffBracket = async (
  leagueId: string
): Promise<{ success: boolean; count: number; data: Tie[] }> => {
  const response = await apiClient.get(`${API_URL}/${leagueId}/playoffs`);
  return response.data;
};
