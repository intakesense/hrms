/**
 * Query Key Factory
 * Simplified structure for easier debugging and maintenance
 *
 * Pattern: ['resource', 'action', ...params]
 * Example: ['employees', 'list', { page: 1 }]
 */

import type {
  AttendanceQueryParams,
  EmployeeQueryParams,
  SalaryStructureQueryParams,
  SalarySlipQueryParams,
  AnnouncementQueryParams,
  PolicyQueryParams,
  OfficeLocationQueryParams,
  HelpInquiryQueryParams,
  TaskReportQueryParams,
  PasswordResetQueryParams,
  WFHRequestQueryParams,
  ExpenseQueryParams,
} from '@/types';

export const queryKeys = {
  // Authentication
  auth: {
    all: () => ['auth'] as const,
    profile: () => ['auth', 'profile'] as const,
  },

  // Employees
  employees: {
    all: () => ['employees'] as const,
    list: (params?: EmployeeQueryParams) => ['employees', 'list', params] as const,
    detail: (id: string) => ['employees', 'detail', id] as const,
    withoutStructure: () => ['employees', 'without-structure'] as const,
  },

  // Attendance
  attendance: {
    all: () => ['attendance'] as const,
    records: (params?: AttendanceQueryParams) => ['attendance', 'records', params] as const,
    myRecords: (params?: AttendanceQueryParams) => ['attendance', 'my-records', params] as const,
    today: () => ['attendance', 'today'] as const,
    todayWithAbsents: () => ['attendance', 'today-with-absents'] as const,
    adminRange: (startDate: string, endDate: string, options?: AttendanceQueryParams) =>
      ['attendance', 'admin-range', startDate, endDate, options] as const,
    employeeWithAbsents: (params?: AttendanceQueryParams) =>
      ['attendance', 'employee-with-absents', params] as const,
    missingCheckouts: () => ['attendance', 'missing-checkouts'] as const,
  },

  // Leaves
  leaves: {
    all: () => ['leaves'] as const,
    myLeaves: () => ['leaves', 'my-leaves'] as const,
    allLeaves: () => ['leaves', 'all-leaves'] as const,
  },

  // Expenses
  expenses: {
    all: () => ['expenses'] as const,
    myExpenses: () => ['expenses', 'my-expenses'] as const,
    allExpenses: (params?: ExpenseQueryParams) => ['expenses', 'all-expenses', params] as const,
  },

  // WFH Requests
  wfh: {
    all: () => ['wfh'] as const,
    my: () => ['wfh', 'my'] as const,
    list: (params?: WFHRequestQueryParams) => ['wfh', 'list', params] as const,
  },

  // Regularization
  regularizations: {
    all: () => ['regularizations'] as const,
    my: () => ['regularizations', 'my'] as const,
    allRequests: () => ['regularizations', 'all-requests'] as const,
  },

  // Holidays
  holidays: {
    all: () => ['holidays'] as const,
    list: () => ['holidays', 'list'] as const,
    detail: (id: string) => ['holidays', 'detail', id] as const,
  },

  // Announcements
  announcements: {
    all: () => ['announcements'] as const,
    list: (params?: AnnouncementQueryParams) => ['announcements', 'list', params] as const,
    detail: (id: string) => ['announcements', 'detail', id] as const,
  },

  // Office Locations
  officeLocations: {
    all: () => ['office-locations'] as const,
    list: (params?: OfficeLocationQueryParams) => ['office-locations', 'list', params] as const,
    active: () => ['office-locations', 'active'] as const,
  },

  // Dashboard
  dashboard: {
    all: () => ['dashboard'] as const,
    adminSummary: () => ['dashboard', 'admin-summary'] as const,
    alerts: () => ['dashboard', 'alerts'] as const,
  },

  // Activity Feed
  activity: {
    all: () => ['activity'] as const,
    feed: () => ['activity', 'feed'] as const,
  },

  // Help/Support
  help: {
    all: () => ['help'] as const,
    myInquiries: () => ['help', 'my-inquiries'] as const,
    allInquiries: (filters?: HelpInquiryQueryParams) => ['help', 'all-inquiries', filters] as const,
  },

  // Users
  users: {
    all: () => ['users'] as const,
    list: () => ['users', 'list'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    missingEmployees: () => ['users', 'missing-employees'] as const,
  },

  // Task Reports
  taskReports: {
    all: () => ['task-reports'] as const,
    list: (params?: TaskReportQueryParams) => ['task-reports', 'list', params] as const,
    my: (params?: TaskReportQueryParams) => ['task-reports', 'my', params] as const,
  },

  // Documents
  documents: {
    all: () => ['documents'] as const,
    byEmployee: (employeeId: string) => ['documents', 'by-employee', employeeId] as const,
  },

  // Salary Slips
  salarySlips: {
    all: () => ['salary-slips'] as const,
    list: (params?: SalarySlipQueryParams) => ['salary-slips', 'list', params] as const,
    byEmployee: (employeeId: string, params?: SalarySlipQueryParams) =>
      ['salary-slips', 'by-employee', employeeId, params] as const,
    byEmployeeMonthYear: (employeeId: string, month: number, year: number) =>
      ['salary-slips', employeeId, month, year] as const,
    taxCalculation: (grossSalary: number, taxRegime: string) =>
      ['salary-slips', 'tax-calculation', grossSalary, taxRegime] as const,
  },

  // Salary Structures
  salaryStructures: {
    all: () => ['salary-structures'] as const,
    list: (params?: SalaryStructureQueryParams) => ['salary-structures', 'list', params] as const,
    byEmployee: (employeeId: string) => ['salary-structures', employeeId] as const,
    statistics: () => ['salary-structures', 'statistics'] as const,
  },

  // Policies
  policies: {
    all: () => ['policies'] as const,
    list: (params?: PolicyQueryParams) => ['policies', 'list', params] as const,
    active: (params?: PolicyQueryParams) => ['policies', 'active', params] as const,
    detail: (id: string) => ['policies', 'detail', id] as const,
    statistics: () => ['policies', 'statistics'] as const,
  },

  // Settings
  settings: {
    all: () => ['settings'] as const,
    global: () => ['settings', 'global'] as const,
    department: (department: string) => ['settings', 'department', department] as const,
    effective: (department?: string) => ['settings', 'effective', department] as const,
    departments: () => ['settings', 'departments'] as const,
    departmentStats: () => ['settings', 'department-stats'] as const,
  },

  // Password Reset
  passwordReset: {
    all: () => ['password-reset'] as const,
    requests: (params?: PasswordResetQueryParams) => ['password-reset', 'requests', params] as const,
  },

  // Notifications
  notifications: {
    all: () => ['notifications'] as const,
    status: () => ['notifications', 'status'] as const,
    vapidKey: () => ['notifications', 'vapid-key'] as const,
  },

  // Gift Game / Tetris (Christmas feature)
  giftGame: {
    all: () => ['gift-game'] as const,
    leaderboard: (params?: { limit?: number; period?: string }) => ['gift-game', 'leaderboard', params] as const,
  },
} as const;
