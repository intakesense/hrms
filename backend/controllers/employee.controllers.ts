import type { Response } from 'express';
import Employee from '../models/Employee.model.js';
import Department from '../models/Department.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

export const createEmployee = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const {
    employeeId,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    maritalStatus,
    email,
    phone,
    address,
    aadhaarNumber,
    panNumber,
    fatherName,
    motherName,
    fatherPhone,
    motherPhone,
    officeAddress,
    companyName,
    department,
    position,
    paymentMode,
    bankName,
    bankAccountNumber,
    bankIFSCCode,
    employmentType,
    reportingSupervisor,
    joiningDate,
    emergencyContactName,
    emergencyContactNumber
  } = req.body as {
    employeeId: string;
    firstName: string;
    lastName: string;
    gender?: string;
    dateOfBirth?: string;
    maritalStatus?: string;
    email: string;
    phone?: string;
    address?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    fatherName?: string;
    motherName?: string;
    fatherPhone?: string;
    motherPhone?: string;
    officeAddress?: string;
    companyName?: string;
    department?: string;
    position?: string;
    paymentMode?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankIFSCCode?: string;
    employmentType?: string;
    reportingSupervisor?: string;
    joiningDate?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
  };

  const existingEmployee = await Employee.findOne({
    $or: [
      { employeeId },
      { email },
      { aadhaarNumber },
      { panNumber }
    ]
  });

  if (existingEmployee) {
    throw new ValidationError('Employee already exists with same employee ID, email, Aadhaar number, or PAN number.');
  }

  if (department && department.trim()) {
    const departmentExists = await Department.findOne({
      name: department.trim(),
      isActive: true
    });

    if (!departmentExists) {
      throw new ValidationError(`Department '${department}' does not exist. Please select from available departments.`);
    }
  }

  const employee = await Employee.create({
    employeeId,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    maritalStatus,
    email,
    phone,
    address,
    aadhaarNumber,
    panNumber,
    fatherName,
    motherName,
    fatherPhone,
    motherPhone,
    officeAddress,
    companyName,
    department,
    position,
    paymentMode,
    bankName,
    bankAccountNumber,
    bankIFSCCode,
    employmentType,
    reportingSupervisor,
    joiningDate,
    emergencyContactName,
    emergencyContactNumber
  });

  res.status(201).json(formatResponse(true, 'Employee created successfully', { employee }));
});

export const getEmployees = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: { isActive?: boolean } = {};

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    const employees = await Employee.find(filter).select('-__v').sort({ createdAt: -1 });
    const employeeList = employees.map(employee => ({
      _id: employee._id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      bankName: employee.bankName,
      bankAccountNumber: employee.bankAccountNumber,
      panNumber: employee.panNumber,
      joiningDate: employee.joiningDate,
      companyName: employee.companyName,
      isActive: employee.isActive
    }));
    res.json(formatResponse(true, 'Employees fetched successfully', { employees: employeeList }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch employees');
    res.status(500).json(formatResponse(false, 'Failed to fetch employees', null, { error: error.message }));
  }
};

export const updateEmployee = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as Record<string, unknown>;

    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    if (updateData.department && typeof updateData.department === 'string' && updateData.department.trim()) {
      const departmentExists = await Department.findOne({
        name: updateData.department.trim(),
        isActive: true
      });

      if (!departmentExists) {
        res.status(400).json(formatResponse(
          false,
          `Department '${updateData.department}' does not exist. Please select from available departments.`
        ));
        return;
      }
    }

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    res.json(formatResponse(true, 'Employee updated successfully', { employee }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Update failed');
    res.status(500).json(formatResponse(false, 'Update failed', null, { error: error.message }));
  }
};

export const getProfile = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required'));
      return;
    }

    const userEmail = req.user.email;
    const employeeId = req.user.employeeId;

    let employee = await Employee.findOne({ email: userEmail });

    if (!employee && employeeId) {
      employee = await Employee.findOne({ employeeId });
    }

    if (!employee && req.user.role === 'employee') {
      res.status(200).json(formatResponse(
        true,
        'Basic profile retrieved from user account',
        {
          firstName: req.user.name.split(' ')[0] || req.user.name,
          lastName: req.user.name.split(' ').slice(1).join(' ') || '',
          email: req.user.email,
          employeeId: req.user.employeeId,
          position: 'Not specified',
          department: 'Not assigned',
          isPartialProfile: true
        }
      ));
      return;
    }

    if (!employee) {
      res.status(404).json(formatResponse(
        false,
        'Profile not found'
      ));
      return;
    }

    res.status(200).json(formatResponse(true, 'Profile fetched successfully', employee.toObject()));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error fetching profile');
    res.status(500).json(formatResponse(false, 'Error fetching profile', null, { error: error.message }));
  }
};

export const getEmployeeById = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }
    res.json(formatResponse(true, 'Employee fetched successfully', employee));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch employee');
    res.status(500).json(formatResponse(false, 'Failed to fetch employee', null, { error: error.message }));
  }
};

export const toggleEmployeeStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    const user = await User.findOne({ employeeId: employee.employeeId });
    if (user) {
      user.isActive = employee.isActive;
      await user.save();
      logger.info({ email: user.email, isActive: user.isActive }, `User account status synced with employee status`);
    }

    res.json(formatResponse(
      true,
      `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      {
        _id: employee._id,
        employeeId: employee.employeeId,
        fullName: `${employee.firstName} ${employee.lastName}`,
        isActive: employee.isActive
      }
    ));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Toggle employee status error');
    res.status(500).json(formatResponse(false, 'Failed to toggle employee status', null, { error: error.message }));
  }
};
