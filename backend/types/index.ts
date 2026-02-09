/**
 * Comprehensive TypeScript Type Definitions for HRMS Backend
 *
 * This file contains all shared types, interfaces, and type utilities
 * for the HRMS application. Organized by domain for easy navigation.
 */

import type { Request, Response, NextFunction } from 'express';
import type { Document, Types, Model, Query } from 'mongoose';
import type { JwtPayload } from 'jsonwebtoken';

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export type UserRole = 'admin' | 'hr' | 'employee';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  employee?: Types.ObjectId;
  employeeId?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJWTPayload extends JwtPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  employee?: string;  // ObjectId as string
  employeeId?: string;
}

export interface IAuthUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  employee?: Types.ObjectId;
  employeeId?: string;
}

export interface IAuthRequest extends Request {
  user?: IAuthUser;
}

// ============================================================================
// EMPLOYEE TYPES
// ============================================================================

export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced';
export type OfficeAddress = 'SanikColony' | 'Indore' | 'N.F.C.' | 'Offsite';
export type CompanyName =
  | 'Indra Financial Services Limited'
  | 'COSMOS INVESTIFIASSET MANAGEMENT LLP'
  | 'SENSIBLE TAX ADVISORY LLP';
export type PaymentMode = 'Bank Transfer' | 'Cheque' | 'Cash';
export type EmploymentType = 'fulltime' | 'intern' | 'remote';

export interface IEmployee extends Document {
  _id: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: Date;
  maritalStatus: MaritalStatus;
  email: string;
  phone: string;
  address?: string;
  aadhaarNumber: string;
  panNumber: string;
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  officeAddress: OfficeAddress;
  companyName: CompanyName;
  department: string;
  position: string;
  paymentMode: PaymentMode;
  bankName: string;
  bankAccountNumber: string;
  bankIFSCCode: string;
  employmentType: EmploymentType;
  reportingSupervisor: string;
  joiningDate: Date;
  emergencyContactNumber: string;
  emergencyContactName: string;
  isActive: boolean;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

export type AttendanceStatus = 'present' | 'absent' | 'half-day';
export type GeofenceStatus = 'onsite' | 'wfh';

export interface ILocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: Date;
}

export interface IGeofence {
  enforced: boolean;
  status?: GeofenceStatus;
  office?: Types.ObjectId;
  officeName?: string;
  distance?: number;
  radius?: number;
  validatedAt?: Date;
  wfhRequest?: Types.ObjectId;
  notes?: string;
}

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  workHours: number;
  comments?: string;
  reason?: string;
  location?: ILocation;
  geofence?: IGeofence;
  checkoutLocation?: ILocation;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LEAVE TYPES
// ============================================================================

export type LeaveType = 'full-day' | 'half-day';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface ILeave extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  numberOfDays: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REGULARIZATION TYPES
// ============================================================================

export type RegularizationType = 'check-in' | 'check-out' | 'both';
export type RegularizationStatus = 'pending' | 'approved' | 'rejected';

export interface IRegularization extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  date: Date;
  type: RegularizationType;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
  status: RegularizationStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SALARY TYPES
// ============================================================================

export type TaxRegime = 'old' | 'new';

export interface IEarningComponent {
  name: string;
  amount: number;
  isVariable: boolean;
}

export interface IDeductionComponent {
  name: string;
  amount: number;
}

export interface ISalaryStructure extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  otherDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  effectiveFrom: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalarySlip extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  month: number;
  year: number;
  salaryStructure: Types.ObjectId;
  earningComponents: IEarningComponent[];
  deductionComponents: IDeductionComponent[];
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  taxRegime: TaxRegime;
  taxableIncome: number;
  tds: number;
  isPublished: boolean;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  generatedAt: Date;
  paidOn?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// HOLIDAY & ANNOUNCEMENT TYPES
// ============================================================================

export type HolidayType = 'public' | 'restricted' | 'optional';

