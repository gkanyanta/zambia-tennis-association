import { apiFetch } from '@/services/api'

export interface Settings {
  _id: string
  membershipFees: {
    junior: number
    adult: number
    international: number
  }
  clubAffiliationFee: number
  membershipValidityDays: number
  gracePeriodDays: number
  autoUpdateStatus: {
    enabled: boolean
    scheduleTime: string
  }
  organizationName: string
  currency: string
  lastUpdatedBy?: {
    _id: string
    firstName: string
    lastName: string
  }
  updatedAt: string
}

export interface MembershipFees {
  membershipFees: {
    junior: number
    adult: number
    international: number
  }
  clubAffiliationFee: number
  currency: string
}

class SettingsService {
  // Get all settings
  async getSettings(): Promise<Settings> {
    const response = await apiFetch('/settings')
    return response.data
  }

  // Update settings
  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const response = await apiFetch('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    return response.data
  }

  // Get membership fees (public)
  async getMembershipFees(): Promise<MembershipFees> {
    const response = await apiFetch('/settings/fees')
    return response.data
  }

  // Manually trigger status update
  async triggerStatusUpdate(): Promise<{
    success: boolean
    playersUpdated: number
    clubsUpdated: number
    timestamp: string
  }> {
    const response = await apiFetch('/settings/update-status', {
      method: 'POST'
    })
    return response.data
  }
}

export const settingsService = new SettingsService()
