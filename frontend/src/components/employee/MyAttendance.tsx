import React, { useEffect, useState } from "react";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight, BarChart3, TrendingUp } from "lucide-react";
import { LucideIcon } from "lucide-react";
import useAuth from "../../hooks/authjwt";
import { formatISTDate } from "../../utils/luxonUtils";
import { useHolidays, useEmployeeAttendanceWithAbsents } from "@/hooks/queries";

// Types
interface AttendanceFlags {
  isHoliday?: boolean;
  isWeekend?: boolean;
  isLate?: boolean;
  isLeave?: boolean;
}

interface AttendanceRecord {
  _id?: string;
  date: Date;
  status: 'present' | 'absent' | 'half-day' | 'weekend' | 'holiday' | 'leave';
  checkIn: Date | null;
  checkOut: Date | null;
  workHours?: number;
  comments?: string;
  reason?: string;
  flags: AttendanceFlags;
  holidayTitle?: string;
}

interface AttendanceStatistics {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  weekend: number;
  holiday: number;
  leave: number;
  late: number;
  totalWorkHours: number;
  attendancePercentage: string;
  workingDays: number;
  avgHoursPerDay: string;
  incompleteCheckouts: number;
}

interface AttendancePercentage {
  totalWorkingDays: number;
  percentage: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface EffectiveDateRange {
  requestedStartDate: string;
  effectiveStartDate: string;
  joiningDate: string;
}

interface MainCard {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  progress: number;
  subtitle?: string;
  description: string;
  tooltip?: string;
}

interface AttendanceAnalyticsProps {
  attendance: AttendanceRecord[];
  statistics: AttendanceStatistics | null;
  loading: boolean;
  attendancePercentage: AttendancePercentage | null;
}

// Enhanced Personal Attendance Analytics with Premium UX
const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({
  attendance,
  statistics,
  loading,
  attendancePercentage
}) => {
  // Always use backend statistics - no fallback to ensure consistency
  const stats = statistics;

  if (!stats && !loading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/50 dark:to-cyan-800/50 rounded-2xl mb-6">
          <TrendingUp className="w-10 h-10 text-cyan-500" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">No Data Available</h3>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Unable to load attendance statistics. Please try refreshing the page.</p>
      </div>
    );
  }

