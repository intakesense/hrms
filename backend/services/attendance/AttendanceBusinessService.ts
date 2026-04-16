/**
 * Attendance Business Service
 * Contains all core business logic, rules, and policies for attendance management
 */

import { DateTime } from 'luxon';
import type { IEmployee, IAttendance } from '../../types/index.js';
import {
  ATTENDANCE_STATUS,
  ERROR_MESSAGES
} from '../../utils/attendance/attendanceConstants.js';
import {
  getISTNow,
  getISTDayBoundaries,
  getISTDateString,
  calculateWorkHours,
  toIST
} from '../../utils/timezone.js';
import { computeAttendanceFlags, computeDayFlags } from '../../utils/attendance/attendanceComputedFlags.js';
import settingsService from '../settings/SettingsService.js';

/**
 * Validation result interface
 */
interface ValidationResult {
  isEligible: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Task validation result interface
 */
interface TaskValidation {
  isValid: boolean;
  errors?: string[];
  validTasks?: string[];
}

/**
 * Attendance status result interface
 */
interface AttendanceStatusResult {
  status: 'present' | 'absent' | 'half-day';
  flags: Record<string, any>;
  workHours?: number;
  reason?: string;
}

/**
 * Final status result interface
 */
interface FinalStatusResult {
  status: 'present' | 'absent' | 'half-day';
  flags: Record<string, any>;
  workHours: number;
  isLate: boolean;
}

/**
 * Day type result interface
 */
interface DayTypeResult {
  type: 'holiday' | 'weekend' | 'working';
  isWorkingDay: boolean;
  flags: Record<string, any>;
  holidayTitle?: string;
  reason?: string;
}

/**
 * Processed attendance record interface
 */
export interface ProcessedAttendanceRecord {
  date: Date;
  employee: {
    _id: any;
    employeeId: string;
    firstName: string;
    lastName: string;
  };
  employeeName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'present' | 'absent' | 'half-day';
  workHours: number | null;
  comments?: string | null;
  reason?: string | null;
  flags?: Record<string, any>;
  location?: any;
  holidayTitle?: string;
}

/**
 * Attendance percentage result interface
 */
interface AttendancePercentageResult {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

/**
 * AttendanceBusinessService
 * Centralized business logic for attendance operations
 */
export class AttendanceBusinessService {

  /**
   * Determine attendance status based on check-in time and work hours
   * Uses simplified 3-status system: Present (includes late), Absent, Half-day
   * @param checkInTime - Check-in timestamp
   * @param checkOutTime - Check-out timestamp (optional)
   * @param department - Department for settings lookup (optional)
   * @returns Status and flags object
   */
  static async determineAttendanceStatus(
    checkInTime: Date | null,
    checkOutTime: Date | null = null,
    department: string | null = null
  ): Promise<AttendanceStatusResult> {
    if (!checkInTime) {
      return {
        status: ATTENDANCE_STATUS.ABSENT,
        flags: {},
        reason: 'No check-in recorded'
      };
    }

    const checkInIST = toIST(checkInTime);
    const checkInHour = checkInIST.hour;
    const checkInMinutes = checkInIST.minute;
    const checkInDecimal = checkInHour + (checkInMinutes / 60);

    // Calculate work hours if checkout time is available
    let workHours = 0;
    if (checkOutTime) {
      workHours = calculateWorkHours(checkInTime, checkOutTime);
    }

    let status: 'present' | 'absent' | 'half-day' = ATTENDANCE_STATUS.PRESENT;

    // If checked out, determine final status based on work hours using dynamic settings
    if (checkOutTime) {
      const thresholds = await settingsService.getWorkHourThresholds(department);
      const attendanceSettings = await settingsService.getAttendanceSettings(department);

      // Check if it's Saturday and has half-day policy
      const dayOfWeek = checkInTime.getDay();
      const isSaturday = dayOfWeek === 6;
      const isSaturdayHalfDay = isSaturday && attendanceSettings.saturdayWorkType === 'half';

      if (workHours < thresholds.minimumWorkHours) {
        // Less than minimum required hours - mark as absent
        status = ATTENDANCE_STATUS.ABSENT;
      } else if (!isSaturdayHalfDay && workHours < thresholds.fullDayHours) {
        // Between minimum and full day hours - mark as half day
        // Exception: If it's Saturday with half-day policy, don't mark as half day
        status = ATTENDANCE_STATUS.HALF_DAY;
      } else {
        // Full day hours or more - mark as present
        // Also mark as present if it's Saturday half-day policy and worked >= minimum hours
        status = ATTENDANCE_STATUS.PRESENT;
      }
    }

    // Create a mock record for flag computation
    const mockRecord: any = { checkIn: checkInTime, checkOut: checkOutTime, status };
    const flags = await computeAttendanceFlags(mockRecord, null, null, department);

    return {
      status,
      flags,
      workHours
    };
  }

