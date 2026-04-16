/**
 * Expense Model - TypeScript + Mongoose
 * Company expense tracking with approval workflow
 */

import mongoose, { Schema, type Model } from 'mongoose';
import type { IExpense, ExpenseStatus } from '../types/index.js';

const expenseSchema = new Schema<IExpense>(
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
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      index: true,
    },
    item: {
      type: String,
      required: [true, 'Expense item/description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'] as ExpenseStatus[],
        message: 'Status must be one of: pending, approved, rejected',
      },
      default: 'pending',
      required: true,
      index: true,
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review comment cannot exceed 500 characters'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ status: 1, date: -1 });

const Expense = mongoose.model<IExpense>('Expense', expenseSchema);

export default Expense;
