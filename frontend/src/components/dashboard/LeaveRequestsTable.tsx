import { memo, useMemo, ReactNode } from "react";
import { Paperclip, HelpCircle, AlertCircle, CheckCircle } from "lucide-react";

interface BaseRequest {
  id?: string;
  _id?: string;
  type: 'leave' | 'help' | 'regularization';
  status: 'approved' | 'pending' | 'rejected' | 'completed' | 'in-progress' | 'resolved';
  displayDate?: string | Date;
  createdAt?: string | Date;
  displayReason?: string;
}

interface LeaveRequest extends BaseRequest {
  type: 'leave';
  leaveType?: string;
  leaveDate?: string | Date;
  startDate?: string | Date;
  endDate?: string | Date;
  numberOfDays?: number;
  leaveReason?: string;
  reason?: string;
  description?: string;
  date?: string | Date;
}

interface HelpRequest extends BaseRequest {
  type: 'help';
  subject?: string;
  title?: string;
  message?: string;
  description?: string;
}

interface RegularizationRequest extends BaseRequest {
  type: 'regularization';
  requestedCheckIn?: string | Date;
  requestedCheckOut?: string | Date;
  reviewComment?: string;
  date?: string | Date;
  reason?: string;
}

type Request = LeaveRequest | HelpRequest | RegularizationRequest;

interface LeaveRequestsTableProps {
  leaveRequests: Request[];
  helpInquiries?: HelpRequest[];
  loadingLeaveRequests: boolean;
  onNewRequest: () => void;
  onNewHelpRequest: () => void;
  formatLeaveType: (type?: string) => string;
}

type StatusKey = 'approved' | 'pending' | 'rejected' | 'completed';

interface StatusConfig {
  bgClass: string;
  textClass: string;
  label: string;
}

