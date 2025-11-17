import { apiFetch } from './api';

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
}

export const paymentService = {
  async createMembershipPayment(membershipType: string): Promise<PaymentIntent> {
    const response = await apiFetch('/payments/membership', {
      method: 'POST',
      body: JSON.stringify({ membershipType }),
    });
    return response.data;
  },

  async confirmMembershipPayment(paymentIntentId: string, membershipType: string): Promise<any> {
    const response = await apiFetch('/payments/membership/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId, membershipType }),
    });
    return response.data;
  },

  async createTournamentPayment(tournamentId: string): Promise<PaymentIntent> {
    const response = await apiFetch(`/payments/tournament/${tournamentId}`, {
      method: 'POST',
    });
    return response.data;
  }
};
