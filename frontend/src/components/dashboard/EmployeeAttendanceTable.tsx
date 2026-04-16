import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Heart, Calendar } from 'lucide-react';
import useAuth from '@/hooks/authjwt';
import { formatTime, getISTDateString } from '@/utils/luxonUtils';
import { useEmployeeAttendanceWithAbsents, useEffectiveSettings } from '@/hooks/queries';

// Types
interface AttendanceRecord {
  _id?: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  isWorkingDay: boolean;
  holidayTitle?: string;
}

interface EmployeeInfo {
  _id?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
}

interface EmployeeAttendanceRecord {
  employee: EmployeeInfo;
  employeeName: string;
  weekData: {
    [key: string]: AttendanceRecord;
  };
}

interface StatsBreakdown {
  totalDays: number;
  weekendDays: number;
  holidayDays: number;
  workingDays: number;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  leave: number;
  weekend: number;
  breakdown: StatsBreakdown;
}

interface DateRange {
  startDate: string;
  endDate: string;
  firstDay: Date;
  lastDay: Date;
}

interface RegularizationPrefillData {
  date: Date;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  reason?: string;
}

interface EmployeeAttendanceTableProps {
  onRegularizationRequest?: (data: RegularizationPrefillData) => void;
}

// 🚀 OPTIMIZED: Employee Attendance Table with memoization
const EmployeeAttendanceTable = memo(({ onRegularizationRequest }: EmployeeAttendanceTableProps) => {
  const user = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [currentWindowIndex, setCurrentWindowIndex] = useState(0);
  const [_stats, setStats] = useState<Stats>({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    weekend: 0,
    breakdown: { totalDays: 0, weekendDays: 0, holidayDays: 0, workingDays: 0 }
  });
  const [allWorkingDays, setAllWorkingDays] = useState<Date[]>([]);
  const [workingDays, setWorkingDays] = useState<Date[]>([]);
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceRecord[]>([]);
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<EmployeeAttendanceRecord[]>([]);

  // Calculate date range for the selected month
  const dateRange = useMemo<DateRange>(() => {
    const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return {
      startDate: getISTDateString(firstDay),
      endDate: getISTDateString(lastDay),
      firstDay,
      lastDay
    };
  }, [selectedMonth]);

  // Fetch attendance data using React Query
  const { data: attendanceResponse, isLoading, error } = useEmployeeAttendanceWithAbsents({
    employeeId: user?.employeeId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  }, { enabled: !!user?.employeeId });

  // Fetch effective settings using React Query
  const { data: effectiveSettings } = useEffectiveSettings(
    attendanceResponse?.data?.employee?.department,
    { enabled: !!attendanceResponse?.data?.employee?.department }
  );

  // 🚀 OPTIMIZED: Get the current 4-day window from all working days (memoized)
  const getCurrentWindow = useMemo(() => {
    if (allWorkingDays.length === 0) return [];

    const maxStartIndex = Math.max(0, allWorkingDays.length - 4);
    const startIndex = Math.max(0, maxStartIndex - currentWindowIndex);
    const endIndex = Math.min(startIndex + 4, allWorkingDays.length);

    return allWorkingDays.slice(startIndex, endIndex);
  }, [allWorkingDays, currentWindowIndex]);

  // Process attendance data when it changes
  useEffect(() => {
    if (!attendanceResponse?.success || !attendanceResponse?.data) return;

    const response = attendanceResponse;
    const allRecords = response.data.records || [];

        // Transform the data to match the admin dashboard format
        const employeeRecord: EmployeeAttendanceRecord = {
          employee: {
            _id: response.data.employee?._id,
            employeeId: user.employeeId,
            firstName: response.data.employee?.firstName || user.name?.split(' ')[0] || 'Employee',
            lastName: response.data.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            department: response.data.employee?.department
          },
          employeeName: `${response.data.employee?.firstName || user.name?.split(' ')[0] || 'Employee'} ${response.data.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || ''}`,
          weekData: {}
        };

        // Transform records into weekData format
        allRecords.forEach((record: any) => {
          const year = new Date(record.date).getFullYear();
          const month = String(new Date(record.date).getMonth() + 1).padStart(2, '0');
          const day = String(new Date(record.date).getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;

          // Keep backend status if present (attendance record takes priority)
          // Only override with flag-based status if no actual attendance record exists
          let finalStatus = record.status || 'absent';

          // Only override status for flag-based statuses if there's no actual check-in
          // Priority: Leave > Holiday > Weekend (matching backend logic)
          if (!record.checkIn) {
            if (record.flags?.isLeave || record.status === 'leave') {
              finalStatus = 'leave';
            } else if (record.flags?.isHoliday) {
              finalStatus = 'holiday';
            } else if (record.flags?.isWeekend) {
              finalStatus = 'weekend';
            }
          }
          // If there's a check-in, trust the backend status (present/half-day/etc.)

          employeeRecord.weekData[dateKey] = {
            _id: record._id,
            checkIn: record.checkIn,
            checkOut: record.checkOut,
            status: finalStatus,
            isWorkingDay: !record.flags?.isWeekend && !record.flags?.isHoliday,
            holidayTitle: record.flags?.isHoliday ? (record.holidayTitle || 'Holiday') : undefined
          };
        });

    // Generate all calendar days for the month - trust API data completely
    const allDays: Date[] = [];
    const currentDate = new Date(dateRange.firstDay);

    while (currentDate <= dateRange.lastDay) {
      allDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setAllWorkingDays(allDays);
    setMonthlyAttendanceData([employeeRecord]);
    setAttendanceData([employeeRecord]);

    // Find initial window that includes today (if current month) or last 4 days
    const today = new Date();
    const isCurrentMonth = selectedMonth.getFullYear() === today.getFullYear() &&
                          selectedMonth.getMonth() === today.getMonth();


    let initialWindow: Date[];
    let initialWindowIndex = 0;

    if (isCurrentMonth && allDays.length > 0) {
      const todayIndex = allDays.findIndex(day =>
        day.toDateString() === today.toDateString()
      );

      if (todayIndex !== -1) {
        const endIndex = Math.min(todayIndex + 1, allDays.length);
        const startIndex = Math.max(0, endIndex - 4);
        initialWindow = allDays.slice(startIndex, startIndex + 4);
        initialWindowIndex = Math.max(0, allDays.length - 4 - startIndex);
      } else {
        initialWindow = allDays.slice(-4);
        initialWindowIndex = 0;
      }
    } else {
      initialWindow = allDays.slice(-4);
      initialWindowIndex = 0;
    }

    setCurrentWindowIndex(initialWindowIndex);
    setWorkingDays(initialWindow);

    // Calculate stats for the current window
    updateStatsForWindow([employeeRecord], initialWindow);
  }, [attendanceResponse, dateRange, selectedMonth, user]);


  // Update stats for current window
  const updateStatsForWindow = (records: EmployeeAttendanceRecord[], windowDays: Date[]): void => {
    if (windowDays.length === 0 || records.length === 0) {
      setStats({ total: 0, present: 0, absent: 0, leave: 0, weekend: 0, breakdown: { totalDays: 0, weekendDays: 0, holidayDays: 0, workingDays: 0 } });
      return;
    }

    let present = 0, absent = 0, leave = 0, weekend = 0, holiday = 0;

    windowDays.forEach(day => {
      const attendance = getAttendanceForDay(records[0], day);

      if (attendance.status === 'weekend') {
        weekend++;
      } else if (attendance.status === 'holiday') {
        holiday++;
      } else if (attendance.status === 'leave') {
        leave++;
      } else if (attendance.checkIn || attendance.checkOut) {
        present++;
      } else {
        absent++;
      }
    });

    const workingDays = windowDays.length - weekend - holiday;

    setStats({
      total: windowDays.length,
      present,
      absent,
      leave,
      weekend,
      breakdown: {
        totalDays: windowDays.length,
        weekendDays: weekend,
        holidayDays: holiday,
        workingDays: workingDays
      }
    });
  };

  const handleAttendanceClick = (record: EmployeeAttendanceRecord, day: Date): void => {
    const attendanceForDay = getAttendanceForDay(record, day);

    // Create regularization prefill data
    const prefillData: RegularizationPrefillData = {
      date: day,
      checkIn: attendanceForDay.checkIn,
      checkOut: attendanceForDay.checkOut,
      status: attendanceForDay.status,
      reason: attendanceForDay.status === 'absent' ? 'I was present but forgot to check in/out' : undefined
    };

    console.log('Opening regularization for:', {
      date: day.toISOString().split('T')[0],
      employee: record.employee?.firstName + ' ' + record.employee?.lastName,
      existingRecord: attendanceForDay
    });

    if (onRegularizationRequest) {
      onRegularizationRequest(prefillData);
    }
  };

  // Navigate the sliding window
  const navigateWindow = (direction: number): void => {
    const newWindowIndex = currentWindowIndex + direction;
    const maxWindowIndex = Math.max(0, allWorkingDays.length - 4);

    if (newWindowIndex < 0 || newWindowIndex > maxWindowIndex) {
      return;
    }

    setCurrentWindowIndex(newWindowIndex);

    const newWindow = getCurrentWindow;
    setWorkingDays(newWindow);

    updateStatsForWindow(monthlyAttendanceData, newWindow);
  };

  // Update window when currentWindowIndex changes
  useEffect(() => {
    if (allWorkingDays.length > 0) {
      const newWindow = getCurrentWindow;
      setWorkingDays(newWindow);
      updateStatsForWindow(monthlyAttendanceData, newWindow);
    }
  }, [currentWindowIndex, allWorkingDays, monthlyAttendanceData]);

  // Handle month change
  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    setSelectedMonth(newDate);
    setCurrentWindowIndex(0);
  };

  const getAttendanceIcon = (attendance: AttendanceRecord): JSX.Element => {
    if (attendance.status === 'weekend') {
      return <XCircle className="w-4 h-4 text-muted-foreground" />;
    }
    if (attendance.status === 'holiday') {
      return <Calendar className="w-4 h-4 text-orange-500" />;
    }
    if (attendance.status === 'leave') {
      return <Heart className="w-4 h-4 text-purple-500" />;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
    return <XCircle className="w-4 h-4 text-muted-foreground" />;
  };

  const getAttendanceBadgeClass = (attendance: AttendanceRecord): string => {
    const baseClasses = "w-full max-w-[85px] sm:max-w-[95px] px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center gap-1 sm:gap-1.5 min-h-[75px] sm:min-h-[85px] cursor-pointer hover:opacity-80 transition-opacity";

    if (attendance.status === 'weekend') {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }
    if (attendance.status === 'holiday') {
      return `${baseClasses} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`;
    }
    if (attendance.status === 'leave') {
      return `${baseClasses} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`;
    }
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) {
      return `${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`;
    }
    if (attendance.checkIn && attendance.checkOut) {
      return `${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`;
    }
    if (attendance.checkIn && !attendance.checkOut) {
      return `${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`;
    }
    return `${baseClasses} bg-muted text-foreground`;
  };

  const formatDayDate = (date: Date): { day: string; dateStr: string; isWeekend: boolean } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayOfWeek = date.getDay();
    const day = dayNames[dayOfWeek];
    const dateNum = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      day,
      dateStr: `${dateNum} ${month}`,
      isWeekend
    };
  };

  const getAttendanceForDay = (record: EmployeeAttendanceRecord, date: Date): AttendanceRecord => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // If data exists in API response, use it
    if (record.weekData?.[dateKey]) {
      return record.weekData[dateKey];
    }

    // If no data exists, determine status based on day type using settings
    const dayOfWeek = date.getDay();
    let status = 'absent';
    let isWorkingDay = true;

    if (effectiveSettings?.attendance) {
      const { workingDays, saturdayHolidays } = effectiveSettings.attendance;

      // Check if this day of week is in working days
      if (!workingDays.includes(dayOfWeek)) {
        status = 'weekend';
        isWorkingDay = false;
      }
      // Special handling for Saturday - check if it's a holiday Saturday
      else if (dayOfWeek === 6 && saturdayHolidays && saturdayHolidays.length > 0) {
        const saturdayWeek = getSaturdayWeekOfMonth(date);
        if (saturdayHolidays.includes(saturdayWeek)) {
          status = 'weekend';
          isWorkingDay = false;
        }
      }
    } else {
      // Fallback to hardcoded logic if settings not loaded
      if (dayOfWeek === 0) {
        status = 'weekend';
        isWorkingDay = false;
      }
      else if (dayOfWeek === 6) {
        const dateNum = date.getDate();
        const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
        const secondSaturday = firstSaturday + 7;

        if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
          status = 'weekend';
          isWorkingDay = false;
        }
      }
    }

    return {
      checkIn: null,
      checkOut: null,
      status: status,
      isWorkingDay: isWorkingDay,
      holidayTitle: undefined
    };
  };

  // Helper function to determine which Saturday of the month a given date is
  const getSaturdayWeekOfMonth = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateNum = date.getDate();

    // Find the first Saturday of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();

    // Calculate first Saturday date (0=Sunday, 6=Saturday)
    const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;

    // Calculate which Saturday this date is
    const saturdayWeek = Math.ceil((dateNum - firstSaturday + 1) / 7);

    return Math.max(1, Math.min(4, saturdayWeek)); // Ensure it's between 1-4
  };

  const getAttendanceStatusText = (attendance: AttendanceRecord): string | null => {
    if (attendance.status === 'weekend') return 'Weekend';
    if (attendance.status === 'holiday') return attendance.holidayTitle || 'Holiday';
    if (attendance.status === 'leave') return 'Leave';
    if (attendance.status === 'absent' || (!attendance.checkIn && !attendance.checkOut)) return 'Absent';
    if (attendance.checkIn && !attendance.checkOut) return null;
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Attendance Overview
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          My Attendance Overview
        </h3>
        <div className="text-center text-red-500 py-4">
          <p>{error?.message || 'Failed to load attendance data'}</p>
        </div>
      </div>
    );
  }

  if (attendanceData.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          My Attendance Overview
        </h3>
        <div className="text-center text-muted-foreground py-8">
          <p className="text-lg font-medium">No attendance data found</p>
          <p className="text-sm">Your attendance records will appear here</p>
        </div>
      </div>
    );
  }

  const record = attendanceData[0]; // Since we only have one employee record

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border 50 dark:border-border 50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      {/* Navigation Controls */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Attendance</h3>
        <div className="flex items-center gap-3">
        <button
          onClick={() => navigateWindow(1)}
          className="p-2 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Previous 4 days"
          disabled={currentWindowIndex >= Math.max(0, allWorkingDays.length - 4)}
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <select
          value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
          onChange={handleMonthChange}
          className="text-sm bg-muted text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm min-w-[90px]"
        >
          {(() => {
            const options = [];
            const today = new Date();
            const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let i = 0; i < 12; i++) {
              const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
              const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              const monthShort = monthShortNames[date.getMonth()];
              const yearShort = String(date.getFullYear()).slice(-2);
              const label = `${monthShort} ${yearShort}`;
              options.push(
                <option key={value} value={value}>
                  {label}
                </option>
              );
            }
            return options;
          })()}
        </select>
        <button
          onClick={() => navigateWindow(-1)}
          className="p-2 rounded-lg bg-muted hover:bg-muted transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Next 4 days"
          disabled={currentWindowIndex <= 0}
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        </div>
      </div>

      {/* Table Layout */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted border-b border-border dark:border-border">
              <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">Date</th>
              {workingDays.map((day, index) => {
                const { day: dayName, dateStr, isWeekend } = formatDayDate(day);
                return (
                  <th key={index} className={`text-center py-2 sm:py-4 px-1 sm:px-2 font-semibold text-xs sm:text-sm min-w-[75px] sm:min-w-[95px] ${
                    isWeekend
                      ? 'text-muted-foreground'
                      : 'text-foreground'
                  }`}>
                    <div className="flex flex-col items-center">
                      <span className={isWeekend ? 'text-muted-foreground' : ''}>{dayName}</span>
                      <span className={`text-xs ${
                        isWeekend
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                      }`}>{dateStr}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            <tr className="hover:bg-muted dark:hover:bg-muted 30 transition-colors bg-card">
              <td className="py-2 sm:py-4 px-2 sm:px-4">
                <div className="font-medium text-sm sm:text-base text-foreground">
                  {record.employeeName ? record.employeeName.split(' ')[0] : 'Attendance'}
                </div>
              </td>
              {workingDays.map((day, dayIndex) => {
                const dayAttendance = getAttendanceForDay(record, day);
                return (
                  <td key={dayIndex} className="py-2 sm:py-4 px-1 sm:px-2">
                    <div
                      className="flex justify-center cursor-pointer hover:bg-muted dark:hover:bg-muted rounded-lg p-1 sm:p-2"
                      onClick={() => handleAttendanceClick(record, day)}
                    >
                      <div className={getAttendanceBadgeClass(dayAttendance)}>
                        {getAttendanceIcon(dayAttendance)}
                        {getAttendanceStatusText(dayAttendance) && (
                          <span className="text-xs sm:text-xs font-medium text-center leading-tight">{getAttendanceStatusText(dayAttendance)}</span>
                        )}
                        {dayAttendance.checkIn && (
                          <div className="text-xs sm:text-xs font-mono opacity-80 text-center leading-tight">
                            <div className="truncate">{formatTime(dayAttendance.checkIn)}</div>
                            {dayAttendance.checkOut && (
                              <div className="truncate">{formatTime(dayAttendance.checkOut)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});

EmployeeAttendanceTable.displayName = 'EmployeeAttendanceTable';

export default EmployeeAttendanceTable;