import { apiFetch } from './api';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'player' | 'club_official' | 'admin' | 'staff';
  zpin?: string;
  club?: string;
  membershipType?: 'junior' | 'adult' | 'family' | null;
  membershipStatus?: 'active' | 'expired' | 'pending' | null;
  membershipExpiry?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  phone?: string;
  parentGuardianName?: string;
  parentGuardianPhone?: string;
  parentGuardianEmail?: string;
  address?: {
    street: string;
    city: string;
    province: string;
    country: string;
  };
  createdAt: string;
}

export const userService = {
  async getUsers(): Promise<User[]> {
    const response = await apiFetch('/users');
    return response.data;
  },

  async getPlayers(): Promise<User[]> {
    const response = await apiFetch('/players');
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await apiFetch(`/users/${id}`);
    return response.data;
  },

  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      province: string;
      country: string;
    };
  }): Promise<User> {
    const response = await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiFetch(`/users/${id}`, {
      method: 'DELETE',
    });
  }
};
