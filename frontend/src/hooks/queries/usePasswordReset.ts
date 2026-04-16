import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, PasswordResetRequest, PasswordResetQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all password reset requests (Admin only)
 */
export const usePasswordResetRequests = (options?: { params?: PasswordResetQueryParams; enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.passwordReset.requests(options?.params),
    queryFn: async () => {
      // Backend returns { success, data: { count, requests } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.PASSWORD_RESET.REQUESTS, (options?.params || {}) as Record<string, string | number | boolean>);
      const { data } = await axiosInstance.get<ApiResponse<{ requests: PasswordResetRequest[] }>>(endpoint);
      return data.data?.requests || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Approve password reset request (Admin only)
 */
export const useApprovePasswordReset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data } = await axiosInstance.put<ApiResponse>(
        API_ENDPOINTS.PASSWORD_RESET.APPROVE(requestId)
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passwordReset.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Reject password reset request (Admin only)
 */
export const useRejectPasswordReset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const { data } = await axiosInstance.put<ApiResponse>(
        API_ENDPOINTS.PASSWORD_RESET.REJECT(requestId),
        { remarks: reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passwordReset.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
