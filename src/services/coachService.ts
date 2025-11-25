import { apiFetch } from '@/services/api'

export interface Certification {
  name: string
  issuedBy: string
  dateObtained?: Date
  expiryDate?: Date
  certificateUrl?: string
}

export interface Coach {
  _id: string
  userId?: string
  firstName: string
  lastName: string
  fullName?: string
  email: string
  phone: string
  profileImage?: string
  itfLevel: 'ITF Level 1' | 'ITF Level 2' | 'ITF Level 3' | 'Other'
  certifications?: Certification[]
  specializations?: string[]
  experience: number
  bio?: string
  languages?: string[]
  club: {
    _id: string
    name: string
    city?: string
    province?: string
  }
  clubVerificationStatus: 'pending' | 'verified' | 'rejected'
  clubVerifiedBy?: {
    _id: string
    firstName: string
    lastName: string
  }
  clubVerifiedAt?: Date
  clubRejectionReason?: string
  listingStatus: 'pending' | 'active' | 'suspended' | 'expired'
  currentListingId?: string
  listingExpiryDate?: Date
  preferredContactMethod: 'email' | 'phone' | 'both'
  availableForBooking: boolean
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  isActivelyListed?: boolean
}

export interface CoachWithHistory extends Coach {
  listingHistory?: CoachListing[]
}

export interface CoachListing {
  _id: string
  coach: string | Coach
  amount: number
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'other'
  transactionReference?: string
  validFrom: Date
  validUntil: Date
  duration: number
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'cancelled'
  paymentDate: Date
  recordedBy: {
    _id: string
    firstName: string
    lastName: string
  }
  refundDate?: Date
  refundAmount?: number
  refundReason?: string
  refundedBy?: {
    _id: string
    firstName: string
    lastName: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
  isActive?: boolean
  isExpired?: boolean
}

export interface PricingPlan {
  duration: number
  price: number
  name: string
  description?: string
  isActive: boolean
}

export interface CoachListingSettings {
  _id: string
  pricingPlans: PricingPlan[]
  defaultDuration: number
  defaultPrice: number
  requireClubVerification: boolean
  autoApproveListings: boolean
  maxListingDuration: number
  minListingDuration: number
  gracePeriodDays: number
  expiryReminderDays: number
  sendExpiryReminders: boolean
  allowMultipleClubs: boolean
  requireCertificationUpload: boolean
  lastModifiedBy?: string
  createdAt: string
  updatedAt: string
}

export interface RevenueStats {
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  totalListings: number
  byPaymentMethod: Record<string, { count: number; amount: number }>
  byDuration: Record<string, { count: number; amount: number }>
}

class CoachService {
  // Coach CRUD operations
  async getCoaches(params?: {
    status?: string
    listingStatus?: string
    clubId?: string
    itfLevel?: string
  }): Promise<Coach[]> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.listingStatus) queryParams.append('listingStatus', params.listingStatus)
    if (params?.clubId) queryParams.append('clubId', params.clubId)
    if (params?.itfLevel) queryParams.append('itfLevel', params.itfLevel)

    const url = `/coaches${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiFetch(url)
    return response.data
  }

  async getActiveCoaches(): Promise<Coach[]> {
    const response = await apiFetch('/coaches/active')
    return response.data
  }

  async getCoach(id: string): Promise<CoachWithHistory> {
    const response = await apiFetch(`/coaches/${id}`)
    return response.data
  }

  async createCoach(coachData: Partial<Coach>): Promise<Coach> {
    const response = await apiFetch('/coaches', {
      method: 'POST',
      body: JSON.stringify(coachData)
    })
    return response.data
  }

  async updateCoach(id: string, coachData: Partial<Coach>): Promise<Coach> {
    const response = await apiFetch(`/coaches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(coachData)
    })
    return response.data
  }

  async deleteCoach(id: string): Promise<void> {
    await apiFetch(`/coaches/${id}`, {
      method: 'DELETE'
    })
  }

  async verifyClubAssociation(
    id: string,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<Coach> {
    const response = await apiFetch(`/coaches/${id}/verify-club`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason })
    })
    return response.data
  }

  async updateListingStatus(
    id: string,
    listingStatus: 'pending' | 'active' | 'suspended' | 'expired'
  ): Promise<Coach> {
    const response = await apiFetch(`/coaches/${id}/listing-status`, {
      method: 'PUT',
      body: JSON.stringify({ listingStatus })
    })
    return response.data
  }

  async getCoachesExpiringSoon(days?: number): Promise<Coach[]> {
    const url = `/coaches/expiring-soon${days ? `?days=${days}` : ''}`
    const response = await apiFetch(url)
    return response.data
  }

  async getExpiredCoaches(): Promise<Coach[]> {
    const response = await apiFetch('/coaches/expired')
    return response.data
  }

  // Coach Listing operations
  async getCoachListings(params?: {
    coachId?: string
    paymentStatus?: string
  }): Promise<CoachListing[]> {
    const queryParams = new URLSearchParams()
    if (params?.coachId) queryParams.append('coachId', params.coachId)
    if (params?.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus)

    const url = `/coach-listings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiFetch(url)
    return response.data
  }

  async getCoachListing(id: string): Promise<CoachListing> {
    const response = await apiFetch(`/coach-listings/${id}`)
    return response.data
  }

  async getCoachListingsByCoach(coachId: string): Promise<CoachListing[]> {
    const response = await apiFetch(`/coach-listings/coach/${coachId}`)
    return response.data
  }

  async createCoachListing(listingData: {
    coachId: string
    amount: number
    duration: number
    paymentMethod: string
    transactionReference?: string
    paymentDate?: Date
    notes?: string
  }): Promise<CoachListing> {
    const response = await apiFetch('/coach-listings', {
      method: 'POST',
      body: JSON.stringify(listingData)
    })
    return response.data
  }

  async refundCoachListing(
    id: string,
    refundData: {
      refundAmount?: number
      refundReason: string
    }
  ): Promise<CoachListing> {
    const response = await apiFetch(`/coach-listings/${id}/refund`, {
      method: 'PUT',
      body: JSON.stringify(refundData)
    })
    return response.data
  }

  // Settings operations
  async getListingSettings(): Promise<CoachListingSettings> {
    const response = await apiFetch('/coach-listings/settings')
    return response.data
  }

  async updateListingSettings(
    settings: Partial<CoachListingSettings>
  ): Promise<CoachListingSettings> {
    const response = await apiFetch('/coach-listings/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    return response.data
  }

  async getPricingPlans(): Promise<PricingPlan[]> {
    const response = await apiFetch('/coach-listings/pricing')
    return response.data
  }

  // Statistics
  async getRevenueStats(params?: {
    startDate?: string
    endDate?: string
  }): Promise<RevenueStats> {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)

    const url = `/coach-listings/stats/revenue${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiFetch(url)
    return response.data
  }
}

export const coachService = new CoachService()
