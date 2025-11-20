import { apiFetch } from '@/services/api'

export interface Payment {
  _id: string
  entityType: 'player' | 'club'
  entityId: string
  entityModel: 'User' | 'Club'
  entityName: string
  amount: number
  membershipType: 'junior' | 'adult' | 'international' | 'club_affiliation'
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'other'
  transactionReference?: string
  paymentDate: string
  validFrom: string
  validUntil: string
  recordedBy: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  notes?: string
  status: 'completed' | 'pending' | 'refunded' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface PaymentStats {
  totalRevenue: number
  totalPayments: number
  revenueByType: Array<{
    _id: string
    total: number
    count: number
  }>
  expiringSoon: number
  expired: number
}

export interface RecordPaymentData {
  entityType: 'player' | 'club'
  entityId: string
  membershipType: string
  amount: number
  paymentMethod?: string
  transactionReference?: string
  paymentDate?: string
  notes?: string
}

class MembershipPaymentService {
  // Record a new payment
  async recordPayment(data: RecordPaymentData): Promise<Payment> {
    const response = await apiFetch('/membership-payments', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return response.data
  }

  // Get all payments with filters
  async getPayments(filters?: {
    entityType?: string
    entityId?: string
    membershipType?: string
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<{ data: Payment[]; count: number; total: number; totalPages: number; currentPage: number }> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString())
        }
      })
    }

    const url = `/membership-payments${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiFetch(url)
    return response
  }

  // Get payment by ID
  async getPayment(id: string): Promise<Payment> {
    const response = await apiFetch(`/membership-payments/${id}`)
    return response.data
  }

  // Get payments for a specific entity
  async getEntityPayments(entityType: 'player' | 'club', entityId: string): Promise<Payment[]> {
    const response = await apiFetch(`/membership-payments/entity/${entityType}/${entityId}`)
    return response.data
  }

  // Get payment statistics
  async getPaymentStats(filters?: {
    startDate?: string
    endDate?: string
  }): Promise<PaymentStats> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }

    const url = `/membership-payments/stats${params.toString() ? '?' + params.toString() : ''}`
    const response = await apiFetch(url)
    return response.data
  }

  // Get expiring memberships
  async getExpiringMemberships(days: number = 30): Promise<Payment[]> {
    const response = await apiFetch(`/membership-payments/expiring?days=${days}`)
    return response.data
  }

  // Calculate suggested payment amount
  async calculatePaymentAmount(entityType: 'player' | 'club', entityId: string): Promise<{
    amount: number
    membershipType: string
    currency: string
  }> {
    const response = await apiFetch(`/membership-payments/calculate-amount/${entityType}/${entityId}`)
    return response.data
  }
}

export const membershipPaymentService = new MembershipPaymentService()
