import { useMemo, memo } from "react";
import { Calendar, CheckCircle, XCircle, AlertCircle, Clock, Heart, LucideIcon } from "lucide-react";

interface AttendancePercentage {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

interface Statistics {
  weekend: number;
  holiday: number;
  halfDay: number;
  leave: number;
}

interface AttendanceReport {
  attendancePercentage?: AttendancePercentage;
  statistics?: Statistics;
}

interface AttendanceStats {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  missingCheckouts: number;
}

interface CardBreakdown {
  totalDays: number;
  weekendDays: number;
  holidayDays: number;
  workingDays: number;
}

interface Card {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'cyan' | 'green' | 'red' | 'amber' | 'orange' | 'purple';
  barWidth: string;
  subText?: string;
  breakdown?: CardBreakdown;
}

interface AttendanceStatsProps {
  attendanceReport: AttendanceReport | null | undefined;
  isLoading?: boolean;
  missingCheckoutsCount?: number;
}

const AttendanceStats = ({ attendanceReport, isLoading = false, missingCheckoutsCount = 0 }: AttendanceStatsProps) => {
  const currentDate = new Date();
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  // Extract data from attendance report
  const workingDaysInMonth = attendanceReport?.attendancePercentage?.totalWorkingDays || 0;
  const weekendsInMonth = attendanceReport?.statistics?.weekend || 0;
  const holidaysInMonth = attendanceReport?.statistics?.holiday || 0;

  // Extract attendance statistics
  const attendanceStats: AttendanceStats = useMemo(() => {
    if (attendanceReport) {
      return {
        presentDays: attendanceReport.attendancePercentage?.presentDays || 0,
        absentDays: attendanceReport.attendancePercentage?.absentDays || 0,
        halfDays: attendanceReport.statistics?.halfDay || 0,
        leaveDays: attendanceReport.statistics?.leave || 0,
        missingCheckouts: missingCheckoutsCount
      };
    }

    return {
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      leaveDays: 0,
      missingCheckouts: missingCheckoutsCount
    };
  }, [attendanceReport, missingCheckoutsCount]);

  // Get attendance percentage from backend
  const attendancePercentage = attendanceReport?.attendancePercentage?.percentage?.toFixed(1) || "0.0";

  // Use backend working days for calculations
  const workingDaysToDate = workingDaysInMonth;

  // 🚀 OPTIMIZED: Memoize cards array to prevent recreation on every render
  const cards: Card[] = useMemo(() => [
    {
      title: "Working Days",
      value: workingDaysInMonth,
      icon: Calendar,
      color: "cyan",
      barWidth: `${(workingDaysInMonth / (daysInMonth || 1)) * 100}%`,
      breakdown: {
        totalDays: daysInMonth,
        weekendDays: weekendsInMonth,
        holidayDays: holidaysInMonth,
        workingDays: workingDaysInMonth
      }
    },
    { title: "Present Days", value: attendanceStats.presentDays, icon: CheckCircle, color: "green", barWidth: `${attendancePercentage}%`, subText: `${attendancePercentage}% att. (incl. half-days)` },
    { title: "Absent Days", value: attendanceStats.absentDays, icon: XCircle, color: "red", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.absentDays / workingDaysToDate) * 100 : 0}%` },
    { title: "Leave Days", value: attendanceStats.leaveDays, icon: Heart, color: "purple", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.leaveDays / workingDaysToDate) * 100 : 0}%` },
    { title: "Half Days", value: attendanceStats.halfDays, icon: AlertCircle, color: "amber", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.halfDays / workingDaysToDate) * 100 : 0}%` },
    { title: "Missing Checkouts", value: attendanceStats.missingCheckouts, icon: Clock, color: "orange", barWidth: `${workingDaysToDate > 0 ? (attendanceStats.missingCheckouts / workingDaysToDate) * 100 : 0}%` },
  ], [workingDaysInMonth, daysInMonth, attendanceStats, attendancePercentage, workingDaysToDate, weekendsInMonth, holidaysInMonth]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-card rounded-xl shadow-xl p-3 sm:p-5 animate-pulse">
            <div className="flex items-center justify-between mb-2 sm:mb-3.5">
              <div className="h-3 bg-muted rounded w-16"></div>
              <div className="w-5 h-5 bg-muted rounded-full"></div>
            </div>
            <div className="h-8 bg-muted rounded w-12 mb-2"></div>
            <div className="h-2 bg-muted rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        // Define color classes based on light/dark mode and card type
        const textClasses: Record<Card['color'], string> = {
          cyan: "text-cyan-600 dark:text-cyan-400",
          green: "text-green-600 dark:text-green-400",
          red: "text-red-600 dark:text-red-400",
          amber: "text-amber-600 dark:text-amber-400",
          orange: "text-orange-600 dark:text-orange-400",
          purple: "text-purple-600 dark:text-purple-400"
        };
        const iconClasses: Record<Card['color'], string> = {
          cyan: "text-cyan-500 dark:text-cyan-400",
          green: "text-green-500 dark:text-green-400",
          red: "text-red-500 dark:text-red-400",
          amber: "text-amber-500 dark:text-amber-400",
          orange: "text-orange-500 dark:text-orange-400",
          purple: "text-purple-500 dark:text-purple-400"
        };
        const barClasses: Record<Card['color'], string> = {
          cyan: "bg-cyan-500 dark:bg-cyan-500",
          green: "bg-green-500 dark:bg-green-500",
          red: "bg-red-500 dark:bg-red-500",
          amber: "bg-amber-500 dark:bg-amber-500",
          orange: "bg-orange-500 dark:bg-orange-500",
          purple: "bg-purple-500 dark:bg-purple-500"
        };

        return (
          <div
            key={card.title}
            className={`bg-card rounded-xl shadow-xl p-3 sm:p-5 transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1.5 ${card.breakdown ? 'relative group cursor-help' : ''}`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3.5">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{card.title}</p>
              <Icon size={20} className={`${iconClasses[card.color]}`} />
            </div>
            <p className={`text-xl sm:text-3xl font-bold ${textClasses[card.color]}`}>{card.value}</p>
            <div className="mt-2 sm:mt-3.5 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className={`h-2 ${barClasses[card.color]} rounded-full transition-all duration-500`} style={{ width: card.barWidth }}></div>
            </div>
            {card.subText && <p className="text-xs text-muted-foreground mt-2">{card.subText}</p>}

            {/* Custom Tooltip for Working Days */}
            {card.breakdown && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black dark:bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="text-center">
                  <div className="font-semibold mb-1">Working Days Calculation:</div>
                  <div>Total days in month: {card.breakdown.totalDays}</div>
                  <div className="text-red-300">- Weekend days: {card.breakdown.weekendDays}</div>
                  <div className="text-orange-300">- Holiday days: {card.breakdown.holidayDays}</div>
                  <div className="border-t border-gray-600 mt-1 pt-1 font-semibold text-cyan-300">
                    = Working days: {card.breakdown.workingDays}
                  </div>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black dark:border-b-gray-900"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 🚀 OPTIMIZED: Wrap component with React.memo to prevent unnecessary re-renders
export default memo(AttendanceStats);
