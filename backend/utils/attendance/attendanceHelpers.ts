/**
 * Attendance Helper Functions
 * Pure utility functions for data transformation and common operations
 */

import {
  ATTENDANCE_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  type AttendanceStatus
} from './attendanceConstants.js';
import { getISTDateString, calculateWorkHours } from '../timezone.js';
import { computeComprehensiveFlags } from './attendanceComputedFlags.js';
import type { IEmployee } from '../../types/index.js';
import type { Document, Types } from 'mongoose';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AttendanceRecord {
  _id?: Types.ObjectId | null;
  employee?: Types.ObjectId | IEmployee | { _id: Types.ObjectId };
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  workHours?: number | null;
  comments?: string | null;
  reason?: string | null;
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
}

interface EmployeeObject {
  _id: Types.ObjectId;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
}

interface AttendanceFlags {
  isLate?: boolean;
  isLeave?: boolean;
  isWeekend?: boolean;
  isHoliday?: boolean;
}

interface DayType {
  type: 'holiday' | 'weekend' | 'working';
  isWorkingDay: boolean;
}

interface ContextData {
  holidayMap?: Map<string, unknown>;
  approvedLeave?: { leaveType?: string; leaveReason?: string } | null;
  dayTypeChecker?: (date: Date, holidayMap?: Map<string, unknown> | null) => DayType | null;
}

interface ResponseData {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: unknown;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  leave: number;
  weekend: number;
  holiday: number;
  totalWorkHours: number;
  averageWorkHours: number;
}

interface DateRangeObject {
  date: Date;
  isWorkingDay: boolean;
}

interface ErrorResponseObject {
  response: ResponseData;
  statusCode: number;
}

interface SuccessResponseObject {
  response: ResponseData;
  statusCode: number;
}

// ============================================================================
// RESPONSE FORMATTERS
// ============================================================================

/**
 * Standard response formatter for consistency across all endpoints
 */
export const formatResponse = (
  success: boolean,
  message: string,
  data: unknown = null,
  errors: unknown = null
): ResponseData => {
  const response: ResponseData = {
    success,
    message
  };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return response;
};

/**
 * Build standard employee object for responses
 */
export const buildEmployeeObject = (employee: IEmployee | null | undefined): EmployeeObject | null => {
  if (!employee) return null;

  return {
    _id: employee._id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department,
    position: employee.position
  };
};

/**
 * Build standard attendance record for responses with computed flags
 */
export const buildAttendanceRecord = async (
  record: AttendanceRecord | null | undefined,
  employee: IEmployee | null | undefined,
  workHours: number | null = null,
  additionalFields: Record<string, unknown> & { contextData?: ContextData } = {}
): Promise<(Record<string, unknown> & { flags: AttendanceFlags }) | null> => {
  if (!employee) return null;

  const baseRecord: Record<string, unknown> = {
    _id: record?._id || null,
    employee: buildEmployeeObject(employee),
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: record?.date || null,
    checkIn: record?.checkIn || null,
    checkOut: record?.checkOut || null,
    status: record?.status || ATTENDANCE_STATUS.ABSENT,
    workHours: workHours !== null ? workHours : (record?.workHours || null),
    comments: record?.comments || null,
    reason: record?.reason || null
  };

  // Compute flags if we have enough context
  let flags: AttendanceFlags = {};
  if (record?.date && additionalFields.contextData) {
    flags = await computeComprehensiveFlags({
      attendanceRecord: record,
      date: record.date,
      holidayMap: additionalFields.contextData.holidayMap,
      approvedLeave: additionalFields.contextData.approvedLeave,
      dayTypeChecker: additionalFields.contextData.dayTypeChecker
    });
  }

  baseRecord.flags = flags;

  // Merge any additional fields (excluding contextData to avoid leaking internal data)
  const { contextData, ...cleanAdditionalFields } = additionalFields || {};
  const result = { ...baseRecord, flags };
  Object.assign(result, cleanAdditionalFields);
  return result;
};

/**
 * Build attendance record for specific status types with computed flags
 */
