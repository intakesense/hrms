import type { Response } from 'express';
import ExcelJS from 'exceljs';
import Expense from '../models/Expense.model.js';
import Employee from '../models/Employee.model.js';
import NotificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import type { IAuthRequest, ExpenseStatus } from '../types/index.js';

/**
 * Submit a new expense request
 */
export const createExpense = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { date, item, amount } = req.body as { date: string; item: string; amount: number };

  if (!req.user) throw new ValidationError('Authentication required');

  if (!req.user.employeeId) {
    throw new ValidationError('You must be linked to an employee profile to submit expenses.');
  }

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) throw new NotFoundError('Employee profile not found');

  const expense = await Expense.create({
    employee: employee._id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: new Date(date),
    item,
    amount,
    status: 'pending'
  });

  NotificationService.notifyHR('expense_request', {
    employee: req.user.name,
    employeeId: req.user.employeeId,
    item,
    amount,
    date
  }).catch(err => logger.error({ err }, 'Failed to notify HR about expense'));

  res.status(201).json({
    success: true,
    message: 'Expense submitted successfully',
    expense
  });
});

/**
 * Get expenses for the logged-in employee
 */
export const getMyExpenses = asyncHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user?.employeeId) throw new ValidationError('No employee profile linked');

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) throw new NotFoundError('Employee profile not found');

  const expenses = await Expense.find({ employee: employee._id }).sort({ date: -1 });

  res.json({
    success: true,
    expenses
  });
});

/**
 * Get all expenses with filters (Admin/HR only)
 */
export const getAllExpenses = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, status, startDate, endDate } = req.query;
  const filter: any = {};

  if (employeeId && typeof employeeId === 'string') {
    const employee = await Employee.findOne({ employeeId });
    if (employee) filter.employee = employee._id;
  }

  if (status && typeof status === 'string') {
    filter.status = status;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  const expenses = await Expense.find(filter)
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ date: -1 });

  res.json({
    success: true,
    expenses
  });
});

/**
 * Update single expense status
 */
export const updateExpenseStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body as { status: ExpenseStatus; reviewComment?: string };

  if (!['approved', 'rejected'].includes(status)) throw new ValidationError('Invalid status');

  const expense = await Expense.findById(id);
  if (!expense) throw new NotFoundError('Expense not found');

  // Constraint: Approved expenses cannot be modified
  if (expense.status === 'approved') {
    throw new ForbiddenError('Approved expenses cannot be modified');
  }

  expense.status = status;
  expense.reviewComment = reviewComment;
  if (status === 'approved') {
    expense.approvedBy = req.user?._id;
    expense.approvedAt = new Date();
  }
  await expense.save();

  const employee = await Employee.findById(expense.employee);
  if (employee) {
    NotificationService.notifyEmployee(employee.employeeId, 'expense_status_update', {
      status,
      item: expense.item,
      amount: expense.amount,
      comment: reviewComment
    }).catch(err => logger.error({ err }, 'Failed to notify employee about expense status'));
  }

  res.json({
    success: true,
    message: `Expense ${status}`,
    expense
  });
});

/**
 * Bulk update expense statuses
 */
export const bulkUpdateStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { ids, status, reviewComment } = req.body as { ids: string[]; status: ExpenseStatus; reviewComment?: string };

  if (!Array.isArray(ids) || ids.length === 0) throw new ValidationError('IDs are required');
  if (!['approved', 'rejected'].includes(status)) throw new ValidationError('Invalid status');

  // Build update payload — only set approvedBy/At for approvals
  const updateFields: any = {
    status,
    reviewComment: reviewComment || undefined
  };
  if (status === 'approved') {
    updateFields.approvedBy = req.user?._id;
    updateFields.approvedAt = new Date();
  }

  const result = await Expense.updateMany(
    { _id: { $in: ids }, status: { $ne: 'approved' } },
    { $set: updateFields }
  );

  // Notify employees in background
  const updatedExpenses = await Expense.find({ _id: { $in: ids } }).populate('employee', 'employeeId');
  for (const expense of updatedExpenses) {
    const emp: any = expense.employee;
    if (emp?.employeeId) {
      NotificationService.notifyEmployee(emp.employeeId, 'expense_status_update', {
        status,
        item: expense.item,
        amount: expense.amount
      }).catch(() => {});
    }
  }

  res.json({
    success: true,
    message: `Updated ${result.modifiedCount} expenses to ${status}`,
    updatedCount: result.modifiedCount
  });
});

/**
 * Export filtered expenses to Excel
 */
export const exportExpensesExcel = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, status, startDate, endDate } = req.query;
  const filter: any = {};

  if (employeeId && typeof employeeId === 'string') {
    const employee = await Employee.findOne({ employeeId });
    if (employee) filter.employee = employee._id;
  }
  if (status && typeof status === 'string') {
    filter.status = status;
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate as string);
    if (endDate) filter.date.$lte = new Date(endDate as string);
  }

  const expenses = await Expense.find(filter)
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ date: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Expenses');

  // Define column structure
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Item/Description', key: 'item', width: 40 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Admin Comment', key: 'comment', width: 30 },
  ];

  // Add data rows
  expenses.forEach(exp => {
    const empData: any = exp.employee;
    worksheet.addRow({
      date: exp.date.toISOString().split('T')[0],
      employeeId: empData?.employeeId || 'N/A',
      employeeName: exp.employeeName,
      department: empData?.department || 'N/A',
      item: exp.item,
      amount: exp.amount,
      status: exp.status,
      comment: exp.reviewComment || ''
    });
  });

  // Header styling
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=expenses.xlsx');

  // Stream output
  await workbook.xlsx.write(res);
  res.end();
});
