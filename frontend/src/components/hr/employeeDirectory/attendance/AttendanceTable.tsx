import React, { useState, useEffect } from 'react';
import { useHolidays, useEmployeeAttendanceWithAbsents, useUpdateAttendanceRecord } from '../../../../hooks/queries';
import { CheckCircle, AlertCircle, XCircle, Clock, ChevronLeft, ChevronRight, Calendar, MapPin, Eye, Edit3 } from 'lucide-react';
import LocationMapModal from '../../../ui/LocationMapModal';
import { formatTime, formatDate } from '../../../../utils/istUtils';
import AttendanceAnalytics, { AttendanceStatistics } from './AttendanceAnalytics';
import { AttendanceRecord, Employee } from '../../../../types';

interface AttendanceTableProps {
    employeeId: string | undefined;
    employeeProfile: Employee | null;
    dateRange: { startDate: string; endDate: string };
    onDateRangeChange: React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string }>>;
    onEditAttendance: (record: AttendanceRecord) => void;
    updateTrigger: number;
}

// Extended interface for processed records used in viewing
interface ProcessedAttendanceRecord extends Omit<AttendanceRecord, 'location'> {
    location: {
        latitude: number;
        longitude: number;
    } | null;
    holidayTitle?: string;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
    employeeId,
    employeeProfile: passedEmployeeProfile,
    dateRange,
    onDateRangeChange,
    onEditAttendance,
    updateTrigger
}) => {
    // Core data states
    const [allAttendanceData, setAllAttendanceData] = useState<ProcessedAttendanceRecord[]>([]); // Pre-loaded data for entire range
    const [displayedData, setDisplayedData] = useState<ProcessedAttendanceRecord[]>([]); // Current window of data
    const [currentWindowIndex, setCurrentWindowIndex] = useState(0); // Index for sliding window
    const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [joiningDate, setJoiningDate] = useState<string | null>(null);
    const [effectiveDateRange, setEffectiveDateRange] = useState<any>(null);

    // Bulk selection state
    const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('present');
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Location modal state
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocationRecord, setSelectedLocationRecord] = useState<ProcessedAttendanceRecord | null>(null);
    const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);

    const recordsPerPage = 7;

    // React Query hooks
    const { data: holidays = [] } = useHolidays();
    const {
        data: attendanceResponse,
        isLoading: loading,
        error: attendanceError,
        refetch: refetchAttendance
    } = useEmployeeAttendanceWithAbsents({
        employeeId: employeeId || '', // Handle undefined
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
    const updateAttendanceMutation = useUpdateAttendanceRecord();

    // Process attendance data from React Query
    useEffect(() => {
        if (attendanceResponse?.success && attendanceResponse.data) {
            const allRecords: any[] = attendanceResponse.data.records || [];
            setStatistics(attendanceResponse.data.statistics);

            // Store employee profile and joining date info
            if (attendanceResponse.data.employee && !passedEmployeeProfile) {
                setEmployeeProfile(attendanceResponse.data.employee);
            }
            const currentEmployeeProfile = passedEmployeeProfile || attendanceResponse.data.employee;
            if (currentEmployeeProfile?.joiningDate) {
                setJoiningDate(currentEmployeeProfile.joiningDate);
            }
            if (attendanceResponse.data.dateRange) {
                setEffectiveDateRange(attendanceResponse.data.dateRange);
            }

            // Process and store all data with proper status prioritization
            const processedRecords: ProcessedAttendanceRecord[] = allRecords.map(record => {
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
                // If there's a check-in, trust the backend status (present/half_day/etc.)

                return {
                    ...record,
                    status: finalStatus,
                    date: record.date, // Assuming string ISO
                    checkIn: record.checkIn ? record.checkIn : undefined, // Keep string for consistent usage or null
                    checkOut: record.checkOut ? record.checkOut : undefined,
                    location: record.location && record.location.latitude && record.location.longitude ? {
                        latitude: parseFloat(record.location.latitude),
                        longitude: parseFloat(record.location.longitude)
                    } : null,
                    flags: record.flags || {},
                    holidayTitle: record.holidayTitle || (record.flags?.isHoliday ? 'Holiday' : undefined)
                };
            });

            setAllAttendanceData(processedRecords);

            // Initialize with first window
            updateCurrentWindow(processedRecords, 0, statusFilter, sortOrder);
        }
    }, [attendanceResponse, passedEmployeeProfile, statusFilter, sortOrder]); // Added dependencies to avoid stale closures if needed

    // Update current window based on filters and sort order (no API call needed)
    const updateCurrentWindow = (data: ProcessedAttendanceRecord[] = allAttendanceData, windowIndex = currentWindowIndex, filter = statusFilter, order = sortOrder) => {
        let filteredData = [...data];

        // Apply status filter
        if (filter !== 'all') {
            filteredData = filteredData.filter(record => record.status === filter);
        }

        // Sort records by date
        const sortedRecords = filteredData.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return order === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
        });

        // Calculate window
        const startIndex = windowIndex * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const windowData = sortedRecords.slice(startIndex, endIndex);

        setDisplayedData(windowData);
        setCurrentWindowIndex(windowIndex);
    };

    // Refetch when updateTrigger changes
    useEffect(() => {
        if (updateTrigger > 0) {
            refetchAttendance();
        }
    }, [updateTrigger, refetchAttendance]);

    // Update window when filters change (no API call)
    useEffect(() => {
        if (allAttendanceData.length > 0) {
            updateCurrentWindow(allAttendanceData, 0, statusFilter, sortOrder); // Reset to first page
        }
    }, [statusFilter, sortOrder, allAttendanceData]); // Added allAttendanceData to deps

    // Use IST utils for consistent timezone display
    const formatTimeLocal = (date: string | undefined) => {
        if (!date) return "—";
        return formatTime(new Date(date));
    };

    const formatDateLocal = (date: string) => {
        if (!date) return "—";
        return formatDate(new Date(date), true); // dd-mm-yy format
    };

    const formatDayOfWeek = (date: string) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[new Date(date).getDay()];
    };

    const getStatusIcon = (record: ProcessedAttendanceRecord) => {
        const { status, checkIn, checkOut, flags } = record;

        // Enhanced icons with better visual hierarchy
        if (status === "weekend") return <Calendar className="w-5 h-5 text-slate-400" />;
        if (status === "holiday") return <Calendar className="w-5 h-5 text-orange-500" />;
        if (status === "leave") return <Calendar className="w-5 h-5 text-purple-500" />;

        if (status === "present") {
            if (flags?.isLate) {
                return <Clock className="w-5 h-5 text-amber-500" />; // Late arrival
            }
            if (checkIn && checkOut) {
                return <CheckCircle className="w-5 h-5 text-emerald-500" />; // Complete day
            }
            if (checkIn && !checkOut) {
                return <AlertCircle className="w-5 h-5 text-amber-500" />; // Incomplete
            }
        }

        if (status === "half-day") return <AlertCircle className="w-5 h-5 text-blue-500" />;
        if (status === "absent") return <XCircle className="w-5 h-5 text-red-500" />;

        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    };

    const getStatusBadge = (record: ProcessedAttendanceRecord) => {
        const { status, checkIn, checkOut, flags, holidayTitle } = record;
        const baseClasses = "inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm border transition-all duration-200 hover:shadow-md min-w-[90px] justify-center";

        // Enhanced badges with better styling
        if (status === "weekend") {
            return (
                <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
                    Weekend
                </span>
            );
        }

        if (status === "holiday") {
            return (
                <span className={`${baseClasses} bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700`} title={holidayTitle}>
                    {holidayTitle || 'Holiday'}
                </span>
            );
        }

        if (status === "leave") {
            return (
                <span className={`${baseClasses} bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700`}>
                    Leave
                </span>
            );
        }

        if (status === "present") {
            if (flags?.isLate) {
                return (
                    <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
                        Late Arrival
                    </span>
                );
            }
            if (checkIn && checkOut) {
                return (
                    <span className={`${baseClasses} bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700`}>
                        Complete
                    </span>
                );
            }
            if (checkIn && !checkOut) {
                return (
                    <span className={`${baseClasses} bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700`}>
                        Incomplete
                    </span>
                );
            }
        }

        if (status === "half-day") {
            return (
                <span className={`${baseClasses} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700`}>
                    Half Day
                </span>
            );
        }

        if (status === "absent") {
            return (
                <span className={`${baseClasses} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700`}>
                    Absent
                </span>
            );
        }

        return (
            <span className={`${baseClasses} bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600`}>
                Unknown
            </span>
        );
    };

    // Navigate pages without API calls (sliding window)
    const handlePageChange = (newPage: number) => {
        const totalPages = Math.ceil(getFilteredDataLength() / recordsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            updateCurrentWindow(allAttendanceData, newPage - 1, statusFilter, sortOrder);
        }
    };

    // Get total length of filtered data for pagination
    const getFilteredDataLength = () => {
        let filteredData = [...allAttendanceData];
        if (statusFilter !== 'all') {
            filteredData = filteredData.filter(record => record.status === statusFilter);
        }
        return filteredData.length;
    };

    // Calculate pagination info
    const totalRecords = getFilteredDataLength();
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const currentPage = currentWindowIndex + 1;

    // Location handling functions
    const handleViewLocation = (record: ProcessedAttendanceRecord) => {
        try {
            console.log("Opening location modal for record:", {
                recordId: record._id,
                date: record.date,
                hasLocation: !!record.location,
                location: record.location
            });

            setSelectedLocationRecord(record);
            setShowLocationModal(true);
        } catch (err) {
            console.error("Failed to open location modal:", err);
            console.error("Record data:", record);
        }
    };

    const closeLocationModal = () => {
        setShowLocationModal(false);
        setSelectedLocationRecord(null);
    };

    const hasValidLocation = (record: ProcessedAttendanceRecord) => {
        const hasLoc = record?.location?.latitude && record?.location?.longitude &&
            !isNaN(record.location.latitude) && !isNaN(record.location.longitude);

        // Debug logging to help identify location issues
        if (!hasLoc && record?.checkIn) {
            console.log('Missing location for record:', {
                id: record._id,
                date: record.date,
                location: record.location,
                hasCheckIn: !!record.checkIn
            });
        }

        return hasLoc;
    };

    // Bulk selection handlers
    const handleSelectRecord = (recordIndex: number, isSelected: boolean) => {
        const newSelected = new Set(selectedRecords);
        if (isSelected) {
            newSelected.add(recordIndex);
        } else {
            newSelected.delete(recordIndex);
        }
        setSelectedRecords(newSelected);
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            const allIndices = new Set(displayedData.map((_, index) => index));
            setSelectedRecords(allIndices);
        } else {
            setSelectedRecords(new Set());
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedRecords.size === 0) return;

        if (!employeeId) return;

        try {
            const promises = Array.from(selectedRecords).map(async (index) => {
                const record = displayedData[index];
                const updateData: any = {
                    status: bulkStatus,
                    employeeId: employeeId,
                    date: record.date
                };

                // Auto-fill times based on status (IST times)
                const baseDate = new Date(record.date).toISOString().split('T')[0];
                switch (bulkStatus) {
                    case 'present':
                        updateData.checkIn = `${baseDate}T09:30:00`;
                        updateData.checkOut = `${baseDate}T17:30:00`;
                        break;
                    case 'half-day':
                        updateData.checkIn = `${baseDate}T09:30:00`;
                        updateData.checkOut = `${baseDate}T13:30:00`;
                        break;
                    case 'absent':
                        updateData.checkIn = null;
                        updateData.checkOut = null;
                        break;
                }

                const recordId = record._id || 'new';

                return new Promise((resolve, reject) => {
                    updateAttendanceMutation.mutate(
                        { recordId, updateData },
                        {
                            onSuccess: resolve,
                            onError: reject
                        }
                    );
                });
            });

            await Promise.all(promises);

            // Reset selections and refresh data
            setSelectedRecords(new Set());
            setShowBulkActions(false);
            refetchAttendance(); // Refresh the data
        } catch (err) {
            console.error('Failed to bulk update attendance:', err);
            alert('Failed to update attendance records. Please try again.');
        }
    };

    if (!employeeId) {
        return <div className="text-slate-500 dark:text-slate-400">No employee selected.</div>;
    }

    return (
        <div className="space-y-4">
            {/* Enhanced Analytics */}
            <AttendanceAnalytics
                attendance={allAttendanceData}
                statistics={statistics}
                dateRange={dateRange}
            />


            {/* Joining Date Notice */}
            {effectiveDateRange && effectiveDateRange.requestedStartDate !== effectiveDateRange.effectiveStartDate && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="text-blue-800 dark:text-blue-200 font-medium">Date range adjusted</p>
                            <p className="text-blue-700 dark:text-blue-300">
                                Attendance records are shown from employee's joining date ({new Date(effectiveDateRange.joiningDate).toLocaleDateString()}) onwards.
                                Requested start date was {new Date(effectiveDateRange.requestedStartDate).toLocaleDateString()}.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {selectedRecords.size > 0 && (
                <div className="mb-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                                {selectedRecords.size} record{selectedRecords.size > 1 ? 's' : ''} selected
                            </span>
                            <select
                                value={bulkStatus}
                                onChange={(e) => setBulkStatus(e.target.value)}
                                className="px-3 py-2 border border-cyan-300 dark:border-cyan-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                            >
                                <option value="present">Mark as Present</option>
                                <option value="absent">Mark as Absent</option>
                                <option value="half-day">Mark as Half Day</option>
                            </select>
                            <button
                                onClick={handleBulkStatusUpdate}
                                disabled={updateAttendanceMutation.isPending}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                {updateAttendanceMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    'Update Selected'
                                )}
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedRecords(new Set())}
                            className="px-3 py-2 text-sm text-cyan-600 hover:text-cyan-700 transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Filters and Controls */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half-day">Half Day</option>
                        <option value="weekend">Weekend</option>
                        <option value="holiday">Holiday</option>
                        <option value="leave">Leave</option>
                    </select>

                    <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
                    >
                        Date {sortOrder === 'desc' ? '↓' : '↑'}
                    </button>

                    <button
                        onClick={() => {
                            setShowBulkActions(!showBulkActions);
                            setSelectedRecords(new Set());
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${showBulkActions
                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                            }`}
                    >
                        {showBulkActions ? 'Cancel Bulk' : 'Bulk Select'}
                    </button>

                    {/* Date Range Selector */}
                    <div className="flex gap-2 items-center">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">From:</label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => onDateRangeChange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                        />
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">To:</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => onDateRangeChange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                        />
                    </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {totalRecords} total records
                    {joiningDate && (
                        <span className="ml-2 text-xs text-gray-400">
                            (Since {new Date(joiningDate).toLocaleDateString()})
                        </span>
                    )}
                </div>
            </div>

            {/* Enhanced Loading State */}
            {loading ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30 rounded-2xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-cyan-600 border-t-transparent"></div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Loading Attendance Records</h3>
                            <p className="text-slate-500 dark:text-slate-400">Please wait while we fetch the latest data...</p>
                        </div>

                        {/* Loading skeleton */}
                        <div className="space-y-3 mt-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse flex space-x-4">
                                    <div className="rounded-full bg-slate-200 dark:bg-slate-700 h-12 w-12"></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-700">
                                <tr>
                                    {showBulkActions && (
                                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecords.size === displayedData.length && displayedData.length > 0}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                            />
                                        </th>
                                    )}
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Day</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check In</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check Out</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Location</th>
                                    <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {displayedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={showBulkActions ? 8 : 7} className="py-16">
                                            <div className="text-center space-y-4">
                                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl">
                                                    <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No Records Found</h3>
                                                    <p className="text-slate-500 dark:text-slate-400">No attendance records match your current filters</p>
                                                    <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your date range or status filters</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayedData.map((record, index) => (
                                    <tr
                                        key={record._id || index}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${record.status === 'absent' ? 'bg-red-50 dark:bg-red-900/10' : ''
                                            }`}
                                    >
                                        {showBulkActions && (
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRecords.has(index)}
                                                    onChange={(e) => handleSelectRecord(index, e.target.checked)}
                                                    className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                            </td>
                                        )}
                                        <td className="p-3">
                                            <div className="flex items-center space-x-3">
                                                {getStatusIcon(record)}
                                                <div>
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatDateLocal(record.date)}</span>
                                                    {record.flags?.isLate && (
                                                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Late</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</span>
                                        </td>
                                        <td className="p-3">
                                            {getStatusBadge(record)}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="font-mono">{formatTimeLocal(record.checkIn)}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="font-mono">{formatTimeLocal(record.checkOut)}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center space-x-2">
                                                {hasValidLocation(record) ? (
                                                    <>
                                                        <MapPin className="w-4 h-4 text-green-500" />
                                                        <button
                                                            onClick={() => handleViewLocation(record)}
                                                            className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-xs transition-colors"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            <span>View</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center space-x-1">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>Not found</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => onEditAttendance && onEditAttendance(record)}
                                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-4">
                        {displayedData.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 border border-slate-200 dark:border-slate-700">
                                <div className="text-center space-y-4">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl">
                                        <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No Records Found</h3>
                                        <p className="text-slate-500 dark:text-slate-400">No attendance records match your current filters</p>
                                        <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your date range or status filters</p>
                                    </div>
                                </div>
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
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{formatDateLocal(record.date)}</span>
                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDayOfWeek(record.date)}</div>
                                            {record.flags?.isLate && (
                                                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Late Arrival</div>
                                            )}
                                        </div>
                                    </div>
                                    {getStatusBadge(record)}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Check In:</span>
                                        <p className="font-mono text-gray-900 dark:text-gray-100">{formatTimeLocal(record.checkIn)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Check Out:</span>
                                        <p className="font-mono text-gray-900 dark:text-gray-100">{formatTimeLocal(record.checkOut)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Location:</span>
                                        <div className="mt-1">
                                            {hasValidLocation(record) ? (
                                                <button
                                                    onClick={() => handleViewLocation(record)}
                                                    className="flex items-center space-x-1 px-2 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg text-xs transition-colors"
                                                >
                                                    <MapPin className="w-3 h-3" />
                                                    <Eye className="w-3 h-3" />
                                                    <span>View</span>
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 text-sm flex items-center space-x-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Not found</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => onEditAttendance && onEditAttendance(record)}
                                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors w-full"
                                        >
                                            Edit Attendance
                                        </button>
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

                                    if (!pageNum) return null;

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

            {/* Location Map Modal */}
            <LocationMapModal
                isOpen={showLocationModal}
                onClose={closeLocationModal}
                attendanceRecord={selectedLocationRecord as any} // Forced cast due to type mismatch in view model
                employeeProfile={passedEmployeeProfile || employeeProfile}
            />
        </div>
    );
};

export default AttendanceTable;
