import { apiFetch } from './api';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  token: string;
}

export const authService = {
  async register(data: RegisterData): Promise<User> {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  },

  async login(data: LoginData): Promise<User> {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  async getMe(): Promise<User> {
    const response = await apiFetch('/auth/me');
    return response.data;
  },

  async updateDetails(data: Partial<User>): Promise<User> {
    const response = await apiFetch('/auth/updatedetails', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiFetch('/auth/updatepassword', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getCurrentUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.role === 'staff';
  }
};
