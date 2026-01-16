import { apiFetch } from './api';

// ============================================
// TYPES
// ============================================

export interface MembershipType {
  _id: string;
  name: string;
  code: string;
  description: string;
  category: 'player' | 'club';
  amount: number;
  currency: string;
  sortOrder: number;
  isActive: boolean;
  requiresApproval: boolean;
  minAge: number | null;
  maxAge: number | null;
  benefits: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSubscription {
  _id: string;
  entityType: 'player' | 'club';
  entityId: string;
  entityModel: string;
  entityName: string;
  membershipType: MembershipType;
  membershipTypeName: string;
  membershipTypeCode: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  amount: number;
  currency: string;
  paymentReference: string;
  transactionId?: string;
  paymentDate?: string;
  paymentMethod: string;
  receiptNumber?: string;
  zpin?: string;
  notes?: string;
  isRenewal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: MembershipSubscription | null;
  currentYear: number;
  yearEndDate: string;
}

export interface PaymentInitResponse {
  reference: string;
  amount: number;
  currency: string;
  email: string;
  publicKey: string;
  membershipType: {
    id: string;
    name: string;
    code: string;
  };
  subscription: {
    id: string;
    year: number;
    endDate: string;
  };
  club?: {
    id: string;
    name: string;
  };
}

export interface SubscriptionStats {
  currentYear: number;
  activePlayers: number;
  activeClubs: number;
  totalRevenue: number;
  breakdown: Array<{
    _id: { entityType: string; status: string };
    count: number;
    totalAmount: number;
  }>;
}

// ============================================
// SERVICE
// ============================================

export const membershipService = {
  // ============================================
  // MEMBERSHIP TYPES (Public)
  // ============================================

  /**
   * Get all membership types
   */
  async getMembershipTypes(params?: {
    category?: 'player' | 'club';
    activeOnly?: boolean;
  }): Promise<MembershipType[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.activeOnly !== undefined) queryParams.append('activeOnly', String(params.activeOnly));

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiFetch(`/membership/types${query}`);
    return response.data;
  },

  /**
   * Get player ZPIN membership types
   */
  async getPlayerMembershipTypes(): Promise<MembershipType[]> {
    return this.getMembershipTypes({ category: 'player', activeOnly: true });
  },

  /**
   * Get club affiliation types
   */
  async getClubMembershipTypes(): Promise<MembershipType[]> {
    return this.getMembershipTypes({ category: 'club', activeOnly: true });
  },

  /**
   * Get a single membership type
   */
  async getMembershipType(id: string): Promise<MembershipType> {
    const response = await apiFetch(`/membership/types/${id}`);
    return response.data;
  },

  // ============================================
  // ADMIN - MEMBERSHIP TYPE MANAGEMENT
  // ============================================

  /**
   * Create a new membership type (admin)
   */
  async createMembershipType(data: Partial<MembershipType>): Promise<MembershipType> {
    const response = await apiFetch('/membership/types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update a membership type (admin)
   */
  async updateMembershipType(id: string, data: Partial<MembershipType>): Promise<MembershipType> {
    const response = await apiFetch(`/membership/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Delete (deactivate) a membership type (admin)
   */
  async deleteMembershipType(id: string): Promise<void> {
    await apiFetch(`/membership/types/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // PLAYER MEMBERSHIP
  // ============================================

  /**
   * Get current user's subscription status
   */
  async getMySubscription(): Promise<SubscriptionStatus> {
    const response = await apiFetch('/membership/my-subscription');
    return response.data;
  },

  /**
   * Initialize player membership payment
   */
  async initializePayment(membershipTypeId: string): Promise<PaymentInitResponse> {
    const response = await apiFetch('/membership/initialize-payment', {
      method: 'POST',
      body: JSON.stringify({ membershipTypeId }),
    });
    return response.data;
  },

  // ============================================
  // CLUB AFFILIATION
  // ============================================

  /**
   * Initialize club affiliation payment
   */
  async initializeClubPayment(membershipTypeId: string, clubId: string): Promise<PaymentInitResponse> {
    const response = await apiFetch('/membership/club/initialize-payment', {
      method: 'POST',
      body: JSON.stringify({ membershipTypeId, clubId }),
    });
    return response.data;
  },

  // ============================================
  // PAYMENT VERIFICATION
  // ============================================

  /**
   * Verify membership payment
   */
  async verifyPayment(reference: string, transactionId?: string): Promise<{
    subscription: MembershipSubscription;
    receiptNumber: string;
    zpin?: string;
    expiryDate: string;
  }> {
    const response = await apiFetch('/membership/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ reference, transactionId }),
    });
    return response.data;
  },

  // ============================================
  // ADMIN - SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Get all subscriptions with filters (admin)
   */
  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    entityType?: 'player' | 'club';
    status?: 'pending' | 'active' | 'expired' | 'cancelled';
    year?: number;
    search?: string;
  }): Promise<{
    subscriptions: MembershipSubscription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.year) queryParams.append('year', String(params.year));
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiFetch(`/membership/subscriptions${query}`);
    return response.data;
  },

  /**
   * Get subscription statistics (admin)
   */
  async getStats(): Promise<SubscriptionStats> {
    const response = await apiFetch('/membership/stats');
    return response.data;
  },

  /**
   * Record manual/offline payment (admin)
   */
  async recordManualPayment(data: {
    entityType: 'player' | 'club';
    entityId: string;
    membershipTypeId: string;
    amount?: number;
    paymentMethod: 'bank_transfer' | 'cash' | 'mobile_money' | 'other';
    transactionReference?: string;
    notes?: string;
  }): Promise<{
    subscription: MembershipSubscription;
    transaction: any;
    zpin?: string;
  }> {
    const response = await apiFetch('/membership/record-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};
