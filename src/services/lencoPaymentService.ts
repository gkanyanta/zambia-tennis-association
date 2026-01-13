import { apiFetch } from './api';

export interface LencoPaymentInitResponse {
  reference: string;
  amount: number;
  email: string;
  publicKey: string;
  currency: string;
  membershipType?: string;
  tournamentId?: string;
  tournamentName?: string;
  donationId?: string;
  coachId?: string;
  duration?: number;
}

export interface LencoPaymentVerifyResponse {
  reference: string;
  transactionId: string;
  amount: number;
  status: string;
  user?: {
    id: string;
    name: string;
    membershipType?: string;
    membershipStatus?: string;
    membershipExpiry?: string;
  };
  donation?: {
    id: string;
    receiptNumber: string;
    donorName: string;
    donationType: string;
    status: string;
  };
}

export const lencoPaymentService = {
  /**
   * Initialize membership payment
   */
  async initializeMembershipPayment(membershipType: 'junior' | 'adult' | 'family'): Promise<LencoPaymentInitResponse> {
    const response = await apiFetch('/lenco/membership/initialize', {
      method: 'POST',
      body: JSON.stringify({ membershipType }),
    });
    return response.data;
  },

  /**
   * Initialize tournament payment
   */
  async initializeTournamentPayment(tournamentId: string): Promise<LencoPaymentInitResponse> {
    const response = await apiFetch(`/lenco/tournament/${tournamentId}/initialize`, {
      method: 'POST',
    });
    return response.data;
  },

  /**
   * Initialize donation
   */
  async initializeDonation(donationData: {
    amount: number;
    donorName: string;
    donorEmail: string;
    donorPhone?: string;
    donationType?: string;
    message?: string;
    isAnonymous?: boolean;
  }): Promise<LencoPaymentInitResponse> {
    const response = await apiFetch('/lenco/donation/initialize', {
      method: 'POST',
      body: JSON.stringify(donationData),
    });
    return response.data;
  },

  /**
   * Initialize coach listing payment
   */
  async initializeCoachListingPayment(paymentData: {
    amount: number;
    duration: number;
    coachId: string;
  }): Promise<LencoPaymentInitResponse> {
    const response = await apiFetch('/lenco/coach-listing/initialize', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return response.data;
  },

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<LencoPaymentVerifyResponse> {
    const response = await apiFetch(`/lenco/verify/${reference}`);
    return response.data;
  },
};
