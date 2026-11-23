import apiClient from './api';
import {
  Roster,
  RosterDetail,
  RosterCreate,
  RosterAssignment,
  SchedulingConflict,
  MonthlyGenerationResponse,
} from '../types';

export const rosterService = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    year?: number;
    month?: number;
    roster_status?: string;
  }): Promise<Roster[]> => {
    const response = await apiClient.get<Roster[]>('/rosters', { params });
    return response.data;
  },

  getById: async (id: number): Promise<RosterDetail> => {
    const response = await apiClient.get<RosterDetail>(`/rosters/${id}`);
    return response.data;
  },

  createDraft: async (data: RosterCreate): Promise<Roster> => {
    const response = await apiClient.post<Roster>('/rosters', data);
    return response.data;
  },

  generateMonthly: async (
    month: number,
    year: number,
    preserveLockedAssignments: boolean = true,
    timeoutSeconds: number = 30.0
  ): Promise<MonthlyGenerationResponse> => {
    const response = await apiClient.post<MonthlyGenerationResponse>(
      '/rosters/generate-monthly',
      null,
      {
        params: {
          month,
          year,
          preserve_locked_assignments: preserveLockedAssignments,
          timeout_seconds: timeoutSeconds,
        },
      }
    );
    return response.data;
  },

  generate: async (rosterId: number): Promise<Roster> => {
    const response = await apiClient.post<Roster>(`/rosters/${rosterId}/generate`);
    return response.data;
  },

  validate: async (rosterId: number): Promise<{
    roster_id: number;
    is_valid: boolean;
    total_conflicts: number;
    conflicts: SchedulingConflict[];
  }> => {
    const response = await apiClient.post(`/rosters/${rosterId}/validate`);
    return response.data;
  },

  publish: async (rosterId: number): Promise<Roster> => {
    const response = await apiClient.post<Roster>(`/rosters/${rosterId}/publish`);
    return response.data;
  },

  branchNewVersion: async (rosterId: number, notes?: string): Promise<Roster> => {
    const response = await apiClient.post<Roster>(`/rosters/${rosterId}/new-version`, null, {
      params: { notes },
    });
    return response.data;
  },

  lockAssignment: async (assignmentId: number, isLocked: boolean): Promise<RosterAssignment> => {
    const response = await apiClient.put<RosterAssignment>(`/rosters/assignments/${assignmentId}/lock`, {
      is_locked: isLocked,
    });
    return response.data;
  },

  getConflicts: async (rosterId: number): Promise<SchedulingConflict[]> => {
    const response = await apiClient.get<SchedulingConflict[]>(`/rosters/${rosterId}/conflicts`);
    return response.data;
  },
};
