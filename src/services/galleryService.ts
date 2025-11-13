import { apiFetch, uploadFile } from './api';

export interface GalleryImage {
  _id?: string;
  title: string;
  description?: string;
  imageUrl: string;
  category: string;
  isSlideshow: boolean;
  order: number;
  date?: string;
  createdAt?: string;
}

export const galleryService = {
  async getGalleryImages(isSlideshow?: boolean): Promise<GalleryImage[]> {
    const params = new URLSearchParams();
    if (isSlideshow !== undefined) {
      params.append('isSlideshow', isSlideshow.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiFetch(`/gallery${query}`);
    return response.data;
  },

  async getImagesByCategory(category: string): Promise<GalleryImage[]> {
    const response = await apiFetch(`/gallery?category=${category}`);
    return response.data;
  },

  async getImageById(id: string): Promise<GalleryImage> {
    const response = await apiFetch(`/gallery/${id}`);
    return response.data;
  },

  async createImage(data: Partial<GalleryImage>, image: File): Promise<GalleryImage> {
    console.log('Uploading gallery image...');

    // Upload image first
    const uploadResponse = await uploadFile(image);
    const imageUrl = `http://localhost:5000${uploadResponse.data.path}`;

    // Create gallery entry
    const response = await apiFetch('/gallery', {
      method: 'POST',
      body: JSON.stringify({ ...data, imageUrl }),
    });
    return response.data;
  },

  async updateImage(id: string, data: Partial<GalleryImage>, image?: File): Promise<GalleryImage> {
    let imageUrl = data.imageUrl;

    // Upload new image if provided
    if (image) {
      console.log('Uploading new gallery image...');
      const uploadResponse = await uploadFile(image);
      imageUrl = `http://localhost:5000${uploadResponse.data.path}`;
    }

    const response = await apiFetch(`/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, imageUrl }),
    });
    return response.data;
  },

  async deleteImage(id: string): Promise<void> {
    await apiFetch(`/gallery/${id}`, {
      method: 'DELETE',
    });
  }
};