export const buildStatusSpecificRecord = async (
  date: Date,
  employee: IEmployee | null | undefined,
  status: AttendanceStatus,
  additionalData: Record<string, unknown> & {
    isLeave?: boolean;
    leaveType?: string;
    leaveReason?: string;
    isHoliday?: boolean;
    holidayTitle?: string;
    isWeekend?: boolean;
    reason?: string;
    holidayMap?: Map<string, unknown>;
    dayTypeChecker?: (date: Date, holidayMap?: Map<string, unknown> | null) => DayType | null;
  } = {}
): Promise<Record<string, unknown> | null> => {
  if (!employee) return null;

  const baseRecord: Record<string, unknown> = {
    _id: null,
    employee: buildEmployeeObject(employee),
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: date,
    checkIn: null,
    checkOut: null,
    status: status,
    workHours: null,
    comments: null,
    reason: null
  };

  // Handle different types of absences
  if (additionalData.isLeave) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    if (additionalData.leaveType) {
      baseRecord.comments = `Leave: ${additionalData.leaveType}`;
    }
    if (additionalData.leaveReason) {
      baseRecord.reason = additionalData.leaveReason;
    }
  } else if (additionalData.isHoliday) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    baseRecord.reason = null;
    if (additionalData.holidayTitle) {
      baseRecord.holidayTitle = additionalData.holidayTitle;
    }
  } else if (additionalData.isWeekend) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    baseRecord.reason = additionalData.reason || 'Weekend';
  } else if (typeof baseRecord.status === 'string' && baseRecord.status === ATTENDANCE_STATUS.ABSENT && !baseRecord.reason) {
    baseRecord.reason = 'No check-in recorded';
  }

  // Compute flags dynamically
  const flags = await computeComprehensiveFlags({
    attendanceRecord: null,
    date: date,
    holidayMap: additionalData.holidayMap,
    approvedLeave: additionalData.isLeave ? {
      leaveType: additionalData.leaveType,
      leaveReason: additionalData.leaveReason
    } : null,
    dayTypeChecker: additionalData.dayTypeChecker
  });

  return { ...baseRecord, ...additionalData, flags };
};

// ============================================================================
// MAP BUILDERS
// ============================================================================

/**
 * Create attendance and leave lookup maps for efficient data processing
 */
export const buildAttendanceMaps = (
  attendanceRecords: AttendanceRecord[],
  approvedLeaves: Array<{ employee: any; startDate: Date; endDate: Date }>
): {
  attendanceMap: Map<string, Map<string, AttendanceRecord>>;
  leaveMap: Map<string, Set<string>>;
} => {
  // Create attendance map grouped by employee and date
  const attendanceMap = new Map<string, Map<string, AttendanceRecord>>();
  attendanceRecords.forEach(record => {
    if (record.employee) {
      const empId = (record.employee as { _id: Types.ObjectId })._id.toString();
      const dateKey = getISTDateString(record.date);

      if (!attendanceMap.has(empId)) {
        attendanceMap.set(empId, new Map());
      }
      attendanceMap.get(empId)!.set(dateKey, record);
    }
  });

  // Create leave map grouped by employee and date
  // For multi-day leaves, generate entries for each day in the range
  const leaveMap = new Map<string, Set<string>>();
  approvedLeaves.forEach(leave => {
    const empId = leave.employee?._id?.toString() || leave.employee?.toString();
    if (!empId) return;

    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = getISTDateString(new Date(d));
      if (!leaveMap.has(empId)) {
        leaveMap.set(empId, new Set());
      }
      leaveMap.get(empId)!.add(dateKey);
    }
  });

  return { attendanceMap, leaveMap };
};

/**
 * Create simple attendance lookup map (single level) for single employee operations
 */
export const buildSimpleAttendanceMap = (attendanceRecords: AttendanceRecord[]): Map<string, AttendanceRecord> => {
  const attendanceMap = new Map<string, AttendanceRecord>();
  attendanceRecords.forEach(record => {
    const dateKey = getISTDateString(record.date);
    attendanceMap.set(dateKey, record);
  });
  return attendanceMap;
};

/**
 * Create simple leave lookup map for single employee operations
 */
export const buildSimpleLeaveMap = (
  approvedLeaves: Array<{ startDate: Date; endDate: Date }>
): Map<string, { startDate: Date; endDate: Date }> => {
  const leaveMap = new Map<string, { startDate: Date; endDate: Date }>();
  approvedLeaves.forEach(leave => {
    // For multi-day leaves, generate entries for each day in the range
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = getISTDateString(new Date(d));
      leaveMap.set(dateKey, leave);
    }
  });
  return leaveMap;
};

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Generate date range array for processing multiple dates
 */
