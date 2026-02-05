import { apiFetch } from './api';

export interface PlayerRegistration {
  _id: string;
  referenceNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phone: string;
  email?: string;
  club?: string;
  isInternational: boolean;
  parentGuardianName?: string;
  parentGuardianPhone?: string;
  parentGuardianEmail?: string;
  proofOfAgeDocument?: {
    url: string;
    publicId: string;
    originalName: string;
    fileType: string;
  };
  status: 'pending_payment' | 'pending_approval' | 'approved' | 'rejected';
  paymentReference?: string;
  paymentAmount: number;
  paymentDate?: string;
  paymentMethod?: string;
  membershipTypeCode: string;
  membershipTypeName: string;
  membershipTypeAmount: number;
  reviewedBy?: { _id: string; firstName: string; lastName: string };
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdUserId?: { _id: string; firstName: string; lastName: string; zpin: string };
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationSubmitData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string;
  club?: string;
  isInternational?: boolean;
  parentGuardianName?: string;
  parentGuardianPhone?: string;
  parentGuardianEmail?: string;
  proofOfAgeDocument?: {
    url: string;
    publicId: string;
    originalName: string;
    fileType: string;
  };
}

export interface RegistrationPaymentResponse {
  referenceNumber: string;
  paymentReference: string;
  amount: number;
  email: string;
  publicKey: string;
  currency: string;
  membershipType: string;
}

export interface RegistrationLookupResponse {
  referenceNumber: string;
  firstName: string;
  lastName: string;
  membershipTypeName: string;
  paymentAmount: number;
  status: string;
  email?: string;
  createdAt: string;
}

export interface RegistrationsListResponse {
  registrations: PlayerRegistration[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  statusCounts: {
    pending_payment: number;
    pending_approval: number;
    approved: number;
    rejected: number;
  };
}

export const playerRegistrationService = {
  // ===== Public endpoints =====

  async submitRegistration(data: RegistrationSubmitData): Promise<{
    referenceNumber: string;
    amount: number;
    membershipType: string;
    status: string;
  }> {
    const response = await apiFetch('/player-registration/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async submitAndPay(data: RegistrationSubmitData): Promise<RegistrationPaymentResponse> {
    const response = await apiFetch('/player-registration/submit-and-pay', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async verifyPayment(paymentReference: string): Promise<{ referenceNumber: string; status: string }> {
    const response = await apiFetch('/player-registration/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentReference }),
    });
    return response.data;
  },

  async lookupByReference(referenceNumber: string): Promise<RegistrationLookupResponse> {
    const response = await apiFetch(`/player-registration/lookup/${referenceNumber}`);
    return response.data;
  },

  async initializePayLaterPayment(referenceNumber: string, email?: string): Promise<RegistrationPaymentResponse> {
    const response = await apiFetch('/player-registration/pay-later', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, email }),
    });
    return response.data;
  },

  // ===== Admin endpoints =====

  async getRegistrations(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<RegistrationsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    const response = await apiFetch(`/player-registration${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  async getRegistration(id: string): Promise<PlayerRegistration> {
    const response = await apiFetch(`/player-registration/${id}`);
    return response.data;
  },

  async updateRegistration(id: string, data: Partial<RegistrationSubmitData> & { adminNotes?: string }): Promise<PlayerRegistration> {
    const response = await apiFetch(`/player-registration/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async approveRegistration(id: string, adminNotes?: string): Promise<{
    registration: PlayerRegistration;
    user: { _id: string; firstName: string; lastName: string; zpin: string; membershipType: string; membershipStatus: string };
  }> {
    const response = await apiFetch(`/player-registration/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    });
    return response.data;
  },

  async rejectRegistration(id: string, rejectionReason: string): Promise<PlayerRegistration> {
    const response = await apiFetch(`/player-registration/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
    return response.data;
  },

  async recordManualPayment(id: string, data: {
    paymentMethod: string;
    paymentReference?: string;
    adminNotes?: string;
  }): Promise<PlayerRegistration> {
    const response = await apiFetch(`/player-registration/${id}/record-payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};
