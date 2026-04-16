import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { X, ChevronDown, CalendarDays, CalendarRange, Info } from "lucide-react";
import type { LeaveType, LeaveMode } from "@/types";
import { usePreviewLeaveDays } from "@/hooks/queries/useLeaves";

interface LeaveRequestData {
  leaveMode: LeaveMode;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaveRequestData) => void;
  isLoading: boolean;
}

const LeaveRequestModal = ({ isOpen, onClose, onSubmit, isLoading }: LeaveRequestModalProps) => {
  const [leaveMode, setLeaveMode] = useState<LeaveMode>("single");
  const [leaveType, setLeaveType] = useState<LeaveType>("full-day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Preview hook — only active in multi mode with valid dates
  const { data: preview, isLoading: previewLoading } = usePreviewLeaveDays(
    leaveMode === 'multi' ? startDate : '',
    leaveMode === 'multi' ? endDate : ''
  );

  // When switching to single mode, sync endDate with startDate
  useEffect(() => {
    if (leaveMode === "single") {
      setEndDate(startDate);
      setLeaveType("full-day"); // reset type when switching
    }
  }, [leaveMode, startDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      leaveMode,
      leaveType: leaveMode === "multi" ? "full-day" : leaveType,
      startDate,
      endDate: leaveMode === "single" ? startDate : endDate,
      reason,
    });
  };

  const isFormValid = () => {
    if (!startDate) return false;
    if (leaveMode === "multi" && (!endDate || startDate > endDate)) return false;
    if (leaveMode === "multi" && preview && preview.workingDays === 0) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 md:p-8 transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">Request Leave</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Leave Duration</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaveMode("single")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                  leaveMode === "single"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-400 shadow-sm"
                    : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <CalendarDays size={16} />
                Single Day
              </button>
              <button
                type="button"
                onClick={() => setLeaveMode("multi")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                  leaveMode === "multi"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-400 shadow-sm"
                    : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500"
                }`}
              >
                <CalendarRange size={16} />
                Multi Day
              </button>
            </div>
          </div>

          {/* Leave Type — single mode only */}
          {leaveMode === "single" && (
            <div>
              <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave Type</label>
              <div className="relative">
                <select
                  id="leaveType"
                  value={leaveType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 pr-8"
                >
                  <option value="full-day">Full Day</option>
                  <option value="half-day">Half Day</option>
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Date Pickers */}
          {leaveMode === "single" ? (
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="multiStartDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Date</label>
                <input
                  id="multiStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setStartDate(e.target.value);
                    // If end date is before new start date, reset it
                    if (endDate && e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="multiEndDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Date</label>
                <input
                  id="multiEndDate"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
                  required
                />
              </div>
            </div>
          )}

          {/* Working Days Preview — multi mode only */}
          {leaveMode === "multi" && startDate && endDate && startDate <= endDate && (
            <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 p-3">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-300">
                  <div className="animate-spin h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  Calculating working days...
                </div>
              ) : preview ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                      {preview.workingDays} working day{preview.workingDays !== 1 ? 's' : ''} will be deducted
                    </span>
                  </div>
                  {preview.excludedDays > 0 && (
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 ml-6">
                      Excludes{' '}
                      {[
                        preview.breakdown.sundays > 0 && `${preview.breakdown.sundays} Sunday${preview.breakdown.sundays !== 1 ? 's' : ''}`,
                        preview.breakdown.saturdayHolidays > 0 && `${preview.breakdown.saturdayHolidays} Saturday holiday${preview.breakdown.saturdayHolidays !== 1 ? 's' : ''}`,
                        preview.breakdown.holidays > 0 && `${preview.breakdown.holidays} public holiday${preview.breakdown.holidays !== 1 ? 's' : ''}`,
                      ].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              placeholder="Provide a brief reason for your leave..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 text-sm rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
              maxLength={500}
              data-gramm="false"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{reason.length}/500</p>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700/80 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/80 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isFormValid()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-4 focus:outline-none focus:ring-cyan-300 dark:bg-cyan-500 dark:hover:bg-cyan-600 dark:focus:ring-cyan-700 rounded-lg transition-colors disabled:opacity-70"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
