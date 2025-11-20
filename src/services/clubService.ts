import { apiFetch } from '@/services/api'

export interface Club {
  _id: string
  name: string
  city?: string
  province?: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  established?: number
  description?: string
  logo?: string
  facilities?: string[]
  website?: string
  memberCount: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface ClubWithMembers extends Club {
  members?: any[]
}

class ClubService {
  async getClubs(): Promise<Club[]> {
    const response = await apiFetch('/clubs')
    return response.data
  }

  async getClub(id: string): Promise<ClubWithMembers> {
    const response = await apiFetch(`/clubs/${id}`)
    return response.data
  }

  async createClub(clubData: Partial<Club>): Promise<Club> {
    const response = await apiFetch('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData)
    })
    return response.data
  }

  async updateClub(id: string, clubData: Partial<Club>): Promise<Club> {
    const response = await apiFetch(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData)
    })
    return response.data
  }

  async deleteClub(id: string): Promise<void> {
    await apiFetch(`/clubs/${id}`, {
      method: 'DELETE'
    })
  }

  async updateMemberCount(id: string): Promise<Club> {
    const response = await apiFetch(`/clubs/${id}/update-count`, {
      method: 'PUT'
    })
    return response.data
  }
}

export const clubService = new ClubService()