// 🚀 OPTIMIZED: Leave Requests Table with memoization
const LeaveRequestsTable = memo<LeaveRequestsTableProps>(({
  leaveRequests,
  helpInquiries = [],
  loadingLeaveRequests,
  onNewRequest,
  onNewHelpRequest,
  formatLeaveType
}) => {
  // Ensure we're safely accessing arrays and handling undefined values
  const safeLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
  const safeHelpInquiries = Array.isArray(helpInquiries) ? helpInquiries : [];

  // 🚀 OPTIMIZED: Process leave requests with better error handling (memoized)
  const processedLeaveRequests = useMemo(() =>
    safeLeaveRequests
      .filter((request): request is Request => request && typeof request === 'object' && !!(request.id || request._id))
      .map(request => ({
        ...request,
        // Ensure we have an id (backend might use _id instead of id)
        id: request.id || request._id,
        // Type is already set in dashboard.jsx for allRequests
        // Map fields that might have different names in backend vs mock data
        leaveType: 'leaveType' in request ? (request.leaveType || 'vacation') : undefined,
        displayDate: request.displayDate || ('leaveDate' in request ? request.leaveDate : undefined) || ('date' in request ? request.date : undefined),
        displayReason: request.displayReason || ('leaveReason' in request ? request.leaveReason : undefined) || request.reason || request.description || '',
        status: request.status || 'pending',
        requestedCheckIn: 'requestedCheckIn' in request ? request.requestedCheckIn : undefined,
        requestedCheckOut: 'requestedCheckOut' in request ? request.requestedCheckOut : undefined,
        reviewComment: 'reviewComment' in request ? request.reviewComment : undefined,
    })), [safeLeaveRequests]);

  // Process help inquiries with better error handling for both backend and mock data formats
  const _processedHelpInquiries = safeHelpInquiries
    .filter((inquiry): inquiry is HelpRequest => inquiry && typeof inquiry === 'object' && !!(inquiry.id || inquiry._id))
    .map(inquiry => ({
      ...inquiry,
      // Ensure we have an id (backend might use _id instead of id)
      id: inquiry.id || inquiry._id,
      type: 'help' as const,
      // Map fields that might have different names in backend vs mock data
      title: inquiry.title || inquiry.subject || 'Help Inquiry',
      status: inquiry.status || 'pending',
      displayDate: inquiry.createdAt || ('date' in inquiry ? inquiry.date : undefined),
      displayReason: inquiry.message || inquiry.description || ''
    }));

  // Combine all requests and sort by date
  const allRequests = [
    ...processedLeaveRequests,
    // help requests are now merged in dashboard.jsx, so skip here
  ].sort((a, b) => {
    // Handle cases where dates might be invalid
    const dateA = a.displayDate instanceof Date ? a.displayDate : new Date(a.displayDate || 0);
    const dateB = b.displayDate instanceof Date ? b.displayDate : new Date(b.displayDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Get pending requests
  const pendingRequests = allRequests.filter(request =>
    request.status === 'pending'
  );

  const renderStatusBadge = (status: string): ReactNode => {
    const statusConfig: Record<StatusKey, StatusConfig> = {
      approved: {
        bgClass: "bg-green-100 dark:bg-green-500/20",
        textClass: "text-green-700 dark:text-green-300",
        label: "Approved"
      },
      pending: {
        bgClass: "bg-amber-100 dark:bg-amber-500/20",
        textClass: "text-amber-700 dark:text-amber-300",
        label: "Pending"
      },
      rejected: {
        bgClass: "bg-red-100 dark:bg-red-500/20",
        textClass: "text-red-700 dark:text-red-300",
        label: "Rejected"
      },
      completed: {
        bgClass: "bg-blue-100 dark:bg-blue-500/20",
        textClass: "text-blue-700 dark:text-blue-300",
        label: "Completed"
      }
    };

    const config = statusConfig[status as StatusKey] || statusConfig.pending;

    return (
      <span className={`px-2 py-0.5 sm:px-3 sm:py-1 ${config.bgClass} ${config.textClass} rounded-full text-xs font-semibold`}>
        {config.label}
      </span>
    );
  };

  const getRequestTypeLabel = (request: Request): string => {
    if (request.type === 'help') {
      return 'Help Inquiry';
    }
    return formatLeaveType(request.type === 'leave' ? request.leaveType : undefined);
  };

  // Display empty state with ability to create new requests
  const renderEmptyState = (): ReactNode => (
    <div className="py-8 text-center">
      <div className="flex justify-center mb-3">
        <AlertCircle size={48} className="text-amber-500/70 dark:text-amber-400/70" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No requests found</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {loadingLeaveRequests
          ? "Loading your requests..."
          : "You haven't submitted any leave requests or help inquiries yet"}
      </p>
      <div className="flex justify-center space-x-3">
        <button
          onClick={onNewRequest}
          className="flex items-center gap-2 bg-cyan-100 dark:bg-cyan-500/10 hover:bg-cyan-200 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          disabled={loadingLeaveRequests}
        >
          <span>New Leave Request</span>
          <Paperclip size={16} />
        </button>
        <button
          onClick={onNewHelpRequest}
          className="flex items-center gap-2 bg-purple-100 dark:bg-purple-500/10 hover:bg-purple-200 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          disabled={loadingLeaveRequests}
        >
          <span>New Help Inquiry</span>
          <HelpCircle size={16} />
        </button>
      </div>
    </div>
  );

  // Utility to check if a value is a valid date
  const isValidDate = (d?: string | Date): boolean => {
    if (!d) return false;
    const date = new Date(d);
    return date instanceof Date && !isNaN(date.getTime());
  };

  return (
    <div className="bg-card rounded-xl shadow-xl transition-colors duration-200">
      <div className="p-3 sm:p-5 border-b border-border flex flex-wrap sm:flex-nowrap justify-between items-center">
        <div className="w-full sm:w-auto mb-2 sm:mb-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Your Requests</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Recent leave, help desk, and regularization requests
            {pendingRequests.length > 0 &&
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                ({pendingRequests.length} pending)
              </span>
            }
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onNewRequest}
            className="flex items-center gap-2 bg-cyan-100 dark:bg-cyan-500/10 hover:bg-cyan-200 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm transition-colors"
            disabled={loadingLeaveRequests}
          >
            <span>Leave Request</span>
            <Paperclip size={14} />
          </button>
          <button
            onClick={onNewHelpRequest}
            className="flex items-center gap-2 bg-purple-100 dark:bg-purple-500/10 hover:bg-purple-200 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm transition-colors"
            disabled={loadingLeaveRequests}
          >
            <span>Help Inquiry</span>
            <HelpCircle size={14} />
          </button>
        </div>
      </div>
      <div className="p-3">
        {loadingLeaveRequests ? (
          <div className="py-8 text-center text-muted-foreground">
            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p>Loading requests...</p>
          </div>
        ) : allRequests.length > 0 ? (
          <div className="w-full">
            {/* Table Headers for Desktop */}
            <div className="hidden md:table-header-group w-full">
              <div className="md:table-row text-left text-xs text-muted-foreground border-b-2 border-border">
                <div className="md:table-cell py-3.5 px-3 font-semibold">Type</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Date</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Status</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Requested</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Details</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Check In</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Check Out</div>
                <div className="md:table-cell py-3.5 px-3 font-semibold">Review</div>
              </div>
            </div>

            {/* Mobile Card Layout & Desktop Table Body */}
            <div className="md:table-row-group">
              {allRequests.map((request, index) => (
                <div
                  key={`${request.type}-${request.id || index}`}
                  className={`
                    md:table-row
                    block p-4 mb-3 md:mb-0 border md:border-b md:border-x-0 border-border
                    rounded-lg md:rounded-none
                    hover:bg-muted dark:hover:bg-muted 40
                    transition-colors text-sm
                    ${request.status === 'pending' ? 'bg-amber-50/50 dark:bg-amber-500/10' : 'bg-white dark:bg-card 50'}
                  `}
                >
                  {/* Type */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Type</span>
                      {request.type === 'help' && (
                        <div className="flex items-center font-medium text-foreground">
                          <HelpCircle size={14} className="mr-2 text-purple-500 dark:text-purple-400" />
                          <span>Help Inquiry</span>
                        </div>
                      )}
                      {request.type === 'leave' && (
                        <div className="flex items-center font-medium text-foreground">
                          <Paperclip size={14} className="mr-2 text-cyan-500 dark:text-cyan-400" />
                          {getRequestTypeLabel(request)}
                        </div>
                      )}
                      {request.type === 'regularization' && (
                        <div className="flex items-center font-medium text-foreground">
                          <CheckCircle size={14} className="mr-2 text-green-500 dark:text-green-400" />
                          <span>Regularization</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Date</span>
                      <span className="text-foreground">
                        {(() => {
                          const startDate = 'startDate' in request ? request.startDate : undefined;
                          const endDate = 'endDate' in request ? request.endDate : undefined;
                          const isMulti = startDate && endDate && isValidDate(startDate) && isValidDate(endDate) && new Date(startDate).toDateString() !== new Date(endDate).toDateString();
                          if (isMulti) {
                            const fmt = (d: string | Date) => new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(new Date(d));
                            const numDays = 'numberOfDays' in request ? (request as LeaveRequest).numberOfDays : undefined;
                            return <>{fmt(startDate!)} – {fmt(endDate!)}{numDays ? <span className="ml-1 text-xs text-muted-foreground">({numDays}d)</span> : null}</>;
                          }
                          return isValidDate(request.displayDate)
                            ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(request.displayDate!))
                            : '—';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Status</span>
                      {renderStatusBadge(request.status)}
                    </div>
                  </div>

                  {/* Requested Date */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                     <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Requested</span>
                      <span className="text-muted-foreground">
                        {isValidDate(request.createdAt)
                          ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(new Date(request.createdAt!))
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle md:max-w-[200px]">
                    <div className="flex justify-between items-start md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden mt-1">Details</span>
                      <p className="text-muted-foreground whitespace-normal break-words text-right md:text-left" title={request.displayReason}>
                        {request.type === 'help' ? (request.title || request.displayReason) : (request.displayReason)}
                      </p>
                    </div>
                  </div>

                  {/* Check In */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Check In</span>
                      <span className="text-muted-foreground">
                        {request.type === 'regularization' && isValidDate(request.requestedCheckIn)
                          ? new Date(request.requestedCheckIn!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Check Out */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle">
                    <div className="flex justify-between items-center md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden">Check Out</span>
                      <span className="text-muted-foreground">
                        {request.type === 'regularization' && isValidDate(request.requestedCheckOut)
                          ? new Date(request.requestedCheckOut!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Review Comment */}
                  <div className="md:table-cell py-2 md:py-3.5 px-0 md:px-3 align-middle md:max-w-[200px]">
                     <div className="flex justify-between items-start md:block">
                      <span className="text-xs font-bold text-muted-foreground uppercase md:hidden mt-1">Review</span>
                      <p className="text-muted-foreground whitespace-normal break-words text-right md:text-left" title={request.type === 'regularization' ? request.reviewComment : undefined}>
                        {request.type === 'regularization' ? (request.reviewComment || '—') : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
});

LeaveRequestsTable.displayName = 'LeaveRequestsTable';

export default LeaveRequestsTable;
