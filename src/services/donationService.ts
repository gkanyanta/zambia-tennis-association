import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface Donation {
  _id: string
  donorName: string
  donorEmail: string
  donorPhone?: string
  userId?: string
  amount: number
  currency: string
  donationType: 'general' | 'youth_development' | 'tournament_support' | 'coach_education' | 'infrastructure'
  message?: string
  paymentGateway: string
  transactionId?: string
  flutterwaveTransactionId?: string
  paymentReference?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  paymentDate?: Date
  paymentMethod?: string
  paymentProvider?: string
  refunded: boolean
  refundDate?: Date
  refundAmount?: number
  refundReason?: string
  isAnonymous: boolean
  receiptNumber?: string
  receiptGenerated: boolean
  receiptUrl?: string
  thankYouEmailSent: boolean
  adminNotes?: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface DonationPayload {
  amount: number
  donorName: string
  donorEmail: string
  donorPhone?: string
  donationType?: 'general' | 'youth_development' | 'tournament_support' | 'coach_education' | 'infrastructure'
  message?: string
  isAnonymous?: boolean
}

export interface DonationInitializeResponse {
  success: boolean
  donationId: string
  paymentLink: string
  transactionRef: string
}

export interface DonationStats {
  success: boolean
  totalDonations: number
  totalCount: number
  byType: Array<{
    _id: string
    total: number
    count: number
  }>
  monthlyDonations: Array<{
    _id: number
    total: number
    count: number
  }>
}

class DonationService {
  // Initialize donation payment
  async initializeDonation(payload: DonationPayload): Promise<DonationInitializeResponse> {
    const response = await axios.post(`${API_URL}/flutterwave/donations/initialize`, payload)
    return response.data
  }

  // Verify donation payment
  async verifyDonation(transactionId: string): Promise<{ success: boolean; donation?: Donation; message: string }> {
    const response = await axios.get(`${API_URL}/flutterwave/donations/verify/${transactionId}`)
    return response.data
  }

  // Get all donations (Admin only)
  async getDonations(filters?: {
    status?: string
    donationType?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }): Promise<{ success: boolean; donations: Donation[]; pagination: any }> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/flutterwave/donations`, {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  }

  // Get donation statistics (Admin only)
  async getDonationStats(): Promise<DonationStats> {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/flutterwave/donations/stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  }
}

export const donationService = new DonationService()
