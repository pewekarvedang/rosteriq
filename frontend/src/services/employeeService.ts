import apiClient from './api';
import { Employee, EmployeeCreate, EmployeeUpdate } from '../types';

export const employeeService = {
  getAll: async (params?: { skip?: number; limit?: number; pod_id?: number; is_active?: boolean }): Promise<Employee[]> => {
    const response = await apiClient.get<Employee[]>('/employees', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Employee> => {
    const response = await apiClient.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  create: async (data: EmployeeCreate): Promise<Employee> => {
    const response = await apiClient.post<Employee>('/employees', data);
    return response.data;
  },

  update: async (id: number, data: EmployeeUpdate): Promise<Employee> => {
    const response = await apiClient.put<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/employees/${id}`);
  },
};