export const generateDateRange = (
  startDate: Date,
  endDate: Date,
  holidayMap: Map<string, unknown> | null = null,
  workingDayChecker: ((date: Date, holidayMap: Map<string, unknown> | null) => boolean) | null = null
): DateRangeObject[] => {
  const allDays: DateRangeObject[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateObj: DateRangeObject = {
      date: new Date(currentDate),
      isWorkingDay: workingDayChecker ? workingDayChecker(currentDate, holidayMap) : true
    };
    allDays.push(dateObj);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return allDays;
};

/**
 * Filter records by date range
 */
export const filterRecordsByDateRange = (
  records: AttendanceRecord[],
  startDate: Date | null = null,
  endDate: Date | null = null
): AttendanceRecord[] => {
  return records.filter(record => {
    const recordDate = new Date(record.date);

    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;

    return true;
  });
};

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

/**
 * Calculate attendance statistics from records with flag-aware counting
 */
export const calculateAttendanceStats = (
  records: Array<AttendanceRecord & { flags?: AttendanceFlags }>
): AttendanceStats => {
  const stats: AttendanceStats = {
    total: records.length,
    present: 0,
    absent: 0,
    halfDay: 0,
    late: 0,
    leave: 0,
    weekend: 0,
    holiday: 0,
    totalWorkHours: 0,
    averageWorkHours: 0
  };

  records.forEach(record => {
    // Count primary status
    switch (record.status) {
      case ATTENDANCE_STATUS.PRESENT:
        stats.present++;
        break;
      case ATTENDANCE_STATUS.ABSENT:
        // Don't count weekends, holidays, or approved leaves as absences
        if (!record.flags?.isWeekend && !record.flags?.isHoliday && !record.flags?.isLeave) {
          stats.absent++;
        }
        break;
      case ATTENDANCE_STATUS.HALF_DAY:
        stats.halfDay++;
        break;
    }

    // Count flags for detailed analysis
    if (record.flags) {
      if (record.flags.isLate) stats.late++;
      if (record.flags.isLeave) stats.leave++;
      if (record.flags.isWeekend) stats.weekend++;
      if (record.flags.isHoliday) stats.holiday++;
    }

    // Add work hours if present
    if (record.workHours) {
      stats.totalWorkHours += record.workHours;
    }
  });

  // Calculate average work hours (only for present and half-day records)
  const workingRecords = stats.present + stats.halfDay;
  stats.averageWorkHours = workingRecords > 0 ?
    parseFloat((stats.totalWorkHours / workingRecords).toFixed(2)) : 0;

  return stats;
};

/**
 * Enhance attendance records with calculated work hours
 */
export const enhanceRecordsWithWorkHours = (
  records: AttendanceRecord[]
): Array<Record<string, unknown> & { workHours: number }> => {
  return records.map(record => {
    const checkIn = record.checkIn || undefined;
    const checkOut = record.checkOut || undefined;
    const workHours = calculateWorkHours(checkIn, checkOut);
    return {
      ...(record.toObject ? record.toObject() : record),
      workHours: workHours
    };
  });
};

// ============================================================================
// GROUPING UTILITIES
// ============================================================================

/**
 * Group records by employee
 */
export const groupRecordsByEmployee = (records: AttendanceRecord[]): Map<string, AttendanceRecord[]> => {
  const grouped = new Map<string, AttendanceRecord[]>();

  records.forEach(record => {
    const empObj = record.employee;
    let empId: string | undefined;

    if (empObj) {
      if (typeof empObj === 'object' && '_id' in empObj) {
        empId = (empObj._id as Types.ObjectId).toString();
      } else {
        empId = (empObj as Types.ObjectId).toString();
      }
    }

    if (empId) {
      if (!grouped.has(empId)) {
        grouped.set(empId, []);
      }
      grouped.get(empId)!.push(record);
    }
  });

  return grouped;
};

/**
 * Group records by date
 */
export const groupRecordsByDate = (records: AttendanceRecord[]): Map<string, AttendanceRecord[]> => {
  const grouped = new Map<string, AttendanceRecord[]>();

  records.forEach(record => {
    const dateKey = getISTDateString(record.date);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(record);
  });

  return grouped;
};

// ============================================================================
// VALIDATION & PARSING
// ============================================================================

/**
 * Validate required fields in request data
 */
export const validateRequiredFields = (
  data: Record<string, unknown> | null | undefined,
  requiredFields: string[]
): ValidationResult => {
  const missingFields = requiredFields.filter(field => {
    return !data || data[field] === undefined || data[field] === null || data[field] === '';
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Safely convert string to integer with default value
 */
export const safeParseInt = (
  value: string | number,
  defaultValue: number = 1,
  min: number | null = null,
  max: number | null = null
): number => {
  const parsed = parseInt(value.toString(), 10);

  if (isNaN(parsed)) return defaultValue;

  if (min !== null && parsed < min) return min;
  if (max !== null && parsed > max) return max;

  return parsed;
};

// ============================================================================
// HTTP RESPONSE BUILDERS
// ============================================================================

/**
 * Build pagination metadata
 */
export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Create error response with standard format
 */
export const createErrorResponse = (
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details: unknown = null
): ErrorResponseObject => {
  return {
    response: formatResponse(false, message, null, details),
    statusCode
  };
};

/**
 * Create success response with standard format
 */
export const createSuccessResponse = (
  message: string,
  data: unknown = null,
  statusCode: number = HTTP_STATUS.OK
): SuccessResponseObject => {
  return {
    response: formatResponse(true, message, data),
    statusCode
  };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  formatResponse,
  buildEmployeeObject,
  buildAttendanceRecord,
  buildStatusSpecificRecord,
  buildAttendanceMaps,
  buildSimpleAttendanceMap,
  buildSimpleLeaveMap,
  generateDateRange,
  calculateAttendanceStats,
  buildPaginationMeta,
  enhanceRecordsWithWorkHours,
  filterRecordsByDateRange,
  groupRecordsByEmployee,
  groupRecordsByDate,
  validateRequiredFields,
  safeParseInt,
  createErrorResponse,
  createSuccessResponse
};
