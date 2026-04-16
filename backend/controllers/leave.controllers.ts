import type { Response } from 'express';
import Leave from '../models/Leave.model.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import NotificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { calculateWorkingDays } from '../utils/calculateWorkingDays.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';
import type { LeaveStatus } from '../types/index.js';

export const requestLeave = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveMode, leaveType, startDate, endDate, date, reason } = req.body as {
    leaveMode?: 'single' | 'multi';
    leaveType: string;
    startDate?: string;
    endDate?: string;
    date?: string; // backward compatibility
    reason: string;
  };

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (!req.user.employeeId || typeof req.user.employeeId !== 'string' || req.user.employeeId.trim() === '') {
    throw new ValidationError('You must be linked to an employee profile to request leave. Please contact HR.');
  }

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) {
    throw new NotFoundError('Employee profile not found');
  }

  // Determine the effective mode and dates
  const effectiveMode = leaveMode || 'single';
  let leaveStartDate: Date;
  let leaveEndDate: Date;
  let numberOfDays: number;

  if (effectiveMode === 'multi') {
    // Multi-day mode
    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required for multi-day leave');
    }

    leaveStartDate = new Date(startDate);
    leaveEndDate = new Date(endDate);

    if (isNaN(leaveStartDate.getTime()) || isNaN(leaveEndDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (leaveStartDate > leaveEndDate) {
      throw new ValidationError('Start date must be on or before end date');
    }

    // Calculate working days (excludes Sundays, 2nd Saturdays, holidays)
    const result = await calculateWorkingDays(leaveStartDate, leaveEndDate);
    numberOfDays = result.workingDays;

    if (numberOfDays === 0) {
      throw new ValidationError('The selected date range contains no working days');
    }
  } else {
    // Single-day mode (backward compatible with old `date` field)
    const singleDate = startDate || date;
    if (!singleDate) {
      throw new ValidationError('Date is required');
    }

    leaveStartDate = new Date(singleDate);
    leaveEndDate = new Date(singleDate);

    if (isNaN(leaveStartDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    numberOfDays = leaveType === 'half-day' ? 0.5 : 1;
  }

  // For multi-day, force leaveType to full-day
  const effectiveLeaveType = effectiveMode === 'multi' ? 'full-day' : leaveType;

  const leave = await Leave.create({
    employee: employee._id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    leaveType: effectiveLeaveType,
    startDate: leaveStartDate,
    endDate: leaveEndDate,
    reason,
    numberOfDays
  });

  NotificationService.notifyHR('leave_request', {
    employee: req.user.name,
    employeeId: req.user.employeeId,
    type: effectiveLeaveType,
    date: startDate || date,
    reason
  }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to send leave request notification');
  });

  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    leave
  });
});

/**
 * Preview leave days — returns the working day count and breakdown
 * for a given date range. Used by the frontend to show a live preview
 * before the employee submits.
 */
export const previewLeaveDays = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  if (!startDate || !endDate) {
    throw new ValidationError('startDate and endDate query parameters are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  if (start > end) {
    throw new ValidationError('Start date must be on or before end date');
  }

  const result = await calculateWorkingDays(start, end);

  res.json({
    success: true,
    ...result
  });
});

export const getMyLeaves = asyncHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (!req.user.employeeId) {
    throw new ValidationError('No employee profile linked');
  }

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) {
    throw new NotFoundError('Employee profile not found');
  }

  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    leaves
  });
});

export const getAllLeaves = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.query;
    const filter: { employee?: unknown } = {};

    if (employeeId && typeof employeeId === 'string') {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employee = employee._id;
      }
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch leave requests');
    res.status(500).json({
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

export const updateLeaveStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveId } = req.params;
  const { status } = req.body as { status: string };

  if (!['approved', 'rejected'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    throw new NotFoundError('Leave request not found');
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  leave.status = status as LeaveStatus;
  leave.approvedBy = req.user._id;
  await leave.save();

  const employee = await Employee.findById(leave.employee);

  NotificationService.notifyEmployee(employee?.employeeId || '', 'leave_status_update', {
    status,
    type: leave.leaveType,
    date: leave.startDate.toDateString(),
    reason: leave.reason
  }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to send leave status notification');
  });

  res.json({
    success: true,
    message: `Leave request ${status}`,
    leave
  });
});
