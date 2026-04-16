import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, Leave, LeaveRequestDto, LeaveStatus } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface PreviewLeaveDaysResult {
  workingDays: number;
  excludedDays: number;
  breakdown: {
    sundays: number;
    saturdayHolidays: number;
    holidays: number;
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get my leaves (Employee)
 */
export const useMyLeaves = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.leaves.myLeaves(),
    queryFn: async () => {
      // Backend returns { success, leaves: Leave[] }
      const { data } = await axiosInstance.get<{ success: boolean; leaves: Leave[] }>(API_ENDPOINTS.LEAVES.MY_LEAVES);
      return data.leaves || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get all leaves (Admin/HR)
 */
export const useAllLeaves = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.leaves.allLeaves(),
    queryFn: async () => {
      // Backend returns { success, leaves: Leave[] }
      const { data } = await axiosInstance.get<{ success: boolean; leaves: Leave[] }>(API_ENDPOINTS.LEAVES.ALL_LEAVES);
      return data.leaves || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Preview leave days — fetches working day count for a date range
 */
export const usePreviewLeaveDays = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['leaves', 'preview-days', startDate, endDate] as const,
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.LEAVES.PREVIEW_DAYS, {
        startDate,
        endDate,
      });
      const { data } = await axiosInstance.get<{ success: boolean } & PreviewLeaveDaysResult>(endpoint);
      return data;
    },
    enabled: !!startDate && !!endDate && startDate <= endDate,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request leave
 */
export const useRequestLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaveData: LeaveRequestDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Leave>>(API_ENDPOINTS.LEAVES.REQUEST, leaveData);
      return data.data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (leaveData) => {
      const myLeavesKey = queryKeys.leaves.myLeaves();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: myLeavesKey });

      // Snapshot previous value for rollback
      const previousLeaves = queryClient.getQueryData(myLeavesKey);

      // Optimistically add new leave
      queryClient.setQueryData(myLeavesKey, (old: Leave[] = []) => [
        {
          _id: 'optimistic-' + Date.now(),
          employee: '',
          employeeName: '',
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          reason: leaveData.reason,
          status: 'pending',
          numberOfDays: leaveData.leaveMode === 'multi' ? 0 : (leaveData.leaveType === 'half-day' ? 0.5 : 1),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Leave,
        ...old,
      ]);

      return { previousLeaves, myLeavesKey };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousLeaves) {
        queryClient.setQueryData(context.myLeavesKey, context.previousLeaves);
      }
    },
    // Refetch on success to get actual data from server
    onSuccess: () => {
      // Immediately refetch to replace optimistic data with real data
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.myLeaves() });
      // Also invalidate all leaves for admin dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.allLeaves() });
    },
    // Refetch to ensure consistency
    onSettled: () => {
      // Invalidate all leave queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });

      // Invalidate dashboard (shows pending leaves count)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Update leave status (Admin/HR)
 */
export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaveId, status }: { leaveId: string; status: LeaveStatus }) => {
      const { data } = await axiosInstance.put<ApiResponse<Leave>>(
        API_ENDPOINTS.LEAVES.UPDATE_STATUS(leaveId),
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all leave queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });

      // Invalidate attendance (approved leaves affect attendance)
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
