/**
 * Leave Model - TypeScript + Mongoose
 * Employee leave management with approval workflow
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { ILeave, LeaveType, LeaveStatus } from '../types/index.js';

const leaveSchema = new Schema<ILeave>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required'],
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    leaveType: {
      type: String,
      enum: {
        values: ['full-day', 'half-day'],
        message: 'Leave type must be one of: full-day, half-day',
      },
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (this: ILeave, value: Date): boolean {
          return value >= this.startDate;
        },
        message: 'End date must be on or after start date',
      },
    },
    reason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'] as LeaveStatus[],
        message: 'Status must be one of: pending, approved, rejected',
      },
      default: 'pending',
      required: true,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: [0.5, 'Number of days must be at least 0.5'],
      max: [365, 'Number of days cannot exceed 365'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Pre-save hook: Calculate number of days automatically
 */
leaveSchema.pre('save', function (next) {
  // Only auto-calculate if numberOfDays was NOT already set by the controller
  // (e.g., via calculateWorkingDays utility for multi-day leaves)
  if ((this.isModified('startDate') || this.isModified('endDate')) && !this.numberOfDays) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.numberOfDays = diffDays + 1; // Include both start and end dates
  }
  next();
});

// Indexes for performance optimization
leaveSchema.index({ employee: 1, status: 1 }); // Employee leave queries with status filter
leaveSchema.index({ status: 1, startDate: 1 }); // Status-based queries with date sorting
leaveSchema.index({ startDate: 1, endDate: 1, status: 1 }); // Date range queries for approved leaves
leaveSchema.index({ employee: 1, startDate: -1 }); // Employee leave history

/**
 * Virtual: Check if leave is active (pending or approved)
 */
leaveSchema.virtual('isActive').get(function (this: ILeave) {
  return this.status === 'pending' || this.status === 'approved';
});

/**
 * Virtual: Check if leave is in the future
 */
leaveSchema.virtual('isFuture').get(function (this: ILeave) {
  return new Date(this.startDate) > new Date();
});

/**
 * Static method: Find pending leaves
 */
leaveSchema.statics.findPending = function () {
  return this.find({ status: 'pending' })
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ startDate: 1 });
};

/**
 * Static method: Find approved leaves in date range
 */
leaveSchema.statics.findApprovedInRange = function (startDate: Date, endDate: Date) {
  return this.find({
    status: 'approved',
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      {
        $and: [{ startDate: { $lte: startDate } }, { endDate: { $gte: endDate } }],
      },
    ],
  }).populate('employee', 'firstName lastName employeeId');
};

/**
 * Static method: Find employee leaves for a specific month
 */
leaveSchema.statics.findByEmployeeMonth = function (
  employeeId: mongoose.Types.ObjectId,
  year: number,
  month: number
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.find({
    employee: employeeId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
  }).sort({ startDate: -1 });
};

/**
 * Instance method: Approve leave
 */
leaveSchema.methods.approve = function (this: ILeave, approvedBy: mongoose.Types.ObjectId) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.rejectionReason = undefined;
  return this.save();
};

/**
 * Instance method: Reject leave
 */
leaveSchema.methods.reject = function (
  this: ILeave,
  rejectedBy: mongoose.Types.ObjectId,
  reason: string
) {
  this.status = 'rejected';
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Extend ILeave interface with custom properties and methods
declare module '../types/index.js' {
  interface ILeave {
    isActive: boolean;
    isFuture: boolean;
    approve(approvedBy: mongoose.Types.ObjectId): Promise<ILeave>;
    reject(rejectedBy: mongoose.Types.ObjectId, reason: string): Promise<ILeave>;
  }
}

// Extend model with static methods
interface ILeaveModel extends Model<ILeave> {
  findPending(): Promise<ILeave[]>;
  findApprovedInRange(startDate: Date, endDate: Date): Promise<ILeave[]>;
  findByEmployeeMonth(
    employeeId: mongoose.Types.ObjectId,
    year: number,
    month: number
  ): Promise<ILeave[]>;
}

const Leave = mongoose.model<ILeave, ILeaveModel>('Leave', leaveSchema);

export default Leave;
