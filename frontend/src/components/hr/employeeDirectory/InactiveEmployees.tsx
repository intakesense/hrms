import React, { useState } from 'react';
import { UserX, Calendar, Mail, Phone, Building, User, RotateCcw, AlertTriangle, Eye, X } from 'lucide-react';
import { useEmployees, useEmployee, useToggleEmployeeStatus } from '../../../hooks/queries';
import { useToast } from '../../ui/toast';
import { formatDate } from '../../../utils/istUtils';
import { Employee } from '../../../types';

const InactiveEmployees: React.FC = () => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch inactive employees
    const { data: inactiveEmployees = [], isLoading: loading } = useEmployees({ status: 'inactive' });

    // Fetch employee details when modal is open
    const { data: employeeDetails, isLoading: loadingDetails } = useEmployee(selectedEmployeeId || '');

    const toggleStatusMutation = useToggleEmployeeStatus();

    const handleViewEmployee = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setViewModalOpen(true);
    };

    const handleCloseModal = () => {
        setViewModalOpen(false);
        setSelectedEmployeeId(null);
    };

    const handleReactivateEmployee = (employeeId: string, employeeName: string) => {
        if (!window.confirm(`Are you sure you want to reactivate ${employeeName}? This will restore their access to the system.`)) {
            return;
        }

        setActivatingId(employeeId);

        toggleStatusMutation.mutate(
            employeeId,
            {
                onSuccess: () => {
                    toast({
                        title: "Employee Reactivated",
                        description: "Employee reactivated successfully"
                    });

                    // Close modal if viewing this employee
                    if (employeeDetails && employeeDetails._id === employeeId) {
                        handleCloseModal();
                    }
                    setActivatingId(null);
                },
                onError: (error: any) => {
                    console.error('Failed to reactivate employee:', error);
                    toast({
                        title: "Error",
                        description: error.message || "Failed to reactivate employee",
                        variant: "destructive"
                    });
                    setActivatingId(null);
                }
            }
        );
    };


    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inactive Employees</h2>
                    </div>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inactive Employees</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {inactiveEmployees.length} deactivated employee{inactiveEmployees.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {inactiveEmployees.length > 0 && (
                        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">Deactivated accounts</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6">
                {inactiveEmployees.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <UserX className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Inactive Employees</h3>
                        <p className="text-gray-600 dark:text-gray-400">All employees are currently active.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {inactiveEmployees.map((employee: Employee) => (
                            <div
                                key={employee._id}
                                className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                                    {/* Employee Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {employee.name || `${employee.firstName} ${employee.lastName}`}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        ID: {employee.employeeId}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                                                <UserX className="w-3 h-3 text-red-600 dark:text-red-400" />
                                                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                    Inactive
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contact and Job Info Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                                <Mail className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{employee.email}</span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                                <Phone className="w-4 h-4 flex-shrink-0" />
                                                <span>{employee.phone}</span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                                <Building className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{employee.department}</span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                <span>Joined {formatDate(employee.joiningDate, false, 'DD MMM YYYY')}</span>
                                            </div>
                                        </div>

                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Position:</span> {employee.designation || employee.position}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex-shrink-0 space-y-2 sm:space-y-0 sm:space-x-2 sm:flex sm:flex-row">
                                        <button
                                            onClick={() => handleViewEmployee(employee._id)}
                                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
                                        >
                                            <Eye className="w-4 h-4" />
                                            <span>View</span>
                                        </button>

                                        <button
                                            onClick={() => handleReactivateEmployee(employee._id, employee.name || `${employee.firstName} ${employee.lastName}`)}
                                            disabled={activatingId === employee._id}
                                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 w-full sm:w-auto justify-center"
                                        >
                                            {activatingId === employee._id ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                    <span>Reactivating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>Reactivate</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Employee Details Modal */}
            {viewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Employee Details
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading employee details...</span>
                                </div>
                            ) : employeeDetails ? (
                                <div className="space-y-6">
                                    {/* Employee Header */}
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                    {employeeDetails.firstName} {employeeDetails.lastName}
                                                </h3>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    {employeeDetails.designation || employeeDetails.position} • {employeeDetails.department}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-500">
                                                    Employee ID: {employeeDetails.employeeId}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                                                    Inactive
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employee Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Contact Information */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Contact Information
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <Mail className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-900 dark:text-white">{employeeDetails.email}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-900 dark:text-white">{employeeDetails.phone}</span>
                                                </div>
                                                <div className="flex items-start space-x-2">
                                                    <Building className="w-4 h-4 text-gray-500 mt-0.5" />
                                                    <span className="text-gray-900 dark:text-white">{employeeDetails.address || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Personal Information */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Personal Information
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div><span className="font-medium">Date of Birth:</span> {formatDate(employeeDetails.dateOfBirth, false, 'DD MMM YYYY')}</div>
                                                <div><span className="font-medium">Gender:</span> {employeeDetails.gender}</div>
                                                <div><span className="font-medium">Marital Status:</span> {employeeDetails.maritalStatus}</div>
                                                <div><span className="font-medium">Father's Name:</span> {employeeDetails.fatherName || 'N/A'}</div>
                                                <div><span className="font-medium">Mother's Name:</span> {employeeDetails.motherName || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Work Information */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Work Information
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div><span className="font-medium">Company:</span> {employeeDetails.companyName || 'N/A'}</div>
                                                <div><span className="font-medium">Employment Type:</span> {employeeDetails.employmentType}</div>
                                                <div><span className="font-medium">Joining Date:</span> {formatDate(employeeDetails.joiningDate, false, 'DD MMM YYYY')}</div>
                                                <div><span className="font-medium">Office:</span> {employeeDetails.officeAddress || 'N/A'}</div>
                                                <div><span className="font-medium">Supervisor:</span> {employeeDetails.reportingSupervisor || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Government Documents */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Government Documents
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div><span className="font-medium">Aadhaar Number:</span> {employeeDetails.aadhaarNumber || 'N/A'}</div>
                                                <div><span className="font-medium">PAN Number:</span> {employeeDetails.panNumber || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Banking Information */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Banking Information
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div><span className="font-medium">Bank Name:</span> {employeeDetails.bankName || 'N/A'}</div>
                                                <div><span className="font-medium">Account Number:</span> {employeeDetails.bankAccountNumber || 'N/A'}</div>
                                                <div><span className="font-medium">IFSC Code:</span> {employeeDetails.bankIFSCCode || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Emergency Contact */}
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                                                Emergency Contact
                                            </h4>
                                            <div className="space-y-2 text-sm">
                                                <div><span className="font-medium">Name:</span> {employeeDetails.emergencyContactName || "N/A"}</div>
                                                <div><span className="font-medium">Phone:</span> {employeeDetails.emergencyContactNumber || "N/A"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons in Modal */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => handleReactivateEmployee(employeeDetails._id, `${employeeDetails.firstName} ${employeeDetails.lastName}`)}
                                            disabled={activatingId === employeeDetails._id}
                                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                                        >
                                            {activatingId === employeeDetails._id ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                    <span>Reactivating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>Reactivate Employee</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleCloseModal}
                                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Close</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    Failed to load employee details
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InactiveEmployees;
