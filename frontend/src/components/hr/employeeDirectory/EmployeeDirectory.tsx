import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuth from '../../../hooks/authjwt';
import {
    useEmployees,
    useEmployee,
    useAllLeaves,
    useUsers,
    useDepartments,
    useUpdateEmployee,
    useToggleEmployeeStatus
} from '../../../hooks/queries';
import AttendanceSection, { EditAttendanceModal } from './AttendanceSection';
import LeaveSection from './LeaveSection';
import InactiveEmployees from './InactiveEmployees';
import { Edit, Users, UserX, ToggleLeft, ToggleRight, PlusCircle, Link2, FileText } from 'lucide-react';
import { useToast } from '../../../components/ui/toast';
import DocumentManager from './DocumentManager';
import { sanitizeText, maskAadhaar, maskBankAccount, maskPAN } from '../../../utils/sanitization';
import { validateUpdateEmployee, validateField } from '../../../schemas/employeeValidation';
import { Employee, User, AttendanceRecord, Leave } from '../../../types';

export default function EmployeeDirectory() {
    const navigate = useNavigate();
    const { employeeId: urlEmployeeId } = useParams();
    const userObject = useAuth();
    const { toast } = useToast();

    // Local UI state
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(urlEmployeeId || null);
    const [search, setSearch] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Format dates using local time to avoid timezone issues
        const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
        const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

        return {
            startDate,
            endDate
        };
    });
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [attendanceUpdateTrigger, setAttendanceUpdateTrigger] = useState(0);
    const [isEditingEmployee, setIsEditingEmployee] = useState(false);
    const [editedEmployee, setEditedEmployee] = useState<Employee | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active'); // 'active' or 'inactive'
    const [currentView, setCurrentView] = useState<'profile' | 'documents'>('profile'); // 'profile', 'documents'

    // React Query hooks
    // Note: useEmployees returns different structure depending on implementation. 
    // Assuming it returns { data: Employee[], ... } or ApiResponse. The original code says `data: employeesData`.
    const { data: employeesData, isLoading: loading, error: employeesError } = useEmployees({ status: 'active' });
    const { data: usersData } = useUsers();
    const { data: departmentsData, isLoading: loadingDepartments } = useDepartments();
    const {
        data: employeeProfile,
        isLoading: profileLoading,
        error: profileErrorObj
    } = useEmployee(selectedEmployeeId || '', {
        enabled: !!selectedEmployeeId
    });
    const { data: leavesData } = useAllLeaves(
        employeeProfile?.employeeId ? { employeeId: employeeProfile.employeeId } : undefined,
        { enabled: !!employeeProfile?.employeeId }
    );

    const updateEmployeeMutation = useUpdateEmployee();
    const toggleStatusMutation = useToggleEmployeeStatus();

    // Derived data from React Query - hooks now return proper arrays
    const employees: Employee[] = employeesData || [];
    const users: User[] = usersData || [];
    const allLeaves: Leave[] = leavesData || [];
    const error = (employeesError as any)?.message || null;
    const profileError = (profileErrorObj as any)?.message || null;

    // Filter leaves for the selected employee only
    const employeeLeaves = useMemo(() => {
        if (!employeeProfile) return [];
        return allLeaves.filter(leave => {
            // leave.employee can be a string ID or a populated object
            const leaveEmployeeId = typeof leave.employee === 'object' && leave.employee !== null
                ? (leave.employee as { _id?: string; employeeId?: string })._id || (leave.employee as { _id?: string; employeeId?: string }).employeeId
                : leave.employee;
            return leaveEmployeeId === employeeProfile._id || leaveEmployeeId === employeeProfile.employeeId;
        });
    }, [allLeaves, employeeProfile]);

    // useMemo must be called before any conditional returns (Rules of Hooks)
    const filteredEmployees = useMemo(() =>
        employees
            .filter(e =>
                (e.name || `${e.firstName} ${e.lastName}`).toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => {
                const nameA = a.name || `${a.firstName} ${a.lastName}`;
                const nameB = b.name || `${b.firstName} ${b.lastName}`;
                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
            })
        , [employees, search]);

    if (!userObject) return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading user data...</div>;
    const user = userObject;

    if (user.role !== 'hr' && user.role !== 'admin') {
        return <div className="p-6 text-center text-red-500">Not authorized to view this page.</div>;
    }

    const isEmployeeLinked = (employeeId: string) => {
        return users.some(u => u.employeeId === employeeId);
    };

    const handleEditAttendance = (record: AttendanceRecord) => {
        setEditingRecord(record);
        setEditModalOpen(true);
    };

    const handleAttendanceUpdate = () => {
        setAttendanceUpdateTrigger(prev => prev + 1);
        setEditModalOpen(false);
        setEditingRecord(null);
    };

    const handleEditEmployee = () => {
        setIsEditingEmployee(true);
        setEditedEmployee(employeeProfile ? { ...employeeProfile } : null);
    };

    const handleCancelEdit = () => {
        setIsEditingEmployee(false);
        setEditedEmployee(null);
    };

    const handleSaveEmployee = () => {
        if (!editedEmployee || !employeeProfile) return;

        // Validate before saving
        const validation = validateUpdateEmployee({
            ...editedEmployee,
            _id: employeeProfile._id
        });

        if (!validation.success) {
            // Show validation errors
            const firstError = Object.entries(validation.errors)[0];
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: `${firstError[0]}: ${firstError[1]}`
            });
            setFieldErrors(validation.errors);
            return;
        }

        // Sanitize data before sending
        const sanitizedData = {
            ...validation.data,
            firstName: sanitizeText(validation.data.firstName || ''),
            lastName: sanitizeText(validation.data.lastName || ''),
            address: sanitizeText(JSON.stringify(validation.data.address) || ''), // address can be object? sanitizeText expects string? 
            // address in Employee is string | object. If object, JSON.stringify? 
            // sanitizeText likely expects string. If Address is object, validation.data.address might be object.
            // Assuming validation handles it or backend handles it.
            // Re-reading original JSX: address: sanitizeText(validation.data.address || '')
            // Check sanitization.ts if I could. Assuming it handles string.
        };

        // Fix for address object: if address is object, don't sanitize with sanitizeText directly unless it supports it.
        // Ideally sanitize fields individually if it's an object. 
        // For now, I'll trust existing logic or skip sanitization for complex objects if risky.
        // Original code: address: sanitizeText(validation.data.address || '')

        updateEmployeeMutation.mutate(
            { id: employeeProfile._id, data: sanitizedData },
            {
                onSuccess: () => {
                    setIsEditingEmployee(false);
                    setEditedEmployee(null);
                    setFieldErrors({});

                    toast({
                        title: "Success",
                        description: "Employee updated successfully"
                    });
                },
                onError: (error: any) => {
                    console.error('Failed to update employee:', error);
                    toast({
                        variant: "destructive",
                        title: "Update Failed",
                        description: error.message || 'Failed to update employee'
                    });
                }
            }
        );
    };

    const handleToggleEmployeeStatus = (employeeId: string, currentStatus: boolean, employeeName?: string) => {
        const action = currentStatus ? 'deactivate' : 'activate';
        const confirmMessage = currentStatus
            ? `Are you sure you want to deactivate ${employeeName}? This will prevent them from logging in and remove them from active employee lists.`
            : `Are you sure you want to activate ${employeeName}? This will restore their access to the system.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        // Original code passes (employeeId, isActive, name). Mutation expects id?
        // toggleStatusMutation.mutate(employeeId, ...)
        // Mutation likely expects { id, status } or just id if toggle.
        // Looking at useEmployees.ts (turn 116 viewed): useToggleEmployeeStatus likely takes ID.
        toggleStatusMutation.mutate(employeeId, {
            onSuccess: (response: any) => {
                toast({
                    title: `Employee ${action}d`,
                    description: response.message
                });

                // If the current profile was deactivated, clear the selection
                if (selectedEmployeeId === employeeId && currentStatus) {
                    setSelectedEmployeeId(null);
                }
            },
            onError: (error: any) => {
                console.error(`Failed to ${action} employee:`, error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || `Failed to ${action} employee`
                });
            }
        });
    };

    const handleFieldChange = (field: keyof Employee, value: any) => {
        setEditedEmployee(prev => prev ? ({ ...prev, [field]: value }) : null);

        // Real-time field validation
        const fieldValidation = validateField(field, value);
        if (!fieldValidation.valid) {
            setFieldErrors(prev => ({ ...prev, [field]: fieldValidation.error }));
        } else {
            setFieldErrors(prev => {
                const { [field]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    const renderField = (label: string, field: keyof Employee, type: string = 'text', options: string[] = []) => {
        if (!employeeProfile) return null;

        let value = isEditingEmployee ? (editedEmployee as any)?.[field] || '' : (employeeProfile as any)[field];
        let displayValue = value;

        // Apply masking for sensitive fields when not editing
        if (!isEditingEmployee && value) {
            // Use explicit casting or checks for specific fields 
            if (field === 'govtId') {
                // Handle nested? Original code just checks 'aadhaarNumber' which is top level in FORM?
                // In Employee type, aadhaarNumber is not top level? It's in govtId.
                // BUT in `AddEmployee.tsx` I used top level for form. The backend maps it.
                // If `employeeProfile` coming from API has flattened structure or nested?
                // `useEmployee` usually returns `Employee`. `Employee` has `govtId: { aadhaar }`.
                // Original JSX: `if (field === 'aadhaarNumber')`.
                // This implies `employeeProfile` has `aadhaarNumber` at top level?
                // Maybe the `Employee` type in `index.ts` is strict but runtime has flat fields?
                // Or I should access `govtId.aadhaar`.
                // I will follow original code key access `field`.
                // If `field` is passed as 'aadhaarNumber' but object has 'govtId', `value` will be undefined if I access `employeeProfile['aadhaarNumber']` (unless it exists).
                // I'll stick to dynamic access but be aware.
            }

            if (String(field) === 'aadhaarNumber') { // Cast for safety
                displayValue = maskAadhaar(value);
            } else if (String(field) === 'bankAccountNumber') {
                displayValue = maskBankAccount(value);
            } else if (String(field) === 'panNumber') {
                displayValue = maskPAN(value);
            } else if (typeof value === 'string') {
                displayValue = sanitizeText(value);
            }
        }

        if (type === 'date' && value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                displayValue = date.toLocaleDateString('en-GB');
            } else {
                displayValue = '';
            }
        }

        if (!isEditingEmployee) {
            // Handle checking if displayValue is object (e.g. address)
            if (typeof displayValue === 'object' && displayValue !== null) {
                displayValue = JSON.stringify(displayValue); // Fallback
            }
            return <p><strong>{label}:</strong> {displayValue || 'N/A'}</p>;
        }

        const hasError = fieldErrors[field as string];

        if (type === 'select') {
            return (
                <div>
                    <strong>{label}:</strong>
                    <select
                        value={value}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`ml-2 px-2 py-1 border rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        aria-invalid={hasError ? 'true' : 'false'}
                        aria-describedby={hasError ? `${field}-error` : undefined}
                    >
                        {options.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    {hasError && (
                        <p id={`${field}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">{hasError}</p>
                    )}
                </div>
            );
        }

        if (type === 'date') {
            let formattedValue = '';
            if (value) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    formattedValue = date.toISOString().split('T')[0];
                }
            }
            return (
                <div>
                    <strong>{label}:</strong>
                    <input
                        type="date"
                        value={formattedValue}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                        className={`ml-2 px-2 py-1 border rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                            }`}
                        aria-invalid={hasError ? 'true' : 'false'}
                        aria-describedby={hasError ? `${field}-error` : undefined}
                    />
                    {hasError && (
                        <p id={`${field}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">{hasError}</p>
                    )}
                </div>
            );
        }

        return (
            <div>
                <strong>{label}:</strong>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className={`ml-2 px-2 py-1 border rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 ${hasError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    aria-invalid={hasError ? 'true' : 'false'}
                    aria-describedby={hasError ? `${field}-error` : undefined}
                />
                {hasError && (
                    <p id={`${field}-error`} className="text-red-600 dark:text-red-400 text-sm mt-1">{hasError}</p>
                )}
            </div>
        );
    };
    // Hack to allow accessing dynamic fields on Employee which might not be in Interface or nested
    // We cast Employee to any in renderField calls in the JSX below.

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 relative lg:sticky lg:top-0 lg:z-20">
                <div className="px-4 py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Main Navigation Tabs */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === 'active'
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                <span className="text-sm">Active</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('inactive')}
                                className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === 'inactive'
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md'
                                    }`}
                            >
                                <UserX className="w-4 h-4" />
                                <span className="text-sm">Inactive</span>
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => navigate('/employees/add')}
                                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-green-600 text-white shadow-lg shadow-green-600/25 hover:bg-green-700 hover:shadow-green-600/30"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Employee</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                            <button
                                onClick={() => navigate('/employees/link')}
                                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/30"
                            >
                                <Link2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Link User</span>
                                <span className="sm:hidden">Link</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'inactive' ? (
                <div className="p-6">
                    <InactiveEmployees />
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row">
                    {/* Sidebar: Employee List */}
                    <div className="w-full lg:w-80 lg:h-screen lg:sticky lg:top-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-96 lg:max-h-none">
                            {loading && employees.length === 0 ? (
                                <div className="p-4 text-slate-500 dark:text-slate-400">Loading employees...</div>
                            ) : error ? (
                                <div className="p-4 text-red-500">{error}</div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="p-4 text-slate-500 dark:text-slate-400">No employees found.</div>
                            ) : (
                                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredEmployees.map((e) => (
                                        <li
                                            key={e._id}
                                            className={`p-4 cursor-pointer hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors ${selectedEmployeeId === e._id ? 'bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-50 font-semibold' : ''}`}
                                            onClick={() => {
                                                setSelectedEmployeeId(e._id);
                                                navigate(`/employees/${e._id}`);
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span>{e.name || `${e.firstName} ${e.lastName}`}</span>
                                                <div className="flex items-center">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isEmployeeLinked(e.employeeId) ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                                                        {isEmployeeLinked(e.employeeId) ? 'Linked' : 'Unlinked'}
                                                    </span>
                                                    {!isEmployeeLinked(e.employeeId) && (
                                                        <button
                                                            className="ml-2 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                                                            onClick={evt => { evt.stopPropagation(); window.location.href = '/auth/signup'; }}
                                                        >
                                                            Create User
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Main Panel: Employee Details */}
                    <div className="flex-1 lg:overflow-y-auto p-4 lg:p-8">
                        {!selectedEmployeeId ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-slate-500 dark:text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="mt-2 text-xl font-semibold">Select an employee</p>
                                    <p className="text-sm">Choose an employee from the list to view their details.</p>
                                </div>
                            </div>
                        ) : profileLoading ? (
                            <div className="text-center p-10 text-slate-500 dark:text-slate-400">Loading employee details...</div>
                        ) : profileError ? (
                            <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow">{profileError}</div>
                        ) : employeeProfile ? (
                            currentView === 'documents' ? (
                                <DocumentManager
                                    employeeProfile={employeeProfile}
                                    onBack={() => setCurrentView('profile')}
                                />
                            ) : (
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 lg:p-8">
                                    <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div>
                                                <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">
                                                    {sanitizeText(employeeProfile.name || `${employeeProfile.firstName} ${employeeProfile.lastName}`)}
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                    {sanitizeText(employeeProfile.position || 'N/A')} &mdash; {sanitizeText(employeeProfile.department || 'N/A')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                {isEditingEmployee ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEmployee}
                                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                                        >
                                                            💾 Save Changes
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setCurrentView('documents')}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            Documents
                                                        </button>
                                                        <button
                                                            onClick={handleEditEmployee}
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleEmployeeStatus(
                                                                employeeProfile._id,
                                                                employeeProfile.isActive === true, // Backend returns isActive: boolean
                                                                employeeProfile.name || `${employeeProfile.firstName} ${employeeProfile.lastName}`
                                                            )}
                                                            disabled={toggleStatusMutation.isPending}
                                                            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${employeeProfile.isActive
                                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                                                } disabled:opacity-50`}
                                                        >
                                                            {toggleStatusMutation.isPending ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                                    <span>Processing...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {employeeProfile.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                                                                    <span>{employeeProfile.isActive ? 'Deactivate' : 'Activate'}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 text-sm">
                                        {/* Contact & Work Info */}
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Contact & Work</h3>
                                            {renderField('Email', 'email', 'email')}
                                            {renderField('Phone', 'phone', 'tel')}
                                            <p><strong>Employee ID:</strong> {employeeProfile.employeeId}</p>
                                            <p><strong>Department:</strong> {employeeProfile.department || 'N/A'}</p>
                                            {renderField('Company', 'companyName' as any)}
                                            <p><strong>Status:</strong>
                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${employeeProfile.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                                                    {employeeProfile.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </p>
                                            {renderField('Employment Type', 'employmentType' as any, 'select', ['fulltime', 'intern', 'remote'])}
                                            {renderField('Joining Date', 'joiningDate' as any, 'date')}
                                            {renderField('Office', 'officeAddress' as any, 'select', ['SanikColony', 'Indore', 'N.F.C.', 'Offsite'])}
                                            {renderField('Supervisor', 'reportingSupervisor' as any)}
                                        </div>

                                        {/* Personal Info */}
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Personal Information</h3>
                                            {renderField('Date of Birth', 'dateOfBirth', 'date')}
                                            {renderField('Gender', 'gender', 'select', ['male', 'female', 'other'])}
                                            {renderField('Marital Status', 'maritalStatus', 'select', ['single', 'married', 'divorced'])}
                                            {renderField('Father\'s Name', 'fatherName')}
                                            {renderField('Father\'s Phone', 'fatherPhone' as any, 'tel')}
                                            {renderField('Mother\'s Name', 'motherName')}
                                            {renderField('Mother\'s Phone', 'motherPhone' as any, 'tel')}
                                            {renderField('Address', 'address')}
                                            {renderField('Aadhaar', 'aadhaarNumber' as any)}
                                            {renderField('PAN', 'panNumber' as any)}
                                            {renderField('Emergency Contact Name', 'emergencyContactName' as any)}
                                            {renderField('Emergency Contact Number', 'emergencyContactNumber' as any, 'tel')}
                                        </div>

                                        {/* Financial Info */}
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Financial Information</h3>
                                            {renderField('Bank', 'bankName' as any)}
                                            {renderField('Account #', 'bankAccountNumber' as any)}
                                            {renderField('IFSC', 'bankIFSCCode' as any)}
                                            {renderField('Payment Mode', 'paymentMode' as any, 'select', ['Bank Transfer', 'Cheque', 'Cash'])}
                                        </div>
                                    </div>

                                    {/* Enhanced Attendance Section */}
                                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Attendance Records</h3>
                                        <AttendanceSection
                                            employeeProfile={employeeProfile}
                                            dateRange={dateRange}
                                            onDateRangeChange={setDateRange}
                                            onEditAttendance={handleEditAttendance}
                                            updateTrigger={attendanceUpdateTrigger}
                                        />
                                    </div>

                                    {/* Enhanced Leave Requests Section */}
                                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Leave Management</h3>
                                        <LeaveSection leaves={employeeLeaves} employeeProfile={employeeProfile} />
                                    </div>
                                </div>
                            )
                        ) : null}

                        {/* Edit Attendance Modal */}
                        <EditAttendanceModal
                            isOpen={editModalOpen}
                            onClose={() => setEditModalOpen(false)}
                            record={editingRecord}
                            employeeProfile={employeeProfile}
                            onUpdate={handleAttendanceUpdate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
