import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, HelpInquiry, CreateHelpInquiryDto, UpdateHelpInquiryDto, HelpInquiryQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all help inquiries (Admin/HR)
 */
export const useAllHelpInquiries = (options?: { params?: HelpInquiryQueryParams; enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.help.allInquiries(options?.params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.HELP.ALL_INQUIRIES, (options?.params || {}) as Record<string, string | number | boolean>);
      const { data } = await axiosInstance.get<ApiResponse<{ inquiries: HelpInquiry[] }>>(endpoint);
      return data.data?.inquiries || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get my help inquiries (Employee)
 */
export const useMyHelpInquiries = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.help.myInquiries(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ inquiries: HelpInquiry[] }>>(API_ENDPOINTS.HELP.MY_INQUIRIES);
      return data.data?.inquiries || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit help inquiry
 */
export const useSubmitHelpInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiryData: CreateHelpInquiryDto) => {
      const { data } = await axiosInstance.post<ApiResponse<HelpInquiry>>(
        API_ENDPOINTS.HELP.SUBMIT,
        inquiryData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.help.all() });
    },
  });
};

/**
 * Update help inquiry (Admin/HR - usually to resolve/respond)
 */
export const useUpdateHelpInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateHelpInquiryDto & { id: string }) => {
      const { data } = await axiosInstance.patch<ApiResponse<HelpInquiry>>(
        API_ENDPOINTS.HELP.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.help.all() });
    },
  });
};
