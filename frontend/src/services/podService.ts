import apiClient from './api';
import { Pod, PodCreate, PodUpdate } from '../types';

export const podService = {
  getAll: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<Pod[]> => {
    const response = await apiClient.get<Pod[]>('/pods', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Pod> => {
    const response = await apiClient.get<Pod>(`/pods/${id}`);
    return response.data;
  },

  create: async (data: PodCreate): Promise<Pod> => {
    const response = await apiClient.post<Pod>('/pods', data);
    return response.data;
  },

  update: async (id: number, data: PodUpdate): Promise<Pod> => {
    const response = await apiClient.put<Pod>(`/pods/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/pods/${id}`);
  },
};
