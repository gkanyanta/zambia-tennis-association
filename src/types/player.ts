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

export interface Club {
  id: number
  name: string
  province: string
  city: string
  address: string
  email: string
  phone: string
  president: string
  secretary: string
  numberOfCourts: number
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
