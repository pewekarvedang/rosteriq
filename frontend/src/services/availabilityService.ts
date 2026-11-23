import apiClient from './api';
import { EmployeeAvailability, EmployeeAvailabilityCreate, EmployeeAvailabilityUpdate } from '../types';

export const availabilityService = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    employee_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<EmployeeAvailability[]> => {
    const response = await apiClient.get<EmployeeAvailability[]>('/employee-availability', { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmployeeAvailability> => {
    const response = await apiClient.get<EmployeeAvailability>(`/employee-availability/${id}`);
    return response.data;
  },

  create: async (data: EmployeeAvailabilityCreate): Promise<EmployeeAvailability> => {
    const response = await apiClient.post<EmployeeAvailability>('/employee-availability', data);
    return response.data;
  },

  update: async (id: number, data: EmployeeAvailabilityUpdate): Promise<EmployeeAvailability> => {
    const response = await apiClient.put<EmployeeAvailability>(`/employee-availability/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/employee-availability/${id}`);
  },
};
