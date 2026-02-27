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
  receiptNumber?: string;
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

export interface IncomeTransaction {
  _id: string;
  reference: string;
  receiptNumber: string | null;
  transactionId: string | null;
  type: 'donation' | 'membership' | 'tournament' | 'coach_listing';
  amount: number;
  currency: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentGateway: string;
  paymentMethod: string;
  description: string | null;
  metadata: Record<string, unknown>;
  paymentDate: string | null;
  createdAt: string;
}

export interface IncomeSummary {
  byType: Array<{
    type: string;
    totalAmount: number;
    count: number;
  }>;
  total: {
    totalAmount: number;
    count: number;
  };
}

export interface IncomeStatementResponse {
  summary: IncomeSummary;
  transactions: IncomeTransaction[];
  filters: {
    startDate: string | null;
    endDate: string | null;
    type: string;
  };
}

export interface TransactionsResponse {
  transactions: IncomeTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
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

  async getIncomeStatement(params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
  }): Promise<IncomeStatementResponse> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.type) searchParams.set('type', params.type);
    const qs = searchParams.toString();
    const response = await apiFetch(`/lenco/income-statement${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const qs = searchParams.toString();
    const response = await apiFetch(`/lenco/transactions${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  async resendReceipt(receiptNumber: string, email: string): Promise<{ message: string }> {
    const response = await apiFetch(`/lenco/receipt/${receiptNumber}/send`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  },
};
