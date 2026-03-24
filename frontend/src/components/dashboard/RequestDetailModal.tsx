import { useState, ReactElement } from 'react';
import { X, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Play, CheckCheck, MapPin, LucideIcon } from 'lucide-react';
import { formatDate } from '@/utils/istUtils';
import {
  useUpdateLeaveStatus,
  useUpdateHelpInquiry,
  useReviewRegularization,
  useApprovePasswordReset,
  useRejectPasswordReset,
  useUpdateWFHStatus
} from '@/hooks/queries';

interface AttemptedLocation {
  latitude?: number;
  longitude?: number;
}

interface Request {
  _id?: string;
  id?: string;
  type: 'leave' | 'help' | 'regularization' | 'password' | 'wfh';
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'resolved' | 'expired' | 'completed';
  employee: string;
  date?: string;
  createdAt?: string;
  title: string;
  icon: ReactElement;

  // Leave request fields
  leaveType?: string;
  leaveDate?: string;
  leaveReason?: string;

  // Help request fields
  subject?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  response?: string;

  // Regularization request fields
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason?: string;

  // Password reset fields
  email?: string;
  name?: string;
  resetTokenExpires?: string;

  // WFH request fields
  nearestOffice?: string;
  distanceFromOffice?: number;
  attemptedLocation?: AttemptedLocation;
}

interface RequestDetailModalProps {
  request: Request | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'in-progress' | 'resolved' | 'expired' | 'completed';

interface StatusConfig {
  color: string;
  icon: LucideIcon;
}

const RequestDetailModal = ({ request, isOpen, onClose, onUpdate }: RequestDetailModalProps) => {
  const [reviewComment, setReviewComment] = useState('');
  const [helpResponse, setHelpResponse] = useState('');

  // Mutations
  const updateLeaveMutation = useUpdateLeaveStatus();
  const updateHelpMutation = useUpdateHelpInquiry();
  const reviewRegularizationMutation = useReviewRegularization();
  const approvePasswordResetMutation = useApprovePasswordReset();
  const rejectPasswordResetMutation = useRejectPasswordReset();
  const updateWFHMutation = useUpdateWFHStatus();

  const isProcessing =
    updateLeaveMutation.isPending ||
    updateHelpMutation.isPending ||
    reviewRegularizationMutation.isPending ||
    approvePasswordResetMutation.isPending ||
    rejectPasswordResetMutation.isPending ||
    updateWFHMutation.isPending;

  if (!isOpen || !request) return null;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!request._id && !request.id) {
      console.error('Request ID is missing');
      return;
    }

