import apiClient from './api';
import { EmployeeAssignment, EmployeeAssignmentCreate, EmployeeAssignmentUpdate } from '../types';

export const assignmentService = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    employee_id?: number;
    brand_id?: number;
    process_id?: number;
    is_active?: boolean;
  }): Promise<EmployeeAssignment[]> => {
    const response = await apiClient.get<EmployeeAssignment[]>('/employee-assignments', { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmployeeAssignment> => {
    const response = await apiClient.get<EmployeeAssignment>(`/employee-assignments/${id}`);
    return response.data;
  },

  create: async (data: EmployeeAssignmentCreate): Promise<EmployeeAssignment> => {
    const response = await apiClient.post<EmployeeAssignment>('/employee-assignments', data);
    return response.data;
  },

  update: async (id: number, data: EmployeeAssignmentUpdate): Promise<EmployeeAssignment> => {
    const response = await apiClient.put<EmployeeAssignment>(`/employee-assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/employee-assignments/${id}`);
  },
};
