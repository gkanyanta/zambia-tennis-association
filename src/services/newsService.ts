import { apiFetch, uploadFile } from './api';

export interface NewsArticle {
  _id?: string;
  title: string;
  excerpt: string;
  content?: string;
  author: string;
  category: string;
  imageUrl?: string;
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

  async createNews(data: Partial<NewsArticle>, image?: File): Promise<NewsArticle> {
    let imageUrl = data.imageUrl;

    // Upload image if provided
    if (image) {
      console.log('Attempting to upload image for news article...');
      try {
        const uploadResponse = await uploadFile(image);
        console.log('Image uploaded successfully:', uploadResponse);
        imageUrl = `http://localhost:5000${uploadResponse.data.path}`;
      } catch (uploadError: any) {
        console.error('Image upload failed:', uploadError);
        // Throw error instead of silently continuing - user should know upload failed
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    }

    const response = await apiFetch('/news', {
      method: 'POST',
      body: JSON.stringify({ ...data, imageUrl }),
    });
    return response.data;
  },

  async updateNews(id: string, data: Partial<NewsArticle>, image?: File): Promise<NewsArticle> {
    let imageUrl = data.imageUrl;

    // Upload image if provided
    if (image) {
      console.log('Attempting to upload new image for article update...');
      try {
        const uploadResponse = await uploadFile(image);
        console.log('Image uploaded successfully:', uploadResponse);
        imageUrl = `http://localhost:5000${uploadResponse.data.path}`;
      } catch (uploadError: any) {
        console.error('Image upload failed:', uploadError);
        // Throw error instead of silently continuing
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    }

    const response = await apiFetch(`/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, imageUrl }),
    });
    return response.data;
  },

  async deleteNews(id: string): Promise<void> {
    await apiFetch(`/news/${id}`, {
      method: 'DELETE',
    });
  }
};
