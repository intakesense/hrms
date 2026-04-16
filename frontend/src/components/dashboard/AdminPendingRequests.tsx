import React, { useState, useMemo } from 'react';
import { FileText, HelpCircle, Calendar, RefreshCw, Clock, Key, MapPin, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestDetailModal from './RequestDetailModal';
import { formatISTDate } from '@/utils/luxonUtils';
import {
  useAllLeaves,
  useAllHelpInquiries,
  useRegularizationRequests,
  usePasswordResetRequests,
  useWFHRequests,
  useAllExpenses
} from '@/hooks/queries';

// Types
interface BaseRequest {
  _id?: string;
  status?: string;
  createdAt?: string;
  date?: string;
  type: string;
  icon: JSX.Element;
  title: string;
  description: string;
  employee: string;
}

interface LeaveRequest extends BaseRequest {
  type: 'leave';
  leaveType?: string;
  leaveReason?: string;
  leaveDate?: string;
  employeeName?: string;
  employeeId?: string;
}

interface HelpRequest extends BaseRequest {
  type: 'help';
  subject?: string;
  userId?: {
    name?: string;
  };
}

interface RegularizationRequest extends BaseRequest {
  type: 'regularization';
  reason?: string;
  user?: {
    name?: string;
  };
}

interface PasswordRequest extends BaseRequest {
  type: 'password';
  email?: string;
  name?: string;
}

interface WFHRequest extends BaseRequest {
  type: 'wfh';
  reason?: string;
  employeeName?: string;
  employeeId?: string;
}

interface ExpenseRequest extends BaseRequest {
  type: 'expense';
  item?: string;
  amount?: number;
}

type UnifiedRequest = LeaveRequest | HelpRequest | RegularizationRequest | PasswordRequest | WFHRequest | ExpenseRequest;

const AdminPendingRequests = () => {
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch all pending requests using React Query hooks
  const { data: leavesData, isLoading: leavesLoading, refetch: refetchLeaves } = useAllLeaves();
  const { data: helpData, isLoading: helpLoading, refetch: refetchHelp } = useAllHelpInquiries({ status: 'pending' });
  const { data: regData, isLoading: regLoading, refetch: refetchReg } = useRegularizationRequests();
  const { data: passwordData, isLoading: passwordLoading, refetch: refetchPassword } = usePasswordResetRequests();
  const { data: wfhData, isLoading: wfhLoading, refetch: refetchWFH } = useWFHRequests({ status: 'pending' });
  const { data: expensesData, isLoading: expensesLoading, refetch: refetchExpenses } = useAllExpenses({ status: 'pending' });

  const isLoading = leavesLoading || helpLoading || regLoading || passwordLoading || wfhLoading || expensesLoading;

  // Process and combine all pending requests
  const requests = useMemo<UnifiedRequest[]>(() => {
    const allRequests: UnifiedRequest[] = [];

    // Process leaves - leavesData is an array directly from useAllLeaves
    if (leavesData && Array.isArray(leavesData)) {
      const pendingLeaves = leavesData.filter((leave: any) => leave.status === 'pending');
      allRequests.push(...pendingLeaves.map((leave: any): LeaveRequest => ({
        ...leave,
        type: 'leave',
        icon: <Calendar className="w-5 h-5 text-blue-500" />,
        title: `${leave.leaveType === 'full-day' ? 'Full Day' : 'Half Day'} Leave Request`,
        description: leave.reason,
        employee: leave.employeeName || 'Unknown Employee',
        date: leave.startDate || leave.createdAt
      })));
    }

    // Process help inquiries (already filtered by status: pending)
    if (helpData) {
      const inquiries = helpData.inquiries || helpData;
      allRequests.push(...inquiries.map((help: any): HelpRequest => ({
        ...help,
        type: 'help',
        icon: <HelpCircle className="w-5 h-5 text-purple-500" />,
        title: help.subject,
        description: help.description,
        employee: help.userId?.name || 'Unknown User',
        date: help.createdAt
      })));
    }

    // Process regularizations
    if (regData) {
      const regs = regData.regs || regData;
      const pendingRegs = regs.filter((reg: any) => reg.status === 'pending');
      allRequests.push(...pendingRegs.map((reg: any): RegularizationRequest => ({
        ...reg,
        type: 'regularization',
        icon: <Clock className="w-5 h-5 text-orange-500" />,
        title: 'Attendance Regularization',
        description: reg.reason || 'Missing checkout regularization request',
        employee: reg.user?.name || 'Unknown User',
        date: reg.createdAt || reg.date
      })));
    }

    // Process password resets
    if (passwordData) {
      const requests = passwordData.requests || passwordData;
      const pendingPasswords = requests.filter((req: any) => req.status === 'pending');
      allRequests.push(...pendingPasswords.map((req: any): PasswordRequest => ({
        ...req,
        type: 'password',
        icon: <Key className="w-5 h-5 text-cyan-500" />,
        title: 'Password Reset Request',
        description: `User: ${req.email}`,
        employee: req.name || 'Unknown User',
        date: req.createdAt
      })));
    }

    // Process WFH requests (already filtered by status: pending)
    if (wfhData) {
      const wfhRequests = wfhData.requests || wfhData;
      allRequests.push(...wfhRequests.map((request: any): WFHRequest => ({
        ...request,
        type: 'wfh',
        icon: <MapPin className="w-5 h-5 text-green-500" />,
        title: 'WFH Request',
        description: request.reason,
        employee: request.employeeName || request.employeeId || 'Unknown Employee',
        date: request.createdAt
      })));
    }

    // Process Expense requests (already filtered by status: pending)
    if (expensesData) {
      const expenses = expensesData.expenses || expensesData;
      allRequests.push(...expenses.map((exp: any): ExpenseRequest => ({
        ...exp,
        type: 'expense',
        icon: <IndianRupee className="w-5 h-5 text-emerald-500" />,
        title: `Expense Reimbursement: ${exp.item || 'Reimbursement'}`,
        description: `Amount: ₹${Number(exp.amount || 0).toLocaleString()}`,
        employee: exp.employeeName || 
                 (exp.employee && typeof exp.employee === 'object' && 'firstName' in exp.employee ? 
                  `${exp.employee.firstName} ${exp.employee.lastName || ''}`.trim() : 
                  'Unknown Employee'),
        date: exp.date || exp.createdAt
      })));
    }

    // Sort by date (most recent first) and limit to 10
    return allRequests
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
      .slice(0, 10);
  }, [leavesData, helpData, regData, passwordData, wfhData, expensesData]);

  const handleRequestClick = (request: UnifiedRequest): void => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleRequestUpdate = (): void => {
    // React Query will automatically refetch when needed
    // No manual refresh required!
  };

  const fetchPendingRequests = (): void => {
    // Manually refetch all data sources
    refetchLeaves();
    refetchHelp();
    refetchReg();
    refetchPassword();
    refetchWFH();
    refetchExpenses();
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border 50 dark:border-border 50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-1">
            Pending Requests
          </h3>
          <p className="text-sm text-muted-foreground">
            Recent requests awaiting your review (showing latest 10)
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 font-medium text-xs sm:text-sm">
              {requests.length} pending
            </span>
          </div>
          <button
            onClick={fetchPendingRequests}
            className="p-1.5 sm:p-2 text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 bg-muted rounded-lg shadow-sm hover:shadow-md border border-border dark:border-border transition-all duration-200 hover:scale-105"
            title="Refresh pending requests"
          >
            <RefreshCw size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 sm:pr-2">
        {requests.length > 0 ? requests.map((request, index) => (
          <div
            key={index}
            onClick={() => handleRequestClick(request)}
            className="group border border-border rounded-lg p-3 sm:p-4 hover:bg-muted hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-200 hover:shadow-md cursor-pointer"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 p-1.5 sm:p-2 bg-muted rounded-lg group-hover:bg-card transition-colors">
                {React.cloneElement(request.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
                  <h4 className="font-semibold text-foreground text-sm leading-tight">
                    {request.title}
                  </h4>
                  <span className="flex-shrink-0 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {formatISTDate(request.date!, { customFormat: 'dd MMM yyyy' })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {request.employee}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed ml-10 sm:ml-14">
              {request.description}
            </p>
          </div>
        )) : (
          <div className="text-center text-muted-foreground py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
            </div>
            <p className="text-lg font-medium mb-1">No pending requests</p>
            <p className="text-sm">All requests have been processed</p>
          </div>
        )}
      </div>

      {requests.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <button className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors hover:underline">
              <span onClick={() => navigate("/admin/requests")}>View All Requests</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      <RequestDetailModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleRequestUpdate}
      />
    </div>
  );
};

export default AdminPendingRequests;
