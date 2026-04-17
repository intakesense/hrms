import type { Response } from 'express';
import mongoose from 'mongoose';
import SalarySlip from '../models/SalarySlip.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

export const createOrUpdateSalarySlip = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month, year, earnings, deductions = {}, taxRegime = 'new', enableTaxDeduction = true } = req.body as {
      employeeId: string;
      month: number;
      year: number;
      earnings: { basic: number; hra?: number; conveyance?: number; medical?: number; lta?: number; specialAllowance?: number; mobileAllowance?: number };
      deductions?: { customDeductions?: unknown[] };
      taxRegime?: string;
      enableTaxDeduction?: boolean;
    };

    if (!employeeId || !month || !year || !earnings || !earnings.basic) {
      res.status(400).json(formatResponse(false, 'Employee ID, month, year, and basic salary are required'));
      return;
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    const salarySlipData = {
      employee: employee._id,
      employeeId,
      month,
      year,
      earnings: {
        basic: earnings.basic,
        hra: earnings.hra || 0,
        conveyance: earnings.conveyance || 0,
        medical: earnings.medical || 0,
        lta: earnings.lta || 0,
        specialAllowance: earnings.specialAllowance || 0,
        mobileAllowance: earnings.mobileAllowance || 0
      },
      deductions: {
        incomeTax: 0,
        customDeductions: deductions.customDeductions || []
      },
      taxRegime,
      enableTaxDeduction,
      createdBy: req.user._id
    };

    const existingSalarySlip = await SalarySlip.findOne({ employee: employee._id, month, year });

    let salarySlip;
    if (existingSalarySlip) {
      Object.assign(existingSalarySlip, salarySlipData);
      salarySlip = await existingSalarySlip.save();
    } else {
      salarySlip = new SalarySlip(salarySlipData);
      await salarySlip.save();
    }

    await salarySlip.populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

    res.status(200).json(formatResponse(true, 'Salary slip saved successfully', salarySlip));
  } catch (error) {
    const err = error as { code?: number; message?: string };
    logger.error({ err }, 'Error creating/updating salary slip');

    if (err.code === 11000) {
      res.status(400).json(formatResponse(false, 'Salary slip already exists for this employee and month/year'));
      return;
    }
    res.status(500).json(formatResponse(false, 'Server error while saving salary slip', err.message));
  }
};

export const getSalarySlip = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month, year } = req.params;

    if (!employeeId || !month || !year) {
      res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
      return;
    }

    const decodedEmployeeId = decodeURIComponent(employeeId);

    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    const filter: { employee: unknown; month: number; year: number; status?: string } = {
      employee: employee._id,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    };

    if (req.user?.role === 'employee') {
      filter.status = 'finalized';
    }

    const salarySlip = await SalarySlip.findOne(filter)
      .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

    if (!salarySlip) {
      res.status(404).json(formatResponse(false, 'Salary slip not found'));
      return;
    }

    res.status(200).json(formatResponse(true, 'Salary slip fetched successfully', salarySlip));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching salary slip');
    res.status(500).json(formatResponse(false, 'Server error while fetching salary slip', err.message));
  }
};