export interface IHoliday extends Document {
  _id: Types.ObjectId;
  name: string;
  date: Date;
  type: HolidayType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  targetAudience: UserRole[];
  createdBy: Types.ObjectId;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// POLICY & SETTINGS TYPES
// ============================================================================

export interface IPolicy extends Document {
  _id: Types.ObjectId;
  title: string;
  category: string;
  content: string;
  version: number;
  effectiveFrom: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  lastModifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettings extends Document {
  _id: Types.ObjectId;
  key: string;
  value: unknown;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OFFICE LOCATION & WFH TYPES
// ============================================================================

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IOfficeLocation extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  coordinates: ICoordinates;
  radius: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WFHStatus = 'pending' | 'approved' | 'rejected';

export interface IWFHRequest extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  date: Date;
  reason: string;
  status: WFHStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'driving-license'
  | 'educational'
  | 'experience'
  | 'other';

export interface IEmployeeDocument extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  documentType: DocumentType;
  documentName: string;
  documentUrl: string;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TASK REPORT TYPES
// ============================================================================

export interface ITaskReport extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  date: Date;
  tasks: string[];
  accomplishments: string;
  blockers?: string;
  plannedForTomorrow?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

export type ActivityType =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject';

export interface IActivity {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  activityType: ActivityType;
  resource: string;
  resourceId?: Types.ObjectId;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// HELP & SUPPORT TYPES
// ============================================================================

export type HelpTicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type HelpPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IHelp extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  subject: string;
  description: string;
  category: string;
  priority: HelpPriority;
  status: HelpTicketStatus;
  assignedTo?: Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

export type ResetRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface IPasswordResetRequest extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  employeeName: string;
  reason: string;
  status: ResetRequestStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DEPARTMENT TYPES
// ============================================================================

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  headOfDepartment?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ISuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface IErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  stack?: string;
}

export type IAPIResponse<T = unknown> = ISuccessResponse<T> | IErrorResponse;

// ============================================================================
// REQUEST/RESPONSE HANDLER TYPES
// ============================================================================

export type AsyncRequestHandler = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export type RequestHandler = (
  req: IAuthRequest,
  res: Response,
  next: NextFunction
) => void | Response | Promise<void | Response>;

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export interface IAuthMiddleware {
  verifyToken: RequestHandler;
  requireRole: (roles: UserRole[]) => RequestHandler;
  requireAdmin: RequestHandler;
  requireHR: RequestHandler;
  requireEmployee: RequestHandler;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface IEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export interface INotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export interface IPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface IPaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface IDateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface IAttendanceQuery extends IPaginationQuery, IDateRangeQuery {
  employeeId?: string;
  status?: AttendanceStatus;
  department?: string;
}

export interface ILeaveQuery extends IPaginationQuery, IDateRangeQuery {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MongooseDoc<T> = T & Document;
export type MongooseModel<T> = Model<T>;

// ============================================================================
// CACHE TYPES
// ============================================================================

export interface ICacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
  totalRequests: number;
}

export interface ICacheInvalidationStats {
  totalInvalidations: number;
  lastInvalidation: Date | null;
  autoInvalidations: number;
  manualInvalidations: number;
}

// ============================================================================
// GEOFENCE & LOCATION TYPES
// ============================================================================

export interface IDistanceResult {
  distance: number;
  isWithinRadius: boolean;
}

export interface IGeofenceValidation {
  isValid: boolean;
  distance?: number;
  office?: {
    id: string;
    name: string;
    radius: number;
  };
  error?: string;
}

// ============================================================================
// SCHEDULER & QUEUE TYPES
// ============================================================================

export interface IJobData {
  type: string;
  payload: Record<string, unknown>;
  scheduledAt: Date;
}

export interface ISchedulerConfig {
  timezone: string;
  maxRetries: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message, 400);
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

// ============================================================================
// LOGGER TYPES (for Pino)
// ============================================================================

export interface ILoggerConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint: boolean;
  timestamp: boolean;
}

export interface ILogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  method?: string;
  url?: string;
  [key: string]: unknown;
}