  /**
   * Check if a date is a working day for the company using dynamic settings
   * @param date - The IST date to check
   * @param holidayMap - Pre-fetched holiday map for O(1) lookup (optional)
   * @param department - Department for settings lookup (optional)
   * @returns True if it's a working day
   */
  static async isWorkingDayForCompany(
    date: Date,
    holidayMap: Map<string, any> | null = null,
    department: string | null = null
  ): Promise<boolean> {
    // Check if it's a holiday using pre-fetched map (O(1) lookup)
    if (holidayMap) {
      const dateKey = getISTDateString(date);
      if (holidayMap.has(dateKey)) {
        return false; // It's a holiday, so not a working day
      }
    }

    // Use settings service to check if it's a working day
    return await settingsService.isWorkingDay(date, department);
  }

  /**
   * Validate check-in eligibility
   * @param employee - Employee document
   * @param currentTime - Current IST time (optional, defaults to now)
   * @returns Validation result
   */
  static validateCheckInEligibility(
    employee: IEmployee,
    currentTime: DateTime | null = null
  ): ValidationResult {
    const now = currentTime || getISTNow();
    const { startOfDay } = getISTDayBoundaries(now.toJSDate());

    const validation: ValidationResult = {
      isEligible: true,
      errors: [],
      warnings: []
    };

    // Check if employee is active
    if (!employee.isActive) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.EMPLOYEE_INACTIVE);
    }

    // Check if operation date is before joining date
    if (employee.joiningDate && startOfDay.toJSDate() < employee.joiningDate) {
      validation.isEligible = false;
      validation.errors.push('Cannot check-in before joining date');
    }

    // Check if it's a very early check-in (before 6 AM)
    const checkInHour = now.hour;
    if (checkInHour < 6) {
      validation.warnings.push('Very early check-in detected');
    }

    // Check if it's a very late check-in (after 12 PM)
    if (checkInHour > 12) {
      validation.warnings.push('Late check-in detected');
    }

    return validation;
  }

