import { useState, useMemo } from 'react';
import {
  Calendar,
  HelpCircle,
  Clock,
  Key,
  RefreshCw,
  FileText,
  User,
  Clock4,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { useToast } from "../ui/toast";
import { useQueryClient } from '@tanstack/react-query';
import useAuth from "../../hooks/authjwt";
import BackButton from "../ui/BackButton";
import { formatTime, formatISTDate } from '../../utils/luxonUtils';
import {
  useUsers,
  useAllLeaves,
  useAllHelpInquiries,
  useRegularizationRequests,
  usePasswordResetRequests,
  useApprovePasswordReset,
  useRejectPasswordReset,
  useAllExpenses,
  useUpdateExpenseStatus,
  useUpdateLeaveStatus,
  useUpdateHelpInquiry,
  useReviewRegularization
} from "../../hooks/queries";
import type { User as UserType } from '@/types';

type RequestType = 'leave' | 'help' | 'regularization' | 'password' | 'expense';
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'resolved' | 'expired' | 'completed' | 'in-progress';

interface BaseRequest {
  _id: string;
  type: RequestType;
  title: string;
  description: string;
  date: Date;
  createdAt: Date;
  status: RequestStatus;
  user: { name: string; email: string } | null;
  response?: string;
  reviewComment?: string;
}

interface PasswordRequest extends BaseRequest {
  type: 'password';
  email: string;
  name: string;
  resetTokenExpires?: string;
  isTokenExpired?: boolean;
}

interface HelpRequest extends BaseRequest {
  type: 'help';
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface ExpenseRequest extends BaseRequest {
  type: 'expense';
  item?: string;
  amount?: number;
}

type UnifiedRequest = BaseRequest | PasswordRequest | HelpRequest | ExpenseRequest;

interface EditState {
  [key: string]: {
    status?: string;
    response?: string;
  };
}

interface ActionLoadingState {
  [key: string]: boolean;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AdminRequestsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Edit states for different request types
  const [editing, setEditing] = useState<EditState>({});
  const [actionLoading, setActionLoading] = useState<ActionLoadingState>({});

  const user = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  // React Query hooks - conditionally fetch based on active tab
  const { data: usersData } = useUsers();
  const users: UserType[] = usersData || [];

  const shouldFetchLeaves = activeTab === 'all' || activeTab === 'leave';
  const shouldFetchHelp = activeTab === 'all' || activeTab === 'help';
  const shouldFetchReg = activeTab === 'all' || activeTab === 'regularization';
  const shouldFetchPassword = activeTab === 'all' || activeTab === 'password';
  const shouldFetchExpense = activeTab === 'all' || activeTab === 'expense';

  const { data: leavesData, isLoading: leavesLoading } = useAllLeaves({ enabled: isAdminOrHR && shouldFetchLeaves });
  const { data: helpData, isLoading: helpLoading } = useAllHelpInquiries({ enabled: isAdminOrHR && shouldFetchHelp });
  const { data: regData, isLoading: regLoading } = useRegularizationRequests({ enabled: isAdminOrHR && shouldFetchReg });
  const { data: passwordData, isLoading: passwordLoading } = usePasswordResetRequests({ enabled: isAdminOrHR && shouldFetchPassword });
  const { data: expenseData, isLoading: expenseLoading } = useAllExpenses(undefined, { enabled: isAdminOrHR && shouldFetchExpense });

  const loading = leavesLoading || helpLoading || regLoading || passwordLoading || expenseLoading;

  // Mutations
  const updateLeaveStatusMutation = useUpdateLeaveStatus();
  const updateHelpInquiryMutation = useUpdateHelpInquiry();
  const reviewRegularizationMutation = useReviewRegularization();
  const approvePasswordResetMutation = useApprovePasswordReset();
  const rejectPasswordResetMutation = useRejectPasswordReset();
  const updateExpenseStatusMutation = useUpdateExpenseStatus();

  const tabs: Tab[] = [
    { id: 'all', label: 'All Requests', icon: FileText },
    { id: 'leave', label: 'Leave Requests', icon: Calendar },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'regularization', label: 'Regularization', icon: Clock },
    { id: 'password', label: 'Password Resets', icon: Key },
    { id: 'expense', label: 'Expenses', icon: Receipt }
  ];

  // Format requests from React Query data using useMemo
  const requests: UnifiedRequest[] = useMemo(() => {
    if (!isAdminOrHR) return [];

    const allRequests: UnifiedRequest[] = [];

    // Format leave requests
    const leaves = leavesData || [];
    const formattedLeaves = leaves.map((leave): BaseRequest => {
      const userInfo = users.find(u => u.employeeId === leave.employeeId);
      const startDate = leave.startDate || leave.leaveDate || leave.date;
      const endDate = leave.endDate || startDate;
      const isMultiDay = startDate && endDate && new Date(startDate).toDateString() !== new Date(endDate).toDateString();
      const numberOfDays = leave.numberOfDays;
      const daysLabel = numberOfDays ? ` (${numberOfDays} working day${numberOfDays !== 1 ? 's' : ''})` : '';
      const title = isMultiDay
        ? `${leave.leaveType} Leave${daysLabel}`
        : `${leave.leaveType} Leave`;
      const description = leave.leaveReason || leave.reason || '';
      return {
        ...leave,
        type: 'leave' as const,
        title,
        description,
        date: new Date(startDate),
        createdAt: new Date(leave.createdAt || leave.requestDate || Date.now()),
        status: (leave.status || 'pending') as RequestStatus,
        user: userInfo ? { name: userInfo.name, email: userInfo.email } : null
      };
    });
    allRequests.push(...formattedLeaves);

    // Format help requests
    const helpRequests = helpData || [];
    const formattedHelp = helpRequests.map((help): HelpRequest => ({
      ...help,
      type: 'help' as const,
      title: help.subject || help.title || 'Help Request',
      description: help.description || help.message || '',
      date: new Date(help.createdAt || Date.now()),
      createdAt: new Date(help.createdAt || Date.now()),
      status: (help.status || 'pending') as RequestStatus,
      user: help.userId ? { name: help.userId.name, email: help.userId.email } : null,
      category: help.category,
      priority: help.priority
    }));
    allRequests.push(...formattedHelp);

    // Format regularization requests
    const regRequests = regData || [];
    const formattedReg = regRequests.map((reg): BaseRequest => {
      let timeInfo = '';
      if (reg.requestedCheckIn) {
        timeInfo += `Check-in: ${formatTime(new Date(reg.requestedCheckIn))}`;
      }
      if (reg.requestedCheckOut) {
        timeInfo += timeInfo ? ` | Check-out: ${formatTime(new Date(reg.requestedCheckOut))}` : `Check-out: ${formatTime(new Date(reg.requestedCheckOut))}`;
      }
      if (!timeInfo && reg.reason) {
        timeInfo = reg.reason;
      } else if (timeInfo && reg.reason) {
        timeInfo += ` - ${reg.reason}`;
      }

      return {
        ...reg,
        type: 'regularization' as const,
        title: 'Attendance Regularization',
        description: timeInfo || 'No details provided',
        date: new Date(reg.date),
        createdAt: new Date(reg.createdAt || Date.now()),
        status: (reg.status || 'pending') as RequestStatus,
        user: reg.user ? { name: reg.user.name, email: reg.user.email } : null
      };
    });
    allRequests.push(...formattedReg);

    // Format password reset requests
    const passwordRequests = passwordData || [];
    const formattedPassword = passwordRequests.map((pwd): PasswordRequest => {
      const isTokenExpired = pwd.resetTokenExpires && new Date(pwd.resetTokenExpires) < new Date();
      const effectiveStatus = isTokenExpired && pwd.status === 'pending' ? 'expired' : (pwd.status || 'pending');

      return {
        ...pwd,
        type: 'password' as const,
        title: 'Password Reset Request',
        description: `User: ${pwd.email || 'Unknown'}${isTokenExpired ? ' (Token Expired)' : ''}`,
        date: new Date(pwd.createdAt || Date.now()),
        createdAt: new Date(pwd.createdAt || Date.now()),
        status: effectiveStatus as RequestStatus,
        isTokenExpired,
        user: { name: pwd.name, email: pwd.email }
      };
    });
    allRequests.push(...formattedPassword);

    // Format expense requests
    const expenses = expenseData || [];
    const formattedExpenses = expenses.map((exp: any): ExpenseRequest => ({
      ...exp,
      type: 'expense' as const,
      title: `Expense: ${exp.item || 'Reimbursement'}`,
      description: `Amount: ₹${Number(exp.amount || 0).toLocaleString()}`,
      date: new Date(exp.date || exp.createdAt || Date.now()),
      createdAt: new Date(exp.createdAt || Date.now()),
      status: (exp.status || 'pending') as RequestStatus,
      user: exp.employeeName ? { name: exp.employeeName, email: '' } : 
            (exp.employee && typeof exp.employee === 'object' && 'firstName' in exp.employee ? 
             { name: `${exp.employee.firstName} ${exp.employee.lastName || ''}`.trim(), email: exp.employee.email || '' } : 
             null)
    }));
    allRequests.push(...formattedExpenses);

    // Sort by most recent first
    return allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [isAdminOrHR, leavesData, helpData, regData, passwordData, expenseData, users]);

  const filteredRequests = requests.filter(request => {
    const matchesTab = activeTab === 'all' || request.type === activeTab;
    const matchesEmployee = employeeFilter === 'all' ||
      (request.user?.name && request.user.name.toLowerCase().includes(employeeFilter.toLowerCase())) ||
      (request.user?.email && request.user.email.toLowerCase().includes(employeeFilter.toLowerCase()));
    return matchesTab && matchesEmployee;
  });

  const getTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'leave': return Calendar;
      case 'help': return HelpCircle;
      case 'regularization': return Clock;
      case 'password': return Key;
      case 'expense': return Receipt;
      default: return FileText;
    }
  };

  const getStatusColor = (status: RequestStatus): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Use luxonUtils for consistent timezone display
  const formatDateLocal = (date: Date | string): string => {
    try {
      return formatISTDate(date, { dateOnly: true });
    } catch (e) {
      return 'N/A';
    }
  };

  // Handle editing states
  const handleEdit = (id: string, field: 'status' | 'response', value: string) => {
    setEditing(editing => ({
      ...editing,
      [id]: { ...editing[id], [field]: value }
    }));
  };

  const handleStartEdit = (request: UnifiedRequest) => {
    setEditing(e => ({
      ...e,
      [request._id]: {
        status: request.status,
        response: request.response || request.reviewComment || ""
      }
    }));
  };

  const handleCancelEdit = (id: string) => {
    setEditing(e => {
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
  };

  const handleSave = async (request: UnifiedRequest) => {
    setActionLoading(s => ({ ...s, [request._id]: true }));
    try {
      const editData = editing[request._id] || {};

      if (request.type === 'leave') {
        await updateLeaveStatusMutation.mutateAsync({
          leaveId: request._id,
          status: editData.status as 'pending' | 'approved' | 'rejected'
        });
      } else if (request.type === 'help') {
        await updateHelpInquiryMutation.mutateAsync({
          id: request._id,
          status: editData.status as 'pending' | 'in-progress' | 'resolved',
          response: editData.response
        });
      } else if (request.type === 'regularization') {
        await reviewRegularizationMutation.mutateAsync({
          requestId: request._id,
          status: editData.status as 'pending' | 'approved' | 'rejected',
          comment: editData.response
        });
      } else if (request.type === 'expense') {
        await updateExpenseStatusMutation.mutateAsync({
          id: request._id,
          status: editData.status as 'approved' | 'rejected',
          reviewComment: editData.response
        });
      }

      toast({
        variant: "success",
        title: "Request Updated",
        description: "The request has been updated successfully."
      });

      handleCancelEdit(request._id);
    } catch (error) {
      toast({
        variant: "error",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update request."
      });
    } finally {
      setActionLoading(s => ({ ...s, [request._id]: false }));
    }
  };

  const handlePasswordAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: true }));
    try {
      if (action === 'approve') {
        await approvePasswordResetMutation.mutateAsync(requestId);
        toast({
          variant: "success",
          title: "Request Approved",
          description: "Password reset request has been approved."
        });
      } else if (action === 'reject') {
        await rejectPasswordResetMutation.mutateAsync({
          requestId,
          reason: 'Rejected by administrator.'
        });
        toast({
          variant: "success",
          title: "Request Rejected",
          description: "Password reset request has been rejected."
        });
      }
    } catch (error) {
      toast({
        variant: "error",
        title: `${action} Failed`,
        description: error instanceof Error ? error.message : `Failed to ${action} request.`
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: false }));
    }
  };

  if (!isAdminOrHR) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <BackButton label="Back to Dashboard" variant="ghost" />
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Access Denied</h2>
            <p className="text-slate-500 dark:text-slate-400">You don't have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <BackButton label="Back" variant="ghost" className="w-auto" />

            <Button
              onClick={() => queryClient.invalidateQueries()}
              variant="outline"
              disabled={loading}
              className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                Manage Requests
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Review and manage all employee requests
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-slate-500 text-slate-600 dark:text-slate-300'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Employee Filter */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <User className="h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filter by employee name or email..."
                value={employeeFilter === 'all' ? '' : employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value || 'all')}
                className="max-w-sm border-slate-200 dark:border-slate-700"
              />
              {employeeFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmployeeFilter('all')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500 dark:text-slate-400">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No requests found
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  No requests to review at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const Icon = getTypeIcon(request.type);
              const isEditing = !!editing[request._id];
              const isPasswordRequest = request.type === 'password';
              const passwordReq = isPasswordRequest ? (request as PasswordRequest) : null;

              return (
                <Card key={`${request.type}-${request._id}`} className="border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-100 mb-1">
                              {request.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                              {request.description}
                            </p>
                            {request.type === 'help' && (request as HelpRequest).category && (
                              <div className="mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {(request as HelpRequest).category!.charAt(0).toUpperCase() + (request as HelpRequest).category!.slice(1)}
                                </Badge>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className="font-medium">For:</span> {formatDateLocal(request.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock4 className="h-3 w-3" />
                                <span className="font-medium">Submitted:</span> {formatDateLocal(request.createdAt)}
                              </span>
                              {request.user && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {request.user.name || request.user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          {request.type === 'help' && (request as HelpRequest).priority && (
                            <Badge variant="outline" className={
                              (request as HelpRequest).priority === 'high' ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400' :
                              (request as HelpRequest).priority === 'medium' ? 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400' :
                              'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-400'
                            }>
                              {(request as HelpRequest).priority!.charAt(0).toUpperCase() + (request as HelpRequest).priority!.slice(1)} Priority
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action buttons and editing interface */}
                      {isPasswordRequest && passwordReq ? (
                        <>
                          {/* Show expiration info if expired */}
                          {passwordReq.isTokenExpired && (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                                  Token Expired - Cannot be approved
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Show token expiration info for all password requests */}
                          {passwordReq.resetTokenExpires && (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                <strong>Token Expires:</strong> {new Date(passwordReq.resetTokenExpires).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {/* Action buttons - only show for pending non-expired requests */}
                          {request.status === 'pending' && !passwordReq.isTokenExpired && (
                            <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <Button
                                onClick={() => handlePasswordAction(request._id, 'approve')}
                                disabled={actionLoading[`${request._id}_approve`]}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                              >
                                {actionLoading[`${request._id}_approve`] ? 'Approving...' : 'Approve & Generate Token'}
                              </Button>
                              <Button
                                onClick={() => handlePasswordAction(request._id, 'reject')}
                                disabled={actionLoading[`${request._id}_reject`]}
                                className="bg-red-600 hover:bg-red-700 text-white"
                                size="sm"
                              >
                                {actionLoading[`${request._id}_reject`] ? 'Rejecting...' : 'Reject'}
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {isEditing ? (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select
                                  value={editing[request._id]?.status || request.status}
                                  onValueChange={(value) => handleEdit(request._id, "status", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {request.type === 'leave' ? (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </>
                                    ) : request.type === 'help' ? (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                      </>
                                    ) : request.type === 'expense' ? (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </>
                                    ) : (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>

                                {(request.type === 'help' || request.type === 'regularization' || request.type === 'expense') && (
                                  <Input
                                    placeholder={request.type === 'help' ? "Response message..." : request.type === 'expense' ? "Review comment (optional)..." : "Review comment..."}
                                    value={editing[request._id]?.response || ""}
                                    onChange={(e) => handleEdit(request._id, "response", e.target.value)}
                                  />
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleSave(request)}
                                  disabled={actionLoading[request._id]}
                                  className="bg-slate-600 hover:bg-slate-700 text-white"
                                  size="sm"
                                >
                                  {actionLoading[request._id] ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  onClick={() => handleCancelEdit(request._id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            (request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress')) && (
                              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <Button
                                  onClick={() => handleStartEdit(request)}
                                  className="bg-slate-600 hover:bg-slate-700 text-white"
                                  size="sm"
                                >
                                  {request.status === 'in-progress' ? 'Update Request' : 'Review Request'}
                                </Button>
                              </div>
                            )
                          )}

                          {(request.response || request.reviewComment) && !isEditing && (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-medium">Response:</span> {request.response || request.reviewComment}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequestsPage;
