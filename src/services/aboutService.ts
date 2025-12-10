import apiClient from './apiClient';

// TypeScript Interfaces
export interface ExecutiveMember {
  _id: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
  profileImage: string;
  bio?: string;
  displayOrder: number;
  region: 'national' | 'northern' | 'southern';
  isActive: boolean;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Affiliation {
  _id: string;
  name: string;
  acronym: string;
  description?: string;
  logo: string;
  websiteUrl: string;
  category: 'international' | 'continental' | 'national';
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AboutContent {
  _id: string;
  section: 'mission' | 'vision' | 'history' | 'objectives' | 'about';
  title: string;
  content: string;
  lastUpdatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Executive Members API
const EXECUTIVE_MEMBERS_URL = '/api/executive-members';

export const fetchExecutiveMembers = async (params?: {
  isActive?: boolean;
  region?: 'national' | 'northern' | 'southern';
}): Promise<{ success: boolean; count: number; data: ExecutiveMember[] }> => {
  const response = await apiClient.get(EXECUTIVE_MEMBERS_URL, { params });
  return response.data;
};

export const fetchExecutiveMember = async (
  id: string
): Promise<{ success: boolean; data: ExecutiveMember }> => {
  const response = await apiClient.get(`${EXECUTIVE_MEMBERS_URL}/${id}`);
  return response.data;
};

export const createExecutiveMember = async (
  data: Partial<ExecutiveMember>
): Promise<{ success: boolean; data: ExecutiveMember }> => {
  const response = await apiClient.post(EXECUTIVE_MEMBERS_URL, data);
  return response.data;
};

export const updateExecutiveMember = async (
  id: string,
  data: Partial<ExecutiveMember>
): Promise<{ success: boolean; data: ExecutiveMember }> => {
  const response = await apiClient.put(`${EXECUTIVE_MEMBERS_URL}/${id}`, data);
  return response.data;
};

export const deleteExecutiveMember = async (
  id: string
): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`${EXECUTIVE_MEMBERS_URL}/${id}`);
  return response.data;
};

export const reorderExecutiveMembers = async (
  orders: { id: string; displayOrder: number }[]
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.patch(`${EXECUTIVE_MEMBERS_URL}/reorder`, { orders });
  return response.data;
};

// Affiliations API
const AFFILIATIONS_URL = '/api/affiliations';

export const fetchAffiliations = async (params?: {
  isActive?: boolean;
  category?: 'international' | 'continental' | 'national';
}): Promise<{ success: boolean; count: number; data: Affiliation[] }> => {
  const response = await apiClient.get(AFFILIATIONS_URL, { params });
  return response.data;
};

export const fetchAffiliation = async (
  id: string
): Promise<{ success: boolean; data: Affiliation }> => {
  const response = await apiClient.get(`${AFFILIATIONS_URL}/${id}`);
  return response.data;
};

export const createAffiliation = async (
  data: Partial<Affiliation>
): Promise<{ success: boolean; data: Affiliation }> => {
  const response = await apiClient.post(AFFILIATIONS_URL, data);
  return response.data;
};

export const updateAffiliation = async (
  id: string,
  data: Partial<Affiliation>
): Promise<{ success: boolean; data: Affiliation }> => {
  const response = await apiClient.put(`${AFFILIATIONS_URL}/${id}`, data);
  return response.data;
};

export const deleteAffiliation = async (
  id: string
): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`${AFFILIATIONS_URL}/${id}`);
  return response.data;
};

export const reorderAffiliations = async (
  orders: { id: string; displayOrder: number }[]
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.patch(`${AFFILIATIONS_URL}/reorder`, { orders });
  return response.data;
};

// About Content API
const ABOUT_CONTENT_URL = '/api/about-content';

export const fetchAboutContent = async (
  section?: string
): Promise<{ success: boolean; count: number; data: AboutContent[] }> => {
  const response = await apiClient.get(ABOUT_CONTENT_URL, {
    params: section ? { section } : undefined
  });
  return response.data;
};

export const fetchContentBySection = async (
  section: string
): Promise<{ success: boolean; data: AboutContent }> => {
  const response = await apiClient.get(`${ABOUT_CONTENT_URL}/${section}`);
  return response.data;
};

export const updateContentSection = async (
  section: string,
  data: { title: string; content: string }
): Promise<{ success: boolean; data: AboutContent }> => {
  const response = await apiClient.put(`${ABOUT_CONTENT_URL}/${section}`, data);
  return response.data;
};

export const deleteContentSection = async (
  section: string
): Promise<{ success: boolean; data: {} }> => {
  const response = await apiClient.delete(`${ABOUT_CONTENT_URL}/${section}`);
  return response.data;
};

// Image Upload API
export const uploadExecutiveMemberImage = async (
  file: File
): Promise<{ success: boolean; data: { url: string; filename: string; size: number } }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/api/upload/executive-member', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};

export const uploadAffiliationLogo = async (
  file: File
): Promise<{ success: boolean; data: { url: string; filename: string; size: number } }> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/api/upload/affiliation-logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};