  /**
   * Validate check-out eligibility
   * @param attendanceRecord - Existing attendance record
   * @param tasks - Task report array
   * @param currentTime - Current IST time (optional, defaults to now)
   * @returns Validation result
   */
  static validateCheckOutEligibility(
    attendanceRecord: IAttendance | null,
    tasks: string[],
    currentTime: DateTime | null = null
  ): ValidationResult {
    const now = currentTime || getISTNow();

    const validation: ValidationResult = {
      isEligible: true,
      errors: [],
      warnings: []
    };

    // Check if attendance record exists
    if (!attendanceRecord) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.NO_CHECKIN_RECORD);
      return validation;
    }

    // Check if already checked out
    if (attendanceRecord.checkOut) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.ALREADY_CHECKED_OUT);
      return validation;
    }

    // Validate task report
    const taskValidation = this.validateTaskReport(tasks);
    if (!taskValidation.isValid) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.TASK_REPORT_REQUIRED);
    }

    // Check minimum work duration (warning if less than 2 hours)
    if (attendanceRecord.checkIn) {
      const workHours = calculateWorkHours(attendanceRecord.checkIn, now.toJSDate());
      if (workHours < 2) {
        validation.warnings.push('Short work duration detected');
      }
    }

    return validation;
  }

  /**
   * Validate task report
   * @param tasks - Array of task strings
   * @returns Validation result
   */
  static validateTaskReport(tasks: string[]): TaskValidation {
    if (!tasks || !Array.isArray(tasks)) {
      return { isValid: false, errors: ['Tasks must be provided as an array'] };
    }

    const validTasks = tasks.filter(task =>
      typeof task === 'string' && task.trim() !== ''
    );

    if (validTasks.length === 0) {
      return { isValid: false, errors: ['At least one valid task is required'] };
    }

    return { isValid: true, validTasks };
  }

  /**
   * Calculate final attendance status after checkout
   * @param checkInTime - Check-in time
   * @param checkOutTime - Check-out time
   * @param department - Department for settings lookup (optional)
   * @returns Final status and metadata
   */
  static async calculateFinalStatus(
    checkInTime: Date,
    checkOutTime: Date,
    department: string | null = null
  ): Promise<FinalStatusResult> {
    const statusResult = await this.determineAttendanceStatus(checkInTime, checkOutTime, department);
    const workHours = calculateWorkHours(checkInTime, checkOutTime);

    return {
      status: statusResult.status,
      flags: statusResult.flags,
      workHours: parseFloat(workHours.toFixed(2)),
      isLate: statusResult.flags.isLate || false
    };
  }

  /**
   * Generate business hours for a specific date using dynamic settings
   * @param date - Target date
   * @param department - Department for settings lookup (optional)
   * @returns Business hours object
   */
  static async getBusinessHours(date: Date, department: string | null = null): Promise<any> {
    return await settingsService.getBusinessHours(date, department);
  }

  /**
   * Determine day type (working day, weekend, holiday)
   * @param date - Date to check
   * @param holidayMap - Holiday map (optional)
   * @param department - Department for settings lookup (optional)
   * @returns Day type information
   */
  static async determineDayType(
    date: Date,
    holidayMap: Map<string, any> | null = null,
    department: string | null = null
  ): Promise<DayTypeResult> {
    const dateKey = getISTDateString(date);
    const dayOfWeek = date.getDay();

    // Check for holiday first
    if (holidayMap && holidayMap.has(dateKey)) {
      const holiday = holidayMap.get(dateKey);
      return {
        type: 'holiday',
        isWorkingDay: false,
        flags: { isHoliday: true },
        holidayTitle: holiday.title || holiday.holidayName || 'Holiday'
      };
    }

    // Check for weekend
    if (dayOfWeek === 0) { // Sunday
      return {
        type: 'weekend',
        isWorkingDay: false,
        flags: { isWeekend: true },
        reason: 'Sunday'
      };
    }

    if (dayOfWeek === 6) { // Saturday
      // Check if it's a holiday Saturday using settings
      const isWorkingDay = await settingsService.isWorkingDay(date, department);
      if (!isWorkingDay) {
        const saturdayWeek = this.getSaturdayWeekOfMonth(date);
        return {
          type: 'weekend',
          isWorkingDay: false,
          flags: { isWeekend: true },
          reason: `${this.getOrdinalNumber(saturdayWeek)} Saturday`
        };
      }
    }

    // It's a working day
    return {
      type: 'working',
      isWorkingDay: true,
      flags: {}
    };
  }

  /**
   * Determine which Saturday of the month a given date is
   * @param date - Date to check (should be a Saturday)
   * @returns 1, 2, 3, or 4 representing 1st, 2nd, 3rd, or 4th Saturday
   */
  static getSaturdayWeekOfMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateNum = date.getDate();

    // Find the first Saturday of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();

    // Calculate first Saturday date (0=Sunday, 6=Saturday)
    const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;

    // Calculate which Saturday this date is
    const saturdayWeek = Math.ceil((dateNum - firstSaturday + 1) / 7);

    return Math.max(1, Math.min(4, saturdayWeek)); // Ensure it's between 1-4
  }

  /**
   * Get ordinal number string (1st, 2nd, 3rd, 4th)
   * @param num - Number (1-4)
   * @returns Ordinal string
   */
  static getOrdinalNumber(num: number): string {
    const ordinals: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
    return ordinals[num] || `${num}th`;
  }

  /**
   * Process attendance for a specific day
   * Determines the appropriate status and flags based on attendance record, leaves, and day type
   * Priority: Attendance record > Holiday/Weekend > Leave
   * This ensures weekends/holidays within multi-day leaves show correctly as non-working days
   * @param date - Target date
   * @param employee - Employee document
   * @param attendanceRecord - Attendance record (optional)
   * @param approvedLeave - Approved leave record (optional)
   * @param holidayMap - Holiday map (optional)
   * @returns Processed attendance data
   */
  static async processAttendanceForDay(
    date: Date,
    employee: IEmployee,
    attendanceRecord: any = null,
    approvedLeave: any = null,
    holidayMap: Map<string, any> | null = null
  ): Promise<ProcessedAttendanceRecord> {
    const dayType = await this.determineDayType(date, holidayMap, employee.department);

    // Base result structure
    const result: ProcessedAttendanceRecord = {
      date: new Date(date),
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName
      },
      employeeName: `${employee.firstName} ${employee.lastName}`,
      checkIn: null,
      checkOut: null,
      status: ATTENDANCE_STATUS.ABSENT,
      workHours: null,
      comments: null,
      reason: null
    };

    // PRIORITY 1: Handle attendance record first (if someone checked in, they are present regardless of day type)
    if (attendanceRecord) {
      const workHours = calculateWorkHours(attendanceRecord.checkIn, attendanceRecord.checkOut);
      const statusResult = await this.determineAttendanceStatus(attendanceRecord.checkIn, attendanceRecord.checkOut, employee.department);

      result.checkIn = attendanceRecord.checkIn;
      result.checkOut = attendanceRecord.checkOut;
      result.status = statusResult.status;
      result.workHours = parseFloat(workHours.toFixed(2));
      result.flags = await computeAttendanceFlags(attendanceRecord, dayType, approvedLeave, employee.department);
      result.comments = attendanceRecord.comments;
      result.reason = attendanceRecord.reason;
      result.location = attendanceRecord.location;

      // Add holiday/weekend info to result if applicable, but keep Present status
      if (dayType.type === 'holiday') {
        result.holidayTitle = dayType.holidayTitle;
      }

      return result;
    }

    // PRIORITY 2: Handle holidays (only if no attendance record)
    // Holidays take precedence over leave — leave should not apply on holidays
    if (dayType.type === 'holiday') {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.holidayTitle = dayType.holidayTitle;
      result.flags = computeDayFlags(date, dayType, null);
      return result;
    }

    // PRIORITY 3: Handle weekends (only if no attendance record and not a holiday)
    // Weekends take precedence over leave — multi-day leaves spanning weekends
    // should show weekends as "Weekend", not "Leave"
    if (dayType.type === 'weekend') {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.reason = dayType.reason;
      result.flags = computeDayFlags(date, dayType, null);
      return result;
    }

    // PRIORITY 4: Handle approved leave (only on working days with no attendance record)
    if (approvedLeave) {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.comments = `Leave: ${approvedLeave.leaveType || 'Approved'}`;
      result.reason = approvedLeave.reason || approvedLeave.leaveReason || 'Approved leave';
      result.flags = computeDayFlags(date, dayType, approvedLeave);
      return result;
    }

    // PRIORITY 5: No attendance record for a working day - absent
    result.reason = 'No check-in recorded';
    result.flags = computeDayFlags(date, dayType, null);
    return result;
  }

  /**
   * Calculate attendance percentage for a period
   * @param attendanceRecords - Array of attendance records
   * @returns Attendance percentage and statistics
   */
  static calculateAttendancePercentage(attendanceRecords: ProcessedAttendanceRecord[]): AttendancePercentageResult {
    let totalWorkingDays = 0;
    let presentDays = 0;

    // Only count attendance up to today's date (don't count future dates as absent)
    const todayIST = getISTNow().toJSDate();
    todayIST.setHours(23, 59, 59, 999); // End of today

    attendanceRecords.forEach(record => {
      const recordDate = new Date(record.date);

      // Only process records up to today (don't count future dates)
      if (recordDate <= todayIST) {
        // Only count working days (exclude weekends, holidays, and approved leaves)
        if (!record.flags?.isWeekend && !record.flags?.isHoliday && !record.flags?.isLeave) {
          totalWorkingDays++;

          if (record.status === ATTENDANCE_STATUS.PRESENT || record.status === ATTENDANCE_STATUS.HALF_DAY) {
            presentDays++;
          }
        }
      }
    });

    const percentage = totalWorkingDays > 0 ? ((presentDays / totalWorkingDays) * 100) : 0;

    return {
      totalWorkingDays,
      presentDays,
      absentDays: totalWorkingDays - presentDays,
      percentage: parseFloat(percentage.toFixed(1))
    };
  }

  /**
   * Validate status transition
   * @param currentStatus - Current status
   * @param newStatus - Desired new status
   * @returns True if transition is valid
   */
  static validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    if (!currentStatus || !newStatus) return false;

    const validTransitions: Record<string, string[]> = {
      [ATTENDANCE_STATUS.ABSENT]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY],
      [ATTENDANCE_STATUS.PRESENT]: [ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.HALF_DAY],
      [ATTENDANCE_STATUS.HALF_DAY]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]
    };

    const allowed = validTransitions[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }
}

export default AttendanceBusinessService;
