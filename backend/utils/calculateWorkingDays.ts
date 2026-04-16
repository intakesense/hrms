/**
 * Working Days Calculator
 * Calculates the number of actual working days between two dates,
 * excluding Sundays, specific Saturday holidays (e.g., 2nd Saturday),
 * and active government holidays.
 */

import Settings from '../models/Settings.model.js';
import Holiday from '../models/Holiday.model.js';
import logger from './logger.js';

export interface WorkingDaysResult {
  workingDays: number;
  excludedDays: number;
  breakdown: {
    sundays: number;
    saturdayHolidays: number;
    holidays: number;
  };
}

/**
 * Get the occurrence number of a Saturday within its month (1st, 2nd, 3rd, 4th, 5th)
 */
function getSaturdayOccurrence(date: Date): number {
  const day = date.getDate();
  return Math.ceil(day / 7);
}

/**
 * Normalize a date to YYYY-MM-DD string for easy comparison
 */
function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate the number of working days between startDate and endDate (inclusive).
 *
 * Excludes:
 * - Sundays
 * - Saturdays that match the `saturdayHolidays` setting (e.g., [2] = 2nd Saturday)
 * - Active government holidays from the Holiday model
 *
 * @param startDate - Start of the range (inclusive)
 * @param endDate - End of the range (inclusive)
 * @returns WorkingDaysResult with working days count and breakdown
 */
export async function calculateWorkingDays(
  startDate: Date,
  endDate: Date
): Promise<WorkingDaysResult> {
  // 1. Fetch global settings for Saturday holidays
  let saturdayHolidays: number[] = [];
  try {
    const settings = await Settings.getGlobalSettings();
    saturdayHolidays = settings?.attendance?.saturdayHolidays || [];
  } catch (err) {
    logger.warn({ err }, 'Could not fetch global settings for working days calculation, defaulting to no Saturday holidays');
  }

  // 2. Fetch active holidays in the date range
  const holidayDocs = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true,
  });

  // Build a Set of holiday date strings for O(1) lookup
  const holidayDateSet = new Set<string>(
    holidayDocs.map(h => toDateKey(new Date(h.date)))
  );

  // 3. Iterate through each day and count working days
  let workingDays = 0;
  let sundays = 0;
  let satHolidays = 0;
  let holidays = 0;

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday
    const dateKey = toDateKey(current);

    if (dayOfWeek === 0) {
      // Sunday — always excluded
      sundays++;
    } else if (dayOfWeek === 6 && saturdayHolidays.includes(getSaturdayOccurrence(current))) {
      // This Saturday matches a configured Saturday holiday (e.g., 2nd Saturday)
      satHolidays++;
    } else if (holidayDateSet.has(dateKey)) {
      // Government holiday — excluded
      holidays++;
    } else {
      // Working day
      workingDays++;
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return {
    workingDays,
    excludedDays: sundays + satHolidays + holidays,
    breakdown: {
      sundays,
      saturdayHolidays: satHolidays,
      holidays,
    },
  };
}
