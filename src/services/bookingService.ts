import { apiFetch } from './api';

export interface Booking {
  _id?: string;
  user?: any;
  clubName: string;
  courtNumber: number;
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  duration: number;
  status: string;
  paymentStatus: string;
  amount: number;
  paymentId?: string;
  notes?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    const response = await apiFetch('/bookings');
    return response.data;
  },

  async getBooking(id: string): Promise<Booking> {
    const response = await apiFetch(`/bookings/${id}`);
    return response.data;
  },

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    const response = await apiFetch('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const response = await apiFetch(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async cancelBooking(id: string): Promise<Booking> {
    const response = await apiFetch(`/bookings/${id}/cancel`, {
      method: 'PUT',
    });
    return response.data;
  },

  async getAvailableSlots(clubName: string, courtNumber: number, date: string): Promise<TimeSlot[]> {
    const response = await apiFetch(`/bookings/available/${encodeURIComponent(clubName)}/${courtNumber}/${date}`);
    return response.data;
  }
};