  const mainCards: MainCard[] = [
    {
      title: 'Working Days',
      value: attendancePercentage?.totalWorkingDays || (stats!.total - (stats!.weekend || 0) - (stats!.holiday || 0)),
      icon: Calendar,
      gradient: 'from-blue-400 via-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 via-blue-100 to-blue-200 dark:from-blue-900/20 dark:via-blue-800/30 dark:to-blue-700/40',
      iconBg: 'bg-blue-500',
      progress: 100,
      description: 'Total business days',
      tooltip: `Excludes ${stats!.weekend || 0} weekends and ${stats!.holiday || 0} holidays from total ${stats!.total} days`
    },
    {
      title: 'Present Days',
      value: stats!.present || 0,
      icon: CheckCircle,
      gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
      bgGradient: 'from-emerald-50 via-emerald-100 to-emerald-200 dark:from-emerald-900/20 dark:via-emerald-800/30 dark:to-emerald-700/40',
      iconBg: 'bg-emerald-500',
      progress: parseFloat(String(attendancePercentage?.percentage || 0)),
      subtitle: `${attendancePercentage?.percentage || 0}% attendance rate`,
      description: 'Days you were present'
    },
    {
      title: 'Attendance Score',
      value: `${attendancePercentage?.percentage || 0}%`,
      icon: TrendingUp,
      gradient: (attendancePercentage?.percentage || 0) >= 90 ? 'from-green-400 via-green-500 to-green-600' :
        (attendancePercentage?.percentage || 0) >= 75 ? 'from-yellow-400 via-yellow-500 to-yellow-600' :
          'from-red-400 via-red-500 to-red-600',
      bgGradient: (attendancePercentage?.percentage || 0) >= 90 ? 'from-green-50 via-green-100 to-green-200 dark:from-green-900/20 dark:via-green-800/30 dark:to-green-700/40' :
        (attendancePercentage?.percentage || 0) >= 75 ? 'from-yellow-50 via-yellow-100 to-yellow-200 dark:from-yellow-900/20 dark:via-yellow-800/30 dark:to-yellow-700/40' :
          'from-red-50 via-red-100 to-red-200 dark:from-red-900/20 dark:via-red-800/30 dark:to-red-700/40',
      iconBg: (attendancePercentage?.percentage || 0) >= 90 ? 'bg-green-500' : (attendancePercentage?.percentage || 0) >= 75 ? 'bg-yellow-500' : 'bg-red-500',
      progress: parseFloat(String(attendancePercentage?.percentage || 0)),
      subtitle: (attendancePercentage?.percentage || 0) >= 90 ? 'Excellent!' : (attendancePercentage?.percentage || 0) >= 75 ? 'Good' : 'Needs improvement',
      description: 'Overall performance'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mainCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${card.bgGradient} rounded-3xl p-5 sm:p-6 shadow-xl border border-white/50 dark:border-gray-700/50 transition-all duration-500 hover:shadow-2xl hover:scale-105 group overflow-hidden`}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-500"></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider opacity-80">
                      {card.title}
                    </p>
                    <h3 className="text-3xl lg:text-4xl font-black text-gray-800 dark:text-white">
                      {card.value}
                    </h3>
                    {card.subtitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`${card.iconBg} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform duration-300`} title={card.tooltip}>
                    <IconComponent className="w-7 h-7" />
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{card.description}</span>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{Math.round(card.progress)}%</span>
                  </div>
                  <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${card.gradient} rounded-full shadow-sm transition-all duration-1000 ease-out relative`}
                      style={{ width: `${Math.min(card.progress, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Stats */}
      {((stats!.absent > 0) || (stats!.halfDay > 0) || (stats!.late > 0) || (stats!.weekend > 0) || (stats!.holiday > 0) || (stats!.leave > 0) || (stats!.incompleteCheckouts > 0)) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Additional Insights</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats!.absent > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                <XCircle className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats!.absent}</p>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Absent Days</p>
              </div>
            )}
            {stats!.halfDay > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats!.halfDay}</p>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Half Days</p>
              </div>
            )}
            {stats!.late > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-6 h-6 text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats!.late}</p>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Late Days</p>
              </div>
            )}
            {stats!.weekend > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                <Calendar className="w-6 h-6 text-slate-500 mb-2" />
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats!.weekend}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-400">Weekends</p>
              </div>
            )}
            {stats!.holiday > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                <Calendar className="w-6 h-6 text-orange-500 mb-2" />
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats!.holiday}</p>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Holidays</p>
              </div>
            )}
            {stats!.leave > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                <Calendar className="w-6 h-6 text-purple-500 mb-2" />
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats!.leave}</p>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Leave Days</p>
              </div>
            )}
            {stats!.incompleteCheckouts > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                <AlertCircle className="w-6 h-6 text-orange-500 mb-2" />
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats!.incompleteCheckouts}</p>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Invalid Days</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function MyAttendance() {
  const user = useAuth();
  // Core data states - optimized with sliding window
  const [allAttendanceData, setAllAttendanceData] = useState<AttendanceRecord[]>([]); // Pre-loaded data for entire range
  const [displayedData, setDisplayedData] = useState<AttendanceRecord[]>([]); // Current window of data
  const [currentWindowIndex, setCurrentWindowIndex] = useState<number>(0); // Index for sliding window
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), // First day of current month
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) // Last day of current month
  });
  const [joiningDate, setJoiningDate] = useState<string | null>(null);
  const [effectiveDateRange, setEffectiveDateRange] = useState<EffectiveDateRange | null>(null);

  const recordsPerPage = 15;

  // Fetch holidays using React Query
  const { data: holidays = [] } = useHolidays();

  // Fetch attendance data using React Query
  const {
    data: attendanceData,
    isLoading: loading,
    refetch: refetchAttendance
  } = useEmployeeAttendanceWithAbsents({
    employeeId: user?.employeeId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  }, {
    enabled: !!user?.employeeId
  });

  // Hook returns { success, data: { statistics, attendancePercentage, records, employee, ... } }
  const apiData = attendanceData?.data;
  const statistics = apiData?.statistics || null;
  const attendancePercentage = apiData?.attendancePercentage || null;

  // Process attendance data from React Query when it changes
  useEffect(() => {
    if (apiData) {
      const allRecords = apiData.records || [];

      // Store joining date and effective date range info
      if (apiData.employee?.joiningDate) {
        setJoiningDate(apiData.employee.joiningDate);
      }
      if (apiData.dateRange) {
        setEffectiveDateRange(apiData.dateRange);
      }

      // Process and store all data with proper status prioritization
      const processedRecords = allRecords.map((record: any) => {
        let finalStatus = record.status || 'absent';

        // Only override status for flag-based statuses if there's no actual check-in
        if (!record.checkIn) {
          if (record.flags?.isLeave || record.status === 'leave') {
            finalStatus = 'leave';
          } else if (record.flags?.isHoliday) {
            finalStatus = 'holiday';
          } else if (record.flags?.isWeekend) {
            finalStatus = 'weekend';
          }
        }

        return {
          ...record,
          status: finalStatus,
          date: new Date(record.date),
          checkIn: record.checkIn ? new Date(record.checkIn) : null,
          checkOut: record.checkOut ? new Date(record.checkOut) : null,
          flags: record.flags || {},
          holidayTitle: record.holidayTitle || (record.flags?.isHoliday ? 'Holiday' : undefined)
        };
      });

      // Sort records by date in descending order
      const sortedRecords = processedRecords.sort((a: AttendanceRecord, b: AttendanceRecord) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllAttendanceData(sortedRecords);
      updateCurrentWindow(sortedRecords, 0);
    }
  }, [apiData]);

  // Update current window (no API call needed)
  const updateCurrentWindow = (data: AttendanceRecord[] = allAttendanceData, windowIndex: number = currentWindowIndex) => {
    // Calculate window
    const startIndex = windowIndex * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const windowData = data.slice(startIndex, endIndex);

    setDisplayedData(windowData);
    setCurrentWindowIndex(windowIndex);
  };

  // React Query automatically refetches when dateRange or employeeId changes
  // No manual useEffect needed!

  const formatTime = (date: Date | null): string => date ? new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }) : "—";

  const formatDayOfWeek = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(date).getDay()];
  };

  // Using standardized IST utils formatDate function

  const getStatusIcon = (record: AttendanceRecord): JSX.Element => {
    const { status, checkIn, checkOut, flags } = record;

    if (status === "weekend") return <Calendar className="w-5 h-5 text-slate-400" />;
    if (status === "holiday") return <Calendar className="w-5 h-5 text-orange-500" />;
    if (status === "leave") return <Calendar className="w-5 h-5 text-purple-500" />;

    if (status === "present") {
      if (flags?.isLate) {
        return <Clock className="w-5 h-5 text-amber-500" />;
      }
      if (checkIn && checkOut) {
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      }
      if (checkIn && !checkOut) {
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      }
    }

    if (status === "half-day") return <AlertCircle className="w-5 h-5 text-blue-500" />;
    if (status === "absent") return <XCircle className="w-5 h-5 text-red-500" />;

    return <AlertCircle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusBadge = (record: AttendanceRecord): JSX.Element => {
    const { status, checkIn, checkOut, flags, holidayTitle } = record;
    const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm border transition-all duration-200 hover:shadow-md min-w-[100px] justify-center";

    if (status === "weekend") {
      return (
        <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
          <Calendar className="w-3 h-3" />
          Weekend
        </span>
      );
    }

    if (status === "holiday") {
      return (
        <span className={`${baseClasses} bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700`} title={holidayTitle}>
          <Calendar className="w-3 h-3" />
          {holidayTitle || 'Holiday'}
        </span>
      );
    }

    if (status === "leave") {
      return (
        <span className={`${baseClasses} bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700`}>
          <Calendar className="w-3 h-3" />
          Leave
        </span>
      );
    }

    if (status === "present") {
      if (flags?.isLate) {
        return (
          <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
            <Clock className="w-3 h-3" />
            Late Arrival
          </span>
        );
      }
      if (checkIn && checkOut) {
        return (
          <span className={`${baseClasses} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700`}>
            <CheckCircle className="w-3 h-3" />
            Complete
          </span>
        );
      }
      if (checkIn && !checkOut) {
        return (
          <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
            <AlertCircle className="w-3 h-3" />
            Incomplete
          </span>
        );
      }
    }

    if (status === "half-day") {
      return (
        <span className={`${baseClasses} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>
          <AlertCircle className="w-3 h-3" />
          Half Day
        </span>
      );
    }

    if (status === "absent") {
      return (
        <span className={`${baseClasses} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700`}>
          <XCircle className="w-3 h-3" />
          Absent
        </span>
      );
    }

    return (
      <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
        <AlertCircle className="w-3 h-3" />
        Unknown
      </span>
    );
  };

