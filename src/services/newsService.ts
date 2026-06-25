import { apiFetch, uploadFile, uploadVideo } from './api';

// News service for managing articles
export interface NewsArticle {
  _id?: string;
  title: string;
  excerpt: string;
  content?: string;
  author: string;
  category: string;
  imageUrl?: string;
  videoUrl?: string;
  published: boolean;
  views?: number;
  createdAt?: string;
}

export const newsService = {
  async getNews(): Promise<NewsArticle[]> {
    const response = await apiFetch('/news');
    return response.data;
  },

  async getNewsById(id: string): Promise<NewsArticle> {
    const response = await apiFetch(`/news/${id}`);
    return response.data;
  },

  async createNews(data: Partial<NewsArticle>, image?: File, video?: File): Promise<NewsArticle> {
    let imageUrl = data.imageUrl;
    let videoUrl = data.videoUrl;

    if (image) {
      try {
        const uploadResponse = await uploadFile(image);
        imageUrl = uploadResponse.data.url || uploadResponse.data.path;
      } catch (uploadError: any) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    }

    if (video) {
      try {
        const uploadResponse = await uploadVideo(video);
        videoUrl = uploadResponse.data.url || uploadResponse.data.path;
      } catch (uploadError: any) {
        throw new Error(`Video upload failed: ${uploadError.message}`);
      }
    }

    const response = await apiFetch('/news', {
      method: 'POST',
      body: JSON.stringify({ ...data, imageUrl, videoUrl }),
    });
    return response.data;
  },

  async updateNews(id: string, data: Partial<NewsArticle>, image?: File, video?: File): Promise<NewsArticle> {
    let imageUrl = data.imageUrl;
    let videoUrl = data.videoUrl;

    if (image) {
      try {
        const uploadResponse = await uploadFile(image);
        imageUrl = uploadResponse.data.url || uploadResponse.data.path;
      } catch (uploadError: any) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    }

    if (video) {
      try {
        const uploadResponse = await uploadVideo(video);
        videoUrl = uploadResponse.data.url || uploadResponse.data.path;
      } catch (uploadError: any) {
        throw new Error(`Video upload failed: ${uploadError.message}`);
      }
    }

    const response = await apiFetch(`/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, imageUrl, videoUrl }),
    });
    return response.data;
  },

  async deleteNews(id: string): Promise<void> {
    await apiFetch(`/news/${id}`, {
      method: 'DELETE',
    });
  }
};