    try {
      const requestId = request._id || request.id!;

      switch (request.type) {
        case 'leave':
          await updateLeaveMutation.mutateAsync({ leaveId: requestId, status: status as 'pending' | 'approved' | 'rejected' });
          break;
        case 'help':
          await updateHelpMutation.mutateAsync({
            id: requestId,
            status: status as 'pending' | 'in-progress' | 'resolved',
            response: helpResponse || undefined
          });
          break;
        case 'regularization':
          await reviewRegularizationMutation.mutateAsync({
            requestId,
            status: status as 'pending' | 'approved' | 'rejected',
            comment: reviewComment
          });
          break;
        case 'password':
          if (status === 'approved') {
            await approvePasswordResetMutation.mutateAsync(requestId);
          } else if (status === 'rejected') {
            await rejectPasswordResetMutation.mutateAsync({ requestId, reason: reviewComment });
          } else {
            throw new Error('Invalid status for password reset request');
          }
          break;
        case 'wfh':
          await updateWFHMutation.mutateAsync({ requestId, status: status as 'pending' | 'approved' | 'rejected', reviewComment });
          break;
        default:
          throw new Error('Unknown request type');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error updating request status');
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig: Record<RequestStatus, StatusConfig> = {
      pending: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
      'in-progress': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Play },
      resolved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCheck },
      expired: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderRequestDetails = () => {
    switch (request.type) {
      case 'leave':
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Leave Type</label>
                <p className="text-sm sm:text-base text-foreground capitalize mt-1">{request.leaveType}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Leave Date</label>
                <p className="text-sm sm:text-base text-foreground mt-1">{formatDate(request.leaveDate, false, 'DD MMMM YYYY')}</p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Reason</label>
              <p className="text-sm sm:text-base text-foreground mt-1 leading-relaxed">{request.leaveReason}</p>
            </div>
          </div>
        );

      case 'help': {
        const getPriorityBadge = (priority?: 'low' | 'medium' | 'high') => {
          const priorityConfig: Record<string, { color: string }> = {
            low: { color: 'bg-muted text-muted-foreground' },
            medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
            high: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
          };
          const config = priorityConfig[priority || 'medium'];
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
            </span>
          );
        };

        return (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Subject</label>
              <p className="text-sm sm:text-base text-foreground mt-1 font-medium">{request.subject}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-sm sm:text-base text-foreground capitalize mt-1">{request.category || 'General'}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Priority</label>
                <div className="mt-1">{getPriorityBadge(request.priority)}</div>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm sm:text-base text-foreground mt-1 whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </div>
            {request.response && (
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Previous Response</label>
                <div className="mt-1 p-2 sm:p-3 bg-muted rounded-lg">
                  <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed">{request.response}</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'regularization': {
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Date</label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-medium">{formatDate(request.date, false, 'DD MMMM YYYY')}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Type</label>
                <p className="text-sm sm:text-base text-foreground capitalize mt-1">Attendance Regularization</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested Check-in
                </label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-mono">
                  {request.requestedCheckIn ? formatDateTime(request.requestedCheckIn) : 'Not specified'}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested Check-out
                </label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-mono">
                  {request.requestedCheckOut ? formatDateTime(request.requestedCheckOut) : 'Not specified'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Reason</label>
              <p className="text-sm sm:text-base text-foreground mt-1 leading-relaxed">{request.reason}</p>
            </div>
          </div>
        );
      }

      case 'password': {
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-mono">{request.email}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Name</label>
                <p className="text-sm sm:text-base text-foreground mt-1">{request.name || 'Not provided'}</p>
              </div>
            </div>
          </div>
        );
      }

      case 'wfh': {
        const formatCoord = (value?: number) => {
          if (typeof value !== 'number') return 'N/A';
          return value.toFixed(5);
        };
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Nearest Office
                </label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-mono">
                  {request.nearestOffice || 'Not detected'}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Distance from Office
                </label>
                <p className="text-sm sm:text-base text-foreground mt-1 font-mono">
                  {request.distanceFromOffice !== undefined ? `${request.distanceFromOffice} m` : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-muted-foreground">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Latitude</label>
                <p className="mt-1 font-mono">
                  {formatCoord(request.attemptedLocation?.latitude)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Longitude</label>
                <p className="mt-1 font-mono">
                  {formatCoord(request.attemptedLocation?.longitude)}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground">Reason</label>
              <p className="text-sm sm:text-base text-foreground mt-1 leading-relaxed">
                {request.reason}
              </p>
            </div>
          </div>
        );
      }

      default:
        return <p className="text-muted-foreground">No additional details available.</p>;
    }
  };

  const shouldShowCommentField = (() => {
    if (request.type === 'password') {
      const isTokenExpired = request.resetTokenExpires && new Date(request.resetTokenExpires) < new Date();
      const isRequestExpired = request.status === 'expired' || isTokenExpired;
      return request.status === 'pending' && !isRequestExpired;
    }
    return request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress');
  })();

  const shouldShowActionButtons = (() => {
    if (request.type === 'password') {
      const isTokenExpired = request.resetTokenExpires && new Date(request.resetTokenExpires) < new Date();
      const isRequestExpired = request.status === 'expired' || isTokenExpired;
      const canTakeAction = request.status === 'pending' && !isRequestExpired;
      return canTakeAction;
    }
    return request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress');
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg flex-shrink-0">
              {request.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {request.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Request Details & Review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg bg-neutral-50 hover:bg-muted dark:hover:bg-neutral-600 border border-border dark:border-border shadow-sm hover:shadow transition-all duration-200 flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-180px)] sm:max-h-[calc(90vh-200px)]">
          {/* Employee Info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm sm:text-base truncate">{request.employee}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Employee</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                <p className="text-xs sm:text-sm font-medium text-foreground">
                  {formatDateTime(request.date || request.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Status</span>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* Request Details */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Request Details</span>
            </div>
            {renderRequestDetails()}
          </div>

          {/* Response/Comment Field */}
          {shouldShowCommentField && (
            <div className="mb-4 sm:mb-6">
              {request.type === 'help' ? (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                    Response Message (Required for resolution)
                  </label>
                  <textarea
                    value={helpResponse}
                    onChange={(e) => setHelpResponse(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Provide a detailed response to help the employee..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-muted-foreground mb-2">
                    Review Comment (Optional)
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-white dark:bg-card text-foreground placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Add a comment for this review..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {shouldShowActionButtons && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-border bg-muted/50">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-muted-foreground hover:text-foreground dark:hover:text-neutral-200 font-medium transition-colors disabled:opacity-50 text-sm sm:text-base order-2 sm:order-1"
            >
              Cancel
            </button>

            {request.type === 'help' ? (
              // Help request buttons
              <>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate('in-progress')}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                  >
                    <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                    {isProcessing ? 'Processing...' : 'Start Working'}
                  </button>
                )}
                <button
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={isProcessing || !helpResponse.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-3"
                  title={!helpResponse.trim() ? 'Response message is required' : ''}
                >
                  <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isProcessing ? 'Processing...' : 'Resolve'}
                </button>
              </>
            ) : (
              // Leave, regularization, and password reset request buttons
              <>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                >
                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isProcessing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-3"
                >
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isProcessing ? 'Processing...' : (request.type === 'password' ? 'Approve ' : 'Approve')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailModal;
