import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, Expense, ExpenseStatus, CreateExpenseDto, ExpenseQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get my expenses (Employee)
 */
export const useMyExpenses = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.expenses.myExpenses(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; expenses: Expense[] }>(API_ENDPOINTS.EXPENSES.MY_EXPENSES);
      return data.expenses || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get all expenses (Admin/HR)
 */
export const useAllExpenses = (params?: ExpenseQueryParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.expenses.allExpenses(params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.EXPENSES.ALL_EXPENSES, params as any);
      const { data } = await axiosInstance.get<{ success: boolean; expenses: Expense[] }>(endpoint);
      return data.expenses || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit a new expense request
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData: CreateExpenseDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Expense>>(API_ENDPOINTS.EXPENSES.REQUEST, expenseData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.myExpenses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.allExpenses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Update expense status (Admin/HR)
 */
export const useUpdateExpenseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, reviewComment }: { id: string; status: ExpenseStatus; reviewComment?: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<Expense>>(
        API_ENDPOINTS.EXPENSES.UPDATE_STATUS(id),
        { status, reviewComment }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Bulk update expense statuses (Admin/HR)
 */
export const useBulkUpdateExpenseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status, reviewComment }: { ids: string[]; status: ExpenseStatus; reviewComment?: string }) => {
      const { data } = await axiosInstance.post<{ success: boolean; message: string; updatedCount: number }>(
        API_ENDPOINTS.EXPENSES.BULK_UPDATE,
        { ids, status, reviewComment }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
