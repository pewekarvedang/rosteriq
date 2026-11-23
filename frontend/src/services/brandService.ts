import apiClient from './api';
import { Brand, BrandCreate, BrandUpdate, BrandProcess, BrandProcessCreate, BrandProcessUpdate } from '../types';

export const brandService = {
  getAll: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<Brand[]> => {
    const response = await apiClient.get<Brand[]>('/brands', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Brand> => {
    const response = await apiClient.get<Brand>(`/brands/${id}`);
    return response.data;
  },

  create: async (data: BrandCreate): Promise<Brand> => {
    const response = await apiClient.post<Brand>('/brands', data);
    return response.data;
  },

  update: async (id: number, data: BrandUpdate): Promise<Brand> => {
    const response = await apiClient.put<Brand>(`/brands/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/brands/${id}`);
  },

  // Brand-Processes
  getBrandProcesses: async (params?: { brand_id?: number; process_id?: number; is_active?: boolean }): Promise<BrandProcess[]> => {
    const response = await apiClient.get<BrandProcess[]>('/brand-processes', { params });
    return response.data;
  },

  createBrandProcess: async (data: BrandProcessCreate): Promise<BrandProcess> => {
    const response = await apiClient.post<BrandProcess>('/brand-processes', data);
    return response.data;
  },

  updateBrandProcess: async (id: number, data: BrandProcessUpdate): Promise<BrandProcess> => {
    const response = await apiClient.put<BrandProcess>(`/brand-processes/${id}`, data);
    return response.data;
  },

  deleteBrandProcess: async (id: number): Promise<void> => {
    await apiClient.delete(`/brand-processes/${id}`);
  },
};
