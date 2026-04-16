import type { Response } from 'express';
import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import Leave from '../models/Leave.model.js';
import Help from '../models/Help.model.js';
import RegularizationRequest from '../models/Regularization.model.js';
import Expense from '../models/Expense.model.js';
import PasswordResetRequest from '../models/PasswordResetRequest.model.js';
import Holiday from '../models/Holiday.model.js';
import { getISTNow, getISTDayBoundaries } from '../utils/timezone.js';
import AlertService from '../services/alertService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { IAuthRequest } from '../types/index.js';

interface EmployeeSummary {
  name: string;
  employeeId: string;
}

export const getAdminDashboardSummary = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const today = getISTNow();
  const { startOfDay: startOfToday, endOfDay: endOfToday } = getISTDayBoundaries();

  const allEmployees = await Employee.find({ isActive: true })
    .select('_id firstName lastName employeeId department')
    .lean();

  const attendanceRecords = await Attendance.find({
    date: { $gte: startOfToday.toJSDate(), $lte: endOfToday.toJSDate() }
  }).populate('employee', 'firstName lastName employeeId');

  const approvedLeaves = await Leave.find({
    status: 'approved',
    startDate: { $lte: endOfToday.toJSDate() },
    endDate: { $gte: startOfToday.toJSDate() }
  });

  const holidays = await Holiday.find({
    date: { $gte: startOfToday.toJSDate(), $lte: endOfToday.toJSDate() }
  });

  const [pendingLeaves, pendingHelp, pendingRegularizations, pendingExpenses, pendingPasswordResets, upcomingHolidays] = await Promise.all([
    Leave.countDocuments({ status: 'pending' }),
    Help.countDocuments({ status: 'pending' }),
    RegularizationRequest.countDocuments({ status: 'pending' }),
    Expense.countDocuments({ status: 'pending' }),
    PasswordResetRequest.countDocuments({ status: 'pending' }),
    Holiday.countDocuments({ date: { $gte: startOfToday.toJSDate() } })
  ]);

  const attendanceMap = new Map<string, typeof attendanceRecords[0]>();
  const leaveMap = new Set<string>();

  attendanceRecords.forEach(record => {
    if (record.employee && (record.employee as { _id: unknown })._id) {
      const empId = ((record.employee as { _id: { toString(): string } })._id).toString();
      attendanceMap.set(empId, record);
    }
  });

  approvedLeaves.forEach(leave => {
    const employeeId = leave.employee?.toString();
    if (employeeId) {
      leaveMap.add(employeeId);
    }
  });

  const isHoliday = holidays.length > 0;

  let presentToday = 0;
  const presentEmployees: EmployeeSummary[] = [];
  const absentEmployees: EmployeeSummary[] = [];

  allEmployees.forEach(employee => {
    const empId = (employee._id as { toString(): string }).toString();
    const attendanceRecord = attendanceMap.get(empId);
    const isOnLeave = leaveMap.has(empId) || leaveMap.has(employee.employeeId);

    if (attendanceRecord && (attendanceRecord.status === 'present' || attendanceRecord.checkIn)) {
      presentToday++;
      presentEmployees.push({
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        employeeId: employee.employeeId || 'N/A'
      });
    } else if (isOnLeave) {
      // On leave - don't count as absent
    } else if (isHoliday) {
      // Holiday - don't count as absent
    } else {
      const dayOfWeek = today.weekday;
      if (dayOfWeek === 7 || (dayOfWeek === 6 && Math.ceil(today.day / 7) === 2)) {
        // Weekend - don't count as absent
      } else {
        absentEmployees.push({
          name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
          employeeId: employee.employeeId || 'N/A'
        });
      }
    }
  });

  const totalPendingRequests = pendingLeaves + pendingHelp + pendingRegularizations + pendingExpenses + pendingPasswordResets;

  res.status(200).json({
    success: true,
    data: {
      presentToday,
      absentToday: absentEmployees.length,
      totalPendingRequests,
      upcomingHolidays,
      absentEmployees,
      presentEmployees
    }
  });
});

export const getTodayAlerts = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const alerts = await AlertService.getTodayAlerts();

  res.status(200).json({
    success: true,
    data: {
      alerts,
      count: alerts.length
    }
  });
});