export const getEmployeeSalarySlips = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      res.status(400).json(formatResponse(false, 'Employee ID is required'));
      return;
    }

    const decodedEmployeeId = decodeURIComponent(employeeId);
    const { page = '1', limit = '10' } = req.query;

    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
    const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: { employee: unknown; status?: string } = { employee: employee._id };

    if (req.user?.role === 'employee') {
      filter.status = 'finalized';
    }

    const [salarySlips, total] = await Promise.all([
      SalarySlip.find(filter)
        .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(limitNum),
      SalarySlip.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json(formatResponse(true, 'Salary slips fetched successfully', {
      salarySlips,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum
      }
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching employee salary slips');
    res.status(500).json(formatResponse(false, 'Server error while fetching salary slips', err.message));
  }
};

export const getAllSalarySlips = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year, page = '1', limit = '10', employeeId, search } = req.query;

    const filter: { month?: number; year?: number; employee?: unknown } = {};
    if (month && typeof month === 'string') filter.month = parseInt(month, 10);
    if (year && typeof year === 'string') filter.year = parseInt(year, 10);

    if (employeeId && typeof employeeId === 'string') {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    }

    if (search && typeof search === 'string') {
      const employees = await Employee.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { employeeId: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      });

      const employeeIds = employees.map(emp => emp._id);
      filter.employee = { $in: employeeIds };
    }

    const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
    const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const [salarySlips, total] = await Promise.all([
      SalarySlip.find(filter)
        .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SalarySlip.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json(formatResponse(true, 'Salary slips fetched successfully', {
      salarySlips,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum
      }
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching all salary slips');
    res.status(500).json(formatResponse(false, 'Server error while fetching salary slips', err.message));
  }
};

export const deleteSalarySlip = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month, year } = req.params;

    if (!employeeId || !month || !year) {
      res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
      return;
    }

    const decodedEmployeeId = decodeURIComponent(employeeId);

    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    const salarySlip = await SalarySlip.findOneAndDelete({
      employee: employee._id,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    });

    if (!salarySlip) {
      res.status(404).json(formatResponse(false, 'Salary slip not found'));
      return;
    }

    res.status(200).json(formatResponse(true, 'Salary slip deleted successfully'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error deleting salary slip');
    res.status(500).json(formatResponse(false, 'Server error while deleting salary slip', err.message));
  }
};

export const getTaxCalculation = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { grossSalary, taxRegime = 'new' } = req.query;

    if (!grossSalary || isNaN(Number(grossSalary))) {
      res.status(400).json(formatResponse(false, 'Valid gross salary is required'));
      return;
    }

    const tempSalarySlip = new SalarySlip({
      employee: null,
      employeeId: 'temp',
      month: 1,
      year: 2025,
      earnings: { basic: 0 },
      taxRegime: typeof taxRegime === 'string' ? taxRegime : 'new',
      createdBy: null
    });

    const annualGross = parseFloat(grossSalary as string) * 12;
    const regime = typeof taxRegime === 'string' ? taxRegime : 'new';
    const annualTax = tempSalarySlip.calculateIncomeTax(annualGross, regime as 'old' | 'new');
    const monthlyTax = annualTax / 12;

    res.status(200).json(formatResponse(true, 'Tax calculation completed', {
      monthlyGross: parseFloat(grossSalary as string),
      annualGross,
      monthlyTax,
      annualTax,
      taxRegime,
      standardDeduction: taxRegime === 'new' ? 75000 : 50000,
      rebateLimit: taxRegime === 'new' ? 1200000 : 500000,
      maxRebate: taxRegime === 'new' ? 60000 : 12500
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error calculating tax');
    res.status(500).json(formatResponse(false, 'Server error while calculating tax', err.message));
  }
};

export const updateSalarySlipStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, month, year } = req.params;
    const { status } = req.body as { status: string };

    if (!status) {
      res.status(400).json(formatResponse(false, 'Status is required'));
      return;
    }

    if (!employeeId || !month || !year) {
      res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
      return;
    }

    if (!['draft', 'finalized'].includes(status)) {
      res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
      return;
    }

    const decodedEmployeeId = decodeURIComponent(employeeId);
    const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    const salarySlip = await SalarySlip.findOneAndUpdate(
      {
        employee: employee._id,
        month: parseInt(month, 10),
        year: parseInt(year, 10)
      },
      { status },
      { new: true }
    ).populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

    if (!salarySlip) {
      res.status(404).json(formatResponse(false, 'Salary slip not found'));
      return;
    }

    res.status(200).json(formatResponse(true, `Salary slip ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, salarySlip));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error updating salary slip status');
    res.status(500).json(formatResponse(false, 'Server error while updating salary slip status', err.message));
  }
};

export const bulkUpdateSalarySlipStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { salarySlips, status } = req.body as {
      salarySlips: Array<{ employeeId: string; month: number; year: number }>;
      status: string;
    };

    if (!salarySlips || !Array.isArray(salarySlips) || !status) {
      res.status(400).json(formatResponse(false, 'Salary slips array and status are required'));
      return;
    }

    if (!['draft', 'finalized'].includes(status)) {
      res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
      return;
    }

    const updatePromises = salarySlips.map(async ({ employeeId, month, year }) => {
      const employee = await Employee.findOne({ employeeId });
      if (!employee) return null;

      return SalarySlip.findOneAndUpdate(
        {
          employee: employee._id,
          month: parseInt(String(month), 10),
          year: parseInt(String(year), 10)
        },
        { status },
        { new: true }
      );
    });

    const results = await Promise.all(updatePromises);
    const updated = results.filter(result => result !== null);

    res.status(200).json(formatResponse(true, `${updated.length} salary slips ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, {
      updatedCount: updated.length,
      totalRequested: salarySlips.length
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error bulk updating salary slip status');
    res.status(500).json(formatResponse(false, 'Server error while updating salary slip status', err.message));
  }
};
