import apiClient from './api';
import { Process, ProcessCreate, ProcessUpdate } from '../types';

export const processService = {
  getAll: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<Process[]> => {
    const response = await apiClient.get<Process[]>('/processes', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Process> => {
    const response = await apiClient.get<Process>(`/processes/${id}`);
    return response.data;
  },

  create: async (data: ProcessCreate): Promise<Process> => {
    const response = await apiClient.post<Process>('/processes', data);
    return response.data;
  },

  update: async (id: number, data: ProcessUpdate): Promise<Process> => {
    const response = await apiClient.put<Process>(`/processes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/processes/${id}`);
  },
};
