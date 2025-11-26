import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface UploadResponse {
  success: boolean
  data: {
    filename: string
    path: string
    url: string
    size: number
  }
}

class UploadService {
  async uploadImage(file: File): Promise<string> {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('image', file)

    const response = await axios.post<UploadResponse>(
      `${API_URL}/upload`,
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
