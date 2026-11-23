import apiClient from './api';
import { SchedulingConflict } from '../types';

export const conflictService = {
  getAll: async (params?: {
    roster_id?: number;
    is_resolved?: boolean;
    severity?: string;
  }): Promise<SchedulingConflict[]> => {
    const response = await apiClient.get<SchedulingConflict[]>('/conflicts', { params });
    return response.data;
  },

  resolve: async (id: number, is_resolved: boolean = true): Promise<SchedulingConflict> => {
    const response = await apiClient.put<SchedulingConflict>(`/conflicts/${id}/resolve`, {
      is_resolved,
    });
    return response.data;
  },
};