  // Navigate pages without API calls (sliding window)
  const handlePageChange = (newPage: number): void => {
    const totalPages = Math.ceil(allAttendanceData.length / recordsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      updateCurrentWindow(allAttendanceData, newPage - 1);
    }
  };

  // Calculate pagination info
  const totalRecords = allAttendanceData.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const currentPage = currentWindowIndex + 1;

  const handleDateRangeChange = (field: keyof DateRange, value: string): void => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
            <span>Loading user information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">My Attendance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Track your attendance history (most recent first)</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Enhanced Analytics */}
      {displayedData.length > 0 && (
        <AttendanceAnalytics
          attendance={allAttendanceData}
          statistics={statistics}
          loading={loading}
          attendancePercentage={attendancePercentage}
        />
      )}

      {/* Joining Date Notice */}
      {effectiveDateRange && effectiveDateRange.requestedStartDate !== effectiveDateRange.effectiveStartDate && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium">Date range adjusted</p>
              <p className="text-blue-700 dark:text-blue-300">
                Attendance records are shown from your joining date ({new Date(effectiveDateRange.joiningDate).toLocaleDateString()}) onwards.
                Requested start date was {new Date(effectiveDateRange.requestedStartDate).toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Records Info */}
      <div className="flex justify-end items-center mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {totalRecords} total records
          {joiningDate && (
            <span className="ml-2 text-xs text-gray-400">
              (Since {new Date(joiningDate).toLocaleDateString()})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
            <span>Loading attendance records...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl">
              <thead>
                <tr className="bg-cyan-50 dark:bg-slate-700 text-cyan-700 dark:text-cyan-300">
                  <th className="p-4 text-left font-semibold">Date</th>
                  <th className="p-4 text-left font-semibold">Day</th>
                  <th className="p-4 text-left font-semibold">Status</th>
                  <th className="p-4 text-left font-semibold">Check In</th>
                  <th className="p-4 text-left font-semibold">Check Out</th>
                  <th className="p-4 text-left font-semibold">Work Hours</th>
                  <th className="p-4 text-left font-semibold">Comments</th>
                </tr>
              </thead>
              <tbody>
                {displayedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No attendance records found</p>
                      <p className="text-sm">Try adjusting your date range</p>
                    </td>
                  </tr>
                ) : displayedData.map((record, index) => (
                  <tr
                    key={record._id || index}
                    className={`border-b border-gray-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-700/40 transition-colors ${record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record)}
                        <span className="font-medium">{formatISTDate(record.date, { customFormat: 'dd MMM yyyy' })}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(record)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkIn)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-mono">{formatTime(record.checkOut)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold">
                        {record.workHours ? `${record.workHours.toFixed(1)}h` : "—"}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        {record.comments || record.reason || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {displayedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">No attendance records found</p>
                <p className="text-sm">Try adjusting your date range</p>
              </div>
            ) : displayedData.map((record, index) => (
              <div
                key={record._id || index}
                className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : ''
                  }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(record)}
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatISTDate(record.date, { customFormat: 'dd MMM yyyy' })}</span>
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</div>
                    </div>
                  </div>
                  {getStatusBadge(record)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check In:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTime(record.checkIn)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Check Out:</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100">{formatTime(record.checkOut)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Work Hours:</span>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {record.workHours ? `${record.workHours.toFixed(1)}h` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Comments:</span>
                    <p className="text-gray-900 dark:text-gray-100 truncate">
                      {record.comments || record.reason || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex space-x-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else {
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, start + 4);
                    pageNum = start + i;
                    if (pageNum > end) return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === pageNum
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}