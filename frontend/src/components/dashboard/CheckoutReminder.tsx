import { useState } from 'react';
import { AlertTriangle, Clock, X, Calendar } from 'lucide-react';
import { formatISTDate, formatTime } from '@/utils/luxonUtils';

interface Attendance {
  _id?: string;
  date: string;
  checkIn: string | Date;
  checkOut?: string | Date | null;
}

interface RegularizationData {
  date: string;
  checkIn: string | Date;
  suggestedCheckOut: Date;
}

interface CheckoutReminderProps {
  missingCheckouts: Attendance[] | null | undefined;
  onRegularizationRequest: (data: RegularizationData) => void;
  onDismiss?: () => void;
}

const CheckoutReminder = ({ missingCheckouts, onRegularizationRequest, onDismiss }: CheckoutReminderProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!missingCheckouts || missingCheckouts.length === 0) {
    return null;
  }

  // Use centralized utility functions
  const formatDate = (date: string | Date) => formatISTDate(new Date(date), { customFormat: 'EEE MMM dd, yyyy' });

  const handleRegularizationClick = (attendance: Attendance) => {
    // Create default check-in and check-out times for the attendance date
    const attendanceDate = new Date(attendance.date);

    // Default check-in: 09:30 AM IST
    const defaultCheckIn = new Date(attendanceDate);
    defaultCheckIn.setHours(9, 30, 0, 0);

    // Default check-out: 05:30 PM IST
    const defaultCheckOut = new Date(attendanceDate);
    defaultCheckOut.setHours(17, 30, 0, 0);

    onRegularizationRequest({
      date: attendance.date,
      checkIn: attendance.checkIn || defaultCheckIn,
      // Use default 05:30 PM checkout time
      suggestedCheckOut: defaultCheckOut
    });
  };

  if (!isExpanded) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200 truncate">
              {missingCheckouts.length} missing checkout{missingCheckouts.length > 1 ? 's' : ''} require attention
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-xs sm:text-sm whitespace-nowrap"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 sm:p-6 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-amber-900 dark:text-amber-100">
              Missing Checkout Reminder
            </h3>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
              You have {missingCheckouts.length} day{missingCheckouts.length > 1 ? 's' : ''} where you forgot to check out
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 p-1"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-xs sm:text-sm font-medium px-2 py-1 rounded whitespace-nowrap"
              title="Dismiss all reminders"
            >
              Dismiss All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {missingCheckouts.map((attendance, index) => (
          <div
            key={attendance._id || index}
            className="bg-white dark:bg-card rounded-lg p-3 sm:p-4 border border-amber-100 dark:border-amber-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">{formatDate(attendance.date)}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Check-in: {formatTime(attendance.checkIn)}</span>
                </div>
                <div className="text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium">
                  No checkout recorded
                </div>
              </div>
              <button
                onClick={() => handleRegularizationClick(attendance)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 w-full sm:w-auto whitespace-nowrap"
              >
                Request Regularization
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-800/30 rounded-lg">
        <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
          <strong>💡 Tip:</strong> To avoid this in the future, make sure to check out before leaving the office.
          You can submit a regularization request to add your missing checkout time.
        </p>
      </div>
    </div>
  );
};

export default CheckoutReminder;
