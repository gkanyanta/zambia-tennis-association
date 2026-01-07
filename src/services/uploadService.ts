import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface UploadResponse {
  success: boolean
  data: {
    filename: string
    path: string
    url: string
    size: number
  }
}

// Get auth token from localStorage
const getAuthToken = () => {
  const user = localStorage.getItem('user')
  if (user) {
    const userData = JSON.parse(user)
    return userData.token
  }
  return null
}

class UploadService {
  async uploadImage(file: File): Promise<string> {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('image', file)

    const response = await axios.post<UploadResponse>(
      `${API_URL}/api/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data.data.url
  }

  async uploadExecutiveMemberImage(file: File): Promise<string> {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('image', file)

    const response = await axios.post<UploadResponse>(
      `${API_URL}/api/upload/executive-member`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data.data.url
  }

  async uploadAffiliationLogo(file: File): Promise<string> {
    const token = getAuthToken()
    const formData = new FormData()
    formData.append('image', file)

    const response = await axios.post<UploadResponse>(
      `${API_URL}/api/upload/affiliation-logo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response.data.data.url
  }
}

export const uploadService = new UploadService()
