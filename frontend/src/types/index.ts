// Core Type Definitions for HRMS Application

// ============================================================================
// TYPE DEFINITIONS (Union Types - Better than Enums)
// ============================================================================

// User & Authentication
export type UserRole = 'admin' | 'hr' | 'employee';

// Attendance
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half-day'
  | 'leave'
  | 'holiday'
  | 'weekend'
  | 'wfh';

// Shared approval status for leaves, WFH, and regularizations
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type LeaveStatus = ApprovalStatus;
export type WFHStatus = ApprovalStatus;
export type RegularizationStatus = ApprovalStatus;

export type LeaveType = 'full-day' | 'half-day';

// Salary
export type SalarySlipStatus = 'draft' | 'finalized';

// Policies
export type PolicyStatus = 'active' | 'inactive' | 'archived';

// Help/Support
export type HelpInquiryStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

// ============================================================================
// USER & EMPLOYEE
// ============================================================================

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  fullName?: string; // Backend returns this from getEmployees
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  joiningDate?: string; // Backend uses this field name
  department?: string;
  designation?: string;
  position?: string;
  employeeId: string;
  status: 'active' | 'inactive';
  isActive?: boolean; // Backend uses this field for active status
  companyName?: string;
  employmentType?: string;
  // Direct bank fields from backend
  bankName?: string;
  bankAccountNumber?: string;
  bankIFSCCode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  // Direct fields from backend
  officeAddress?: string;
  reportingSupervisor?: string;
  paymentMode?: string;
  fatherPhone?: string;
  motherPhone?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  // Nested bank details (legacy/alternative format)
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    panNumber?: string;
  };
  // Address can be string (from Legacy/Form) or object
  address?: string | {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  officeLocation?: {
    address?: string;
  };
  reportingManager?: {
    name?: string;
    employeeId?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  govtId?: {
    aadhaar?: string;
    pan?: string;
  };
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ATTENDANCE
// ============================================================================

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt?: string;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  workHours?: number;
  tasks?: string[];
  location?: {
    checkIn?: Location;
    checkOut?: Location;
  };
  flags?: {
    isLeave?: boolean;
    isHoliday?: boolean;
    isWeekend?: boolean;
    isWFH?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceQueryParams {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

export interface Leave {
  _id: string;
  employee: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  numberOfDays: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WFH REQUESTS
// ============================================================================

export interface WFHRequest {
  _id: string;
  userId: string;
  employeeId: string;
  date: string;
  reason: string;
  status: WFHStatus;
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// REGULARIZATION
// ============================================================================

export interface RegularizationRequest {
  _id: string;
  userId: string;
  employeeId: string;
  date: string;
  reason: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  status: RegularizationStatus;
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HOLIDAYS
// ============================================================================

export interface Holiday {
  _id: string;
  title: string; // API uses 'title' not 'name'
  date: string;
  description?: string;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'employees' | 'hr' | 'admin';
  status: 'draft' | 'published';
  author?: string; // User ID
  authorName?: string; // Populated field or nested object
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SALARY MANAGEMENT
// ============================================================================

/** Legacy salary component (kept for backward compatibility) */
export interface SalaryComponent {
  name: string;
  amount: number;
}

/** Salary earnings breakdown with specific Indian allowances */
export interface SalaryEarnings {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  lta: number;
  specialAllowance: number;
  mobileAllowance: number;
}

/** Custom deduction item (user-defined) */
export interface CustomDeduction {
  name: string;
  amount: number;
}

/** Deductions structure for salary slips */
export interface SalaryDeductions {
  customDeductions?: CustomDeduction[];
  tds?: number; // Tax deducted at source
}

/** Enhanced salary structure matching API response */
export interface SalaryStructure {
  _id?: string;
  employeeId: string;
  earnings: SalaryEarnings;
  grossSalary: number;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string;
    position?: string;
    email?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/** Salary structure with pagination */
export interface SalaryStructuresResponse {
  salaryStructures: SalaryStructure[];
  pagination: PaginationMeta;
}

/** Enhanced salary slip matching API response */
export interface SalarySlip {
  _id?: string;
  employeeId: string;
  month: number;
  year: number;
  earnings: SalaryEarnings;
  deductions?: SalaryDeductions;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: SalarySlipStatus; // 'draft' | 'finalized'
  taxRegime: 'old' | 'new';
  enableTaxDeduction?: boolean;
  employee?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: string;
    position?: string;
    email?: string;
    bankName?: string;
    bankAccountNumber?: string;
    panNumber?: string;
    joiningDate?: string;
  };
  paidOn?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Salary slip with pagination */
export interface SalarySlipsResponse {
  salarySlips: SalarySlip[];
  pagination: PaginationMeta;
}

/** Salary statistics for overview/dashboard */
export interface SalaryStatistics {
  overview?: {
    totalEmployees: number;
    activeSalaryStructures: number;
    employeesWithoutStructure: number;
  };
  currentMonth?: {
    slipsGenerated: number;
  };
  financial?: {
    totalGrossSalary: number;
    totalNetSalary?: number;
  };
  // Properties from second definition
  totalEmployees?: number;
  employeesWithStructure?: number;
  employeesWithoutStructure?: number;
  averageGrossSalary?: number;
  averageNetSalary?: number;
  totalMonthlySalary?: number;
}

/** Tax calculation result */
export interface TaxCalculation {
  grossSalary: number;
  taxRegime: 'old' | 'new';
  taxableIncome: number;
  incomeTax: number;
  cess: number;
  totalTax: number;
  netSalary: number;
  monthlyTax: number; // Combined property from both defs
  monthlyTDS?: number; // Alias or specific to one
  breakdown?: {
    slab: string;
    rate: number;
    tax: number;
  }[];
}

/** Bulk generation result item */
export interface BulkGenerationResult {
  employeeId: string;
  employeeName: string;
  success: boolean;
  error: string | null;
}

/** Employee reference (lightweight) */
export interface EmployeeReference {
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  department?: string;
  position?: string;
  email?: string;
}

/** Month option for dropdowns */
export interface MonthOption {
  value: number | string;
  label: string;
}

/** Filter state for salary slips */
export interface SalarySlipFilters {
  employeeId: string;
  month: number | string;
  year: number;
  search: string;
}

// ============================================================================
// POLICIES
// ============================================================================

export type PolicyCategory =
  | 'General'
  | 'HR'
  | 'IT'
  | 'Security'
  | 'Leave'
  | 'Attendance'
  | 'Code of Conduct'
  | 'Safety'
  | 'Other';

export type PolicyPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type PolicyTargetAudience =
  | 'All Employees'
  | 'HR Only'
  | 'Management Only'
  | 'IT Team'
  | 'Specific Departments';

export interface Policy {
  _id: string;
  title: string;
  category: PolicyCategory;
  content: string;
  isActive?: boolean; // Soft delete flag
  priority: PolicyPriority;
  effectiveDate: string;
  expiryDate?: string;
  targetAudience: PolicyTargetAudience;
  acknowledgmentRequired: boolean;
  tags?: string[];
  createdBy?: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface GlobalSettings {
  _id: string;
  companyName: string;
  companyLogo?: string;
  workingHours: {
    start: string;
    end: string;
  };
  checkInGracePeriod: number;
  halfDayThreshold: number;
  weekendDays: number[];
  timezone: string;
  general?: {
    locationSetting?: string;
    geofence?: {
      enabled?: boolean;
      enforceCheckIn?: boolean;
      enforceCheckOut?: boolean;
      allowWFHBypass?: boolean;
      message?: string;
    };
    taskReportSetting?: string;
  };
  attendance?: {
    nonWorkingDays?: number[];
    workingDays?: number[];
    saturdayHolidays?: number[];
    workStartTime?: string;
    workEndTime?: string;
    halfDayEndTime?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentSettings {
  _id: string;
  department: string;
  workingHours?: {
    start: string;
    end: string;
  };
  checkInGracePeriod?: number;
  halfDayThreshold?: number;
  employees?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveSettings extends GlobalSettings {
  department?: string;
}

export interface DepartmentStats {
  department: string;
  employeeCount: number;
  hasCustomSettings: boolean;
}

export interface AttendanceRangeData {
  employeeReports: {
    employee: {
      _id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      department: string;
      [key: string]: unknown;
    };
    records: {
      _id: string;
      date: string;
      status: string;
      checkIn: string | null;
      checkOut: string | null;
      flags?: {
        isLeave?: boolean;
        isHoliday?: boolean;
        isWeekend?: boolean;
      };
      holidayTitle?: string;
      [key: string]: unknown;
    }[];
  }[];
}

export interface ActivityFeedItem {
  _id: string;
  type: 'attendance' | 'leave' | 'announcement' | 'employee' | 'policy';
  action: string;
  userId: string;
  userName: string;
  details: string;
  timestamp: string;
}

// ============================================================================
// OFFICE LOCATIONS
// ============================================================================

export interface OfficeLocation {
  _id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELP/SUPPORT
// ============================================================================

export interface HelpInquiry {
  _id: string;
  userId: string;
  employeeId: string;
  subject: string;
  message: string;
  category: string;
  status: HelpInquiryStatus;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TASK REPORTS
// ============================================================================

export interface TaskReport {
  _id: string;
  employeeId: string;
  date: string;
  tasks: string[];
  workType: 'full_day' | 'half_day';
  createdAt: string;
  updatedAt: string;
}

// Task report with populated employee data (for HR view)
export interface TaskReportWithEmployee {
  _id: string;
  employeeId: string;
  date: string;
  tasks: string[];
  workType: 'full_day' | 'half_day';
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;

}

// Paginated response for task reports
export interface TaskReportsResponse {
  reports: TaskReportWithEmployee[];
  pagination: PaginationMeta;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export type DocumentType =
  | 'profile_picture'
  | 'aadhaar'
  | 'pan'
  | '10th_marksheet'
  | '12th_marksheet'
  | 'college_marksheet';

export interface Document {
  _id: string;
  employeeId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentDto {
  employeeId: string;
  documentType: DocumentType;
  file: File;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface DashboardSummary {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  pendingRegularizations: number;
  pendingWFHRequests: number;
  totalPendingRequests?: number;
  upcomingHolidays?: number;
  presentEmployees?: Employee[];
  absentEmployees?: Employee[];
}

export interface TodayAlert {
  id: string;
  type: 'birthday' | 'milestone' | 'anniversary' | 'leave' | 'regularization' | 'wfh';
  employee: {
    id: unknown;
    name: string;
    employeeId: string;
    department?: string;
  };
  employeeId: string; // For backward compatibility - flatten from employee
  employeeName: string; // For backward compatibility - flatten from employee
  message: string;
  icon?: string;
  priority?: 'low' | 'medium' | 'high';
  milestone?: string;
  monthsCompleted?: number;
  date?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  newToken?: string;
}

export interface ApiError {
  status?: number;
  isValidationError?: boolean;
  message?: string;
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  // Properties from second definition
  endpoint?: string;
  timestamp?: string;
  isExpectedValidation?: boolean;
  isServerUnavailable?: boolean;
  isDNSError?: boolean;
  userFriendlyMessage?: string;
  validationDetails?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// GIFT GAME / TETRIS
// ============================================================================

export interface TetrisScore {
  _id: string;
  userId: string;
  playerName: string;
  score: number;
  level: number;
  linesCleared: number;
  createdAt: string;
}

export interface TetrisLeaderboardEntry {
  playerName: string;
  score: number;
  level: number;
  rank: number;
}

export interface TetrisLeaderboardParams {
  limit?: number;
  period?: 'all-time' | 'today' | 'week' | 'month';
}

export interface SaveTetrisScoreData {
  score: number;
  level: number;
  linesCleared: number;
}

export interface SaveTetrisScoreResponse {
  savedScore: TetrisScore;
  isPersonalBest: boolean;
  previousBest?: number;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface CreateEmployeeDto {
  name?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | number;
  dateOfBirth?: string | null;
  dateOfJoining: string | null;
  department?: string;
  designation?: string;
  position?: string;
  employeeId: string;
  gender?: string;
  maritalStatus?: string;
  address?: string; // Form uses string
  aadhaarNumber?: string | number;
  panNumber?: string;
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string | number;
  motherPhone?: string | number;
  officeAddress?: string;
  companyName?: string;
  employmentType?: string;
  reportingSupervisor?: string;
  paymentMode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIFSCCode?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string | number;
}

// Use Omit to avoid type conflict on 'address'
export interface UpdateEmployeeDto extends Partial<Omit<CreateEmployeeDto, 'address'>> {
  status?: 'active' | 'inactive';
  bankDetails?: Employee['bankDetails'];
  address?: Employee['address']; // Use Employee's address type
  emergencyContact?: Employee['emergencyContact'];
}

export interface LeaveRequestDto {
  leaveType: LeaveType;
  date: string;
  reason: string;
}

export interface WFHRequestDto {
  date: string;
  reason: string;
}

// Alias for create vs general request dto
export type CreateWFHRequestDto = WFHRequestDto;

export interface RegularizationRequestDto {
  date: string;
  reason: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
}

// User DTOs
export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  employeeId?: string;
}

// Holiday DTOs
export interface CreateHolidayDto {
  title: string;
  date: string;
  description?: string;
  isOptional?: boolean;
}

export interface UpdateHolidayDto {
  title?: string;
  date?: string;
  description?: string;
  isOptional?: boolean;
}

// Announcement DTOs
export interface CreateAnnouncementDto {
  title: string;
  content: string;
  targetAudience?: 'all' | 'employees' | 'hr' | 'admin';
  status?: 'draft' | 'published';
}

export interface UpdateAnnouncementDto extends Partial<CreateAnnouncementDto> { }

// Office Location DTOs
export interface CreateOfficeLocationDto {
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  isActive?: boolean;
}

export interface UpdateOfficeLocationDto extends Partial<CreateOfficeLocationDto> { }

// Policy DTOs
export interface CreatePolicyDto {
  title: string;
  category: PolicyCategory;
  content: string;
  priority: PolicyPriority;
  effectiveDate: string;
  expiryDate?: string;
  targetAudience: PolicyTargetAudience;
  acknowledgmentRequired: boolean;
  tags?: string[];
}

export interface UpdatePolicyDto extends Partial<CreatePolicyDto> {
  isActive?: boolean;
}

// Help Inquiry DTOs
export interface CreateHelpInquiryDto {
  subject: string;
  message: string;
  category: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateHelpInquiryDto {
  status?: HelpInquiryStatus;
  assignedTo?: string;
  resolution?: string;
}

// ============================================================================
// PASSWORD RESET
// ============================================================================


export interface PasswordResetRequest {
  _id: string;
  userId: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetRequestDto {
  name: string;
  email: string;
  newPassword: string;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationStatus {
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
}

// ============================================================================
// QUERY PARAMETER TYPES (for React Query hooks)
// ============================================================================

// Base pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Employee query params
export interface EmployeeQueryParams extends PaginationParams {
  department?: string;
  status?: 'active' | 'inactive';
  search?: string;
  designation?: string;
}

// Salary structure query params
export interface SalaryStructureQueryParams extends PaginationParams {
  employeeId?: string;
  department?: string;
}

// Salary slip query params
export interface SalarySlipQueryParams extends PaginationParams {
  employeeId?: string;
  month?: number;
  year?: number;
  status?: SalarySlipStatus;
}

// Announcement query params
export interface AnnouncementQueryParams extends PaginationParams {
  priority?: 'low' | 'medium' | 'high';
  targetAudience?: UserRole;
}

// Policy query params
export interface PolicyQueryParams extends PaginationParams {
  category?: string;
  status?: PolicyStatus;
}

// Office location query params
export interface OfficeLocationQueryParams extends PaginationParams {
  isActive?: boolean;
}

// Help inquiry query params
export interface HelpInquiryQueryParams extends PaginationParams {
  status?: HelpInquiryStatus;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

// Task report query params
export interface TaskReportQueryParams extends PaginationParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  // Fix duplication in range?
}

// Password reset request query params
export interface PasswordResetQueryParams extends PaginationParams {
  status?: 'pending' | 'approved' | 'rejected';
}

// WFH request query params
export interface WFHRequestQueryParams extends PaginationParams {
  status?: WFHStatus;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// THEME & UI
// ============================================================================

// Theme modes
export type ThemeMode = 'light' | 'dark' | 'system';

// Custom theme options
export type CustomTheme = 'default' | 'christmas' | 'newyear' | 'ocean' | 'forest';

// Theme context value
export interface ThemeContextValue {
  themeMode: ThemeMode;
  customTheme: CustomTheme;
  setThemeMode: (mode: ThemeMode) => void;
  setCustomTheme: (theme: CustomTheme) => void;
  toggleTheme: () => void;
  applyTheme: () => void;
  // Legacy support (backwards compatibility)
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}
