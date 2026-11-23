import apiClient from './api';
import { Shift, ShiftCreate, ShiftUpdate } from '../types';

export const shiftService = {
  getAll: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<Shift[]> => {
    const response = await apiClient.get<Shift[]>('/shifts', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Shift> => {
    const response = await apiClient.get<Shift>(`/shifts/${id}`);
    return response.data;
  },

  create: async (data: ShiftCreate): Promise<Shift> => {
    const response = await apiClient.post<Shift>('/shifts', data);
    return response.data;
  },

  update: async (id: number, data: ShiftUpdate): Promise<Shift> => {
    const response = await apiClient.put<Shift>(`/shifts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/shifts/${id}`);
  },
};
