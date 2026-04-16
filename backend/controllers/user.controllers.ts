import type { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import { generateTokenFromUser } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import type { IAuthRequest } from '../types/index.js';

export const register = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { name, email, password, role, employeeId } = req.body as {
    name: string;
    email: string;
    password: string;
    role: string;
    employeeId?: string;
  };

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    employee?: unknown;
    employeeId?: string;
  } = {
    name,
    email,
    password: hashedPassword,
    role
  };

  if (role === 'employee') {
    if (!employeeId) {
      throw new ValidationError('Employee ID is required for employee users');
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      throw new NotFoundError('Employee not found for given employeeId');
    }

    userData.employee = employee._id;
    userData.employeeId = employee.employeeId;
  }

  const user = await User.create(userData);
  res.status(201).json({ success: true, message: 'User registered successfully', user });
});

export const login = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isActive === false) {
    throw new ValidationError('Account has been deactivated. Please contact HR.');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ValidationError('Invalid credentials');
  }

  // Generate token with all user data
  const token = generateTokenFromUser(user);

  res.json({ success: true, message: 'Login successful', token });
});

export const forgotPassword = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000);
  await user.save();

  res.json({
    success: true,
    message: 'Password reset token generated. Use this token to reset your password within the next hour.',
    resetToken
  });
});

export const resetPassword = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ValidationError('Invalid or expired token');
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password has been reset successfully' });
});

export const updateEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { userId, employeeId } = req.body as { userId: string; employeeId: string };

  if (!userId || !employeeId) {
    throw new ValidationError('User ID and Employee ID are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  user.employee = employee._id;
  user.employeeId = employee.employeeId;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User successfully linked to employee profile',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee: user.employee,
      employeeId: user.employeeId
    }
  });
});

export const findUsersWithMissingEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const users = await User.find({
    role: 'employee',
    $or: [
      { employee: { $exists: false } },
      { employee: null },
      { employeeId: { $exists: false } },
      { employeeId: null },
      { employeeId: '' }
    ]
  });

  res.status(200).json({
    success: true,
    count: users.length,
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }))
  });
});

export const getUserByEmployeeId = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    throw new ValidationError('Employee ID parameter is required');
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    throw new NotFoundError('Employee not found for this employeeId');
  }

  const user = await User.findOne({ employee: employee._id });
  if (!user) {
    throw new NotFoundError('User not found for this employeeId');
  }

  res.json({ userId: user._id, employee: user.employee });
});

export const getAllUsers = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const users = await User.find().populate('employee');
  res.json({ users });
});
