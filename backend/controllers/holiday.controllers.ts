import type { Request, Response } from 'express';
import Holiday from '../models/Holiday.model.js';
import notificationService from '../utils/notificationService.js';
import { parseISTDateString } from '../utils/timezone.js';
import logger from '../utils/logger.js';
import type { IHoliday } from '../types/index.js';

// ============================================================================
// HELPER FUNCTIONS - Extracted to avoid code duplication
// ============================================================================

/**
 * Transform a holiday document to match frontend expectations
 * Maps model fields (name, type) to frontend fields (title, isOptional)
 */
const transformHolidayForResponse = (holiday: IHoliday) => ({
  _id: holiday._id,
  title: holiday.name,
  date: holiday.date,
  description: holiday.description,
  isOptional: holiday.type === 'optional',
  type: holiday.type,
  isActive: holiday.isActive,
  createdAt: holiday.createdAt,
  updatedAt: holiday.updatedAt,
});

/**
 * Parse and validate a date string, returning UTC midnight for consistent storage
 * MongoDB stores dates in UTC, so we use UTC midnight to ensure
 * toISOString().split('T')[0] returns the correct date everywhere
 * @throws Error with user-friendly message if date is invalid
 */
const parseHolidayDate = (dateString: string): Date => {
  const parsedDate = parseISTDateString(dateString);
  const year = parsedDate.year;
  const month = parsedDate.month;
  const day = parsedDate.day;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

/**
 * Determine holiday type from request body
 * Supports both 'type' (preferred) and 'isOptional' (backward compatibility)
 */
const determineHolidayType = (type?: string, isOptional?: boolean): string => {
  if (type) return type;
  return isOptional ? 'optional' : 'public';
};

/**
 * Send holiday notification with error handling
 * Logs errors but doesn't throw to avoid failing the main operation
 */
const sendHolidayNotificationSafe = async (
  holidayId: string,
  title: string,
  description: string,
  date: Date
): Promise<void> => {
  try {
    await notificationService.sendHolidayNotification({
      _id: holidayId,
      title,
      description: description || '',
      date,
    });
  } catch (notificationError) {
    const error = notificationError instanceof Error
      ? notificationError
      : new Error('Unknown notification error');
    logger.error({ err: error }, 'Failed to send holiday notification');
  }
};

/**
 * Extract holiday name from request body
 * Supports both 'name' (preferred) and 'title' (backward compatibility)
 */
const getHolidayName = (name?: string, title?: string): string | undefined => {
  return name || title;
};

// ============================================================================
// CONTROLLERS
// ============================================================================

export const createHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, name, date, isOptional, type, description } = req.body;
    const holidayName = getHolidayName(name, title);

    if (!holidayName || !date) {
      res.status(400).json({ success: false, message: 'Name/Title and date are required for a holiday.' });
      return;
    }

    // Parse and validate date
    let holidayDate: Date;
    try {
      holidayDate = parseHolidayDate(date);
    } catch (dateError) {
      const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        error: error.message,
      });
      return;
    }

    const holiday = await Holiday.create({
      name: holidayName,
      date: holidayDate,
      type: determineHolidayType(type, isOptional),
      description
    });

    // Send notification (non-blocking)
    await sendHolidayNotificationSafe(holiday._id.toString(), holidayName, description || '', holidayDate);

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      holiday: transformHolidayForResponse(holiday)
    });
  } catch (err) {
    const error = err as { code?: number; message: string };
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'A holiday with this date already exists.', error: error.message });
      return;
    }
    logger.error({ err }, 'Holiday creation error');
    res.status(500).json({ success: false, message: 'Holiday creation failed. Please check server logs.', error: error.message });
  }
};

export const getHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    const transformedHolidays = holidays.map(transformHolidayForResponse);
    res.status(200).json({ success: true, holidays: transformedHolidays });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err }, 'Fetch holidays error');
    res.status(500).json({ success: false, message: 'Failed to fetch holidays. Please check server logs.', error: error.message });
  }
};

export const updateHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidayId = req.params.id;
    const { title, name, date, isOptional, type, description } = req.body;

    if (Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: 'No update data provided.' });
      return;
    }

    const holidayToUpdate = await Holiday.findById(holidayId);
    if (!holidayToUpdate) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    // Parse date if provided
    let newDateObj: Date | undefined;
    if (date) {
      try {
        newDateObj = parseHolidayDate(date);
      } catch (dateError) {
        const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD format.',
          error: error.message,
        });
        return;
      }

      // Check for duplicate date
      if (holidayToUpdate.date.getTime() !== newDateObj.getTime()) {
        const existingHoliday = await Holiday.findOne({ date: newDateObj, _id: { $ne: holidayId } });
        if (existingHoliday) {
          res.status(409).json({ success: false, message: 'Another holiday with this date already exists.' });
          return;
        }
      }
    }

    // Build update payload
    const holidayName = getHolidayName(name, title);
    const updatePayload: { name?: string; date?: Date; type?: string; description?: string } = {};

    if (holidayName !== undefined) updatePayload.name = holidayName;
    if (newDateObj !== undefined) updatePayload.date = newDateObj;
    if (type !== undefined || isOptional !== undefined) {
      updatePayload.type = determineHolidayType(type, isOptional);
    }
    if (description !== undefined) updatePayload.description = description;

    if (Object.keys(updatePayload).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update were provided.' });
      return;
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(holidayId, updatePayload, { new: true, runValidators: true });

    if (!updatedHoliday) {
      res.status(404).json({ success: false, message: 'Holiday not found after update' });
      return;
    }

    // Send notification if name or date changed
    if (holidayName !== undefined || date !== undefined) {
      await sendHolidayNotificationSafe(
        updatedHoliday._id.toString(),
        updatePayload.name || updatedHoliday.name,
        updatePayload.description || description || '',
        updatePayload.date || updatedHoliday.date
      );
    }

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      holiday: transformHolidayForResponse(updatedHoliday)
    });
  } catch (err) {
    const error = err as { code?: number; message: string };
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'A holiday with this date already exists (during update).', error: error.message });
      return;
    }
    logger.error({ err }, 'Update holiday error');
    res.status(500).json({ success: false, message: 'Failed to update holiday. Please check server logs.', error: error.message });
  }
};

export const deleteHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidayId = req.params.id;
    const holiday = await Holiday.findByIdAndDelete(holidayId);

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err }, 'Delete holiday error');
    res.status(500).json({ success: false, message: 'Failed to delete holiday. Please check server logs.', error: error.message });
  }
};
