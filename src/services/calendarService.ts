import { apiFetch } from './api';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: 'tournament' | 'league' | 'education' | 'meeting' | 'social' | 'other';
  published: boolean;
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventData {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: CalendarEvent['type'];
  published?: boolean;
}

export const calendarService = {
  // Get all published events (public)
  async getEvents(options?: { upcoming?: boolean; type?: string; limit?: number }): Promise<CalendarEvent[]> {
    const params = new URLSearchParams();
    if (options?.upcoming) params.append('upcoming', 'true');
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/calendar?${queryString}` : '/calendar';

    const response = await apiFetch(url);
    return response.data;
  },

  // Get all events including unpublished (admin)
  async getAdminEvents(): Promise<CalendarEvent[]> {
    const response = await apiFetch('/calendar/admin/all');
    return response.data;
  },

  // Get single event
  async getEvent(id: string): Promise<CalendarEvent> {
    const response = await apiFetch(`/calendar/${id}`);
    return response.data;
  },

  // Create event (admin)
  async createEvent(data: CreateCalendarEventData): Promise<CalendarEvent> {
    const response = await apiFetch('/calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Update event (admin)
  async updateEvent(id: string, data: Partial<CreateCalendarEventData>): Promise<CalendarEvent> {
    const response = await apiFetch(`/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete event (admin)
  async deleteEvent(id: string): Promise<void> {
    await apiFetch(`/calendar/${id}`, {
      method: 'DELETE',
    });
  },
};
