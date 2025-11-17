export type Gender = 'male' | 'female'
export type PlayerCategory = 'junior' | 'senior' | 'madalas'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export interface ZPINPayment {
  id: number
  year: number
  amount: number
  paidDate?: string
  dueDate: string
  status: PaymentStatus
  receiptNumber?: string
}

export interface Player {
  id: number
  zpin: string // Zambia Player Identification Number
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: Gender
  category: PlayerCategory
  email: string
  phone: string
  clubId: number
  clubName: string
  province: string
  city: string
  nationalId?: string
  emergencyContact: string
  emergencyPhone: string
  registrationDate: string
  isActive: boolean
  zpinPayments: ZPINPayment[]
}

export type CourtType = 'Hard Court' | 'Clay' | 'Grass' | 'Synthetic Grass'
export type CourtCondition = 'Indoor' | 'Outdoor' | 'Lit'

export interface Court {
  id: number
  type: CourtType
  condition: CourtCondition[]
  isPlayable: boolean
  notes?: string
}

export interface ClubExecutive {
  chairman: string
  viceChairman?: string
  secretary: string
  treasurer?: string
  clubCaptain?: string
  committeeMembers?: { name: string; position: string }[]
}

export interface ClubFacilities {
  courts: Court[]
  totalCourts: number
  playableCourts: number
  amenities: string[] // e.g., 'Clubhouse', 'Pro Shop', 'Changing Rooms', 'Restaurant/Café', 'Parking', 'Practice Wall', 'Gym'
}

export interface Club {
  id: number
  name: string
  province: string
  city: string
  address: string
  email: string
  phone: string
  executives: ClubExecutive
  facilities: ClubFacilities
  numberOfMembers: number
  affiliationStatus: 'active' | 'inactive' | 'suspended'
  affiliationFees: AffiliationFee[]
  registrationDate: string
}

export interface AffiliationFee {
  id: number
  year: number
  amount: number
  paidDate?: string
  dueDate: string
  status: PaymentStatus
  receiptNumber?: string
}
