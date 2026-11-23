import apiClient from './api';
import { PublicHoliday, PublicHolidayCreate, PublicHolidayUpdate } from '../types';

export const holidayService = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    year?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<PublicHoliday[]> => {
    const response = await apiClient.get<PublicHoliday[]>('/public-holidays', { params });
    return response.data;
  },

  getById: async (id: number): Promise<PublicHoliday> => {
    const response = await apiClient.get<PublicHoliday>(`/public-holidays/${id}`);
    return response.data;
  },

  create: async (data: PublicHolidayCreate): Promise<PublicHoliday> => {
    const response = await apiClient.post<PublicHoliday>('/public-holidays', data);
    return response.data;
  },

  update: async (id: number, data: PublicHolidayUpdate): Promise<PublicHoliday> => {
    const response = await apiClient.put<PublicHoliday>(`/public-holidays/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/public-holidays/${id}`);
  },
};
