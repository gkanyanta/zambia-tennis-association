import { apiFetch } from './api';

export interface Stats {
  activeMembers: number;
  tournamentsYearly: number;
  yearsOfExcellence: number;
  growingClubs: number;
}

export interface AdminStats {
  totalPlayers: number;
  activeMembers: number;
  expiredMembers: number;
  tournamentsThisYear: number;
  pendingApplications: number;
  pendingPayment: number;
  pendingApproval: number;
  revenueThisMonth: number;
  revenueTransactions: number;
  revenueChange: number;
  clubsCount: number;
  recentRegistrations: {
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
    membershipTypeName: string;
  }[];
}

export const statsService = {
  getStats: async (): Promise<Stats> => {
    const response = await apiFetch('/stats');
    return response;
  },
  getAdminStats: async (): Promise<AdminStats> => {
    const response = await apiFetch('/stats/admin');
    return response;
  }
};
