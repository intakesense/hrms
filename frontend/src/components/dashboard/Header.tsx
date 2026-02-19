import { useState, useEffect, memo } from "react";
import { Clock, User, Calendar, HelpCircle, Moon, Sun, LogIn, LogOut, MapPin, Edit3, List } from "lucide-react";
import { formatTime, formatISTDate } from "../../utils/luxonUtils";
import useProfilePicture from "../../hooks/useProfilePicture";

interface TimeDisplayProps { }

// Separate memoized component for time display to prevent unnecessary re-renders
const TimeDisplay = memo<TimeDisplayProps>(() => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Using standardized IST utils functions

  return (
    <div className="hidden sm:flex items-center gap-3 bg-card px-4 py-3 rounded-lg shadow-sm border border-border">
      <div className="bg-muted p-2 rounded-full">
        <Clock size={16} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium text-foreground tabular-nums">{formatTime(currentTime)}</p>
        <p className="text-xs text-muted-foreground">{formatISTDate(currentTime, { customFormat: 'dd MMMM yyyy' })}</p>
      </div>
    </div>
  );
});

TimeDisplay.displayName = 'TimeDisplay';

export interface HeaderProps {
  username: string;
  isCheckedIn: boolean;
  dailyCycleComplete: boolean;
  checkInLoading: boolean;
  checkOutLoading: boolean;
  locationLoading: boolean;
  handleCheckIn: () => void;
  handleCheckOut: () => void;
  setShowLeaveModal: (show: boolean) => void;
  setShowHelpModal: (show: boolean) => void;
  setShowRegularizationModal: (show: boolean) => void;
  wfhRequestPending: boolean;
  toggleTheme: () => void;
  theme: string;
}

const Header: React.FC<HeaderProps> = ({
  username,
  isCheckedIn,
  dailyCycleComplete,
  checkInLoading,
  checkOutLoading,
  locationLoading,
  handleCheckIn,
  handleCheckOut,
  setShowLeaveModal,
  setShowHelpModal,
  setShowRegularizationModal,
  wfhRequestPending,
  toggleTheme,
  theme
}) => {
  const { profilePicture } = useProfilePicture();

  return (
    <header className="bg-card shadow-lg p-4 transition-all duration-300 rounded-xl border border-border">
      {/* Top section: Welcome and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
        {/* Welcome Message */}
        <div className="flex items-center mb-4 sm:mb-0">
          {profilePicture?.s3Url ? (
            <div className="w-12 h-12 rounded-xl shadow-lg overflow-hidden ring-2 ring-white/20 dark:ring-black/20">
              <img
                src={profilePicture.s3Url as string}
                alt={username}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#EBA04B] to-[#D4881A] text-white p-3 rounded-xl shadow-lg">
              <User size={22} />
            </div>
          )}
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Welcome back,</p>
            <p className="text-xl font-bold" style={{ color: '#FEE2A1' }}>
              {username}
            </p>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLeaveModal(true)}
              title="Request Leave"
              className="p-2.5 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105"
            >
              <Calendar size={18} />
            </button>
            <button
              onClick={() => setShowRegularizationModal(true)}
              title="Regularize Attendance"
              className="p-2.5 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={() => setShowHelpModal(true)}
              title="Get Help"
              className="p-2.5 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105"
            >
              <HelpCircle size={18} />
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href="https://tms.intakesense.com/"
              title="Task Management System"
              className="p-2.5 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-card rounded-xl shadow-md hover:shadow-lg border border-border transition-all duration-200 hover:scale-105"
            >
              <List size={18} />
            </a>
            {/* Refresh button removed - React Query automatically handles data freshness */}
          </div>
          {/* Time Display */}
          <TimeDisplay />
        </div>
      </div>

      {/* Bottom section: Action Buttons */}
      <div className="grid grid-cols-2 gap-4 w-full mt-6">
        <button
          onClick={handleCheckIn}
          disabled={isCheckedIn || checkInLoading || locationLoading || dailyCycleComplete || wfhRequestPending}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 shadow-lg border ${dailyCycleComplete
            ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-60'
            : isCheckedIn || checkInLoading || locationLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-50'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 focus:ring-green-400 border-green-600 hover:shadow-xl'
            }`}
        >
          {locationLoading ? (
            <>
              <MapPin size={18} className="mr-2 animate-pulse" />
              Getting location...
            </>
          ) : (
            <>
              <LogIn size={18} className="mr-2" />
              {checkInLoading
                ? "Checking in..."
                : dailyCycleComplete
                  ? "Completed"
                  : "Check In"}
            </>
          )}
        </button>

        <button
          onClick={handleCheckOut}
          disabled={!isCheckedIn || checkOutLoading || dailyCycleComplete}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 shadow-lg border ${dailyCycleComplete
            ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-60'
            : !isCheckedIn || checkOutLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed border-border opacity-50'
              : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 focus:ring-red-400 border-red-600 hover:shadow-xl'
            }`}
        >
          <LogOut size={18} className="mr-2" />
          {checkOutLoading
            ? "Checking out..."
            : dailyCycleComplete
              ? "Completed"
              : "Check Out"}
        </button>
      </div>
    </header>
  );
};

export default Header;
