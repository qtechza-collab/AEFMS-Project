import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle, MessageSquare, Send } from 'lucide-react';
import { realtimeApprovalSystem } from '../utils/realtimeApprovalSystem';
import { toast } from 'sonner';

interface QuickApprovalButtonsProps {
  claim: {
    id: string;
    employee_name: string;
    amount: number;
    currency: string;
    category: string;
    status: string;
    is_flagged?: boolean;
    employee_id?: string;
  };
  currentUser: {
    id: string;
    name: string;
    role: 'employer' | 'hr' | 'administrator';
  };
  onApprove?: (claimId: string) => void;
  onReject?: (claimId: string) => void;
  disabled?: boolean;
}

export function QuickApprovalButtons({ 
  claim, 
  currentUser,
  onApprove, 
  onReject, 
  disabled = false 
}: QuickApprovalButtonsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'review' | null>(null);
  const [comments, setComments] = useState('');
  // Enhanced approval processing with cloud integration
  const handleQuickAction = async (actionType: 'approve' | 'reject' | 'review') => {
    if (actionType === 'reject') {
      // Always require comments for rejection
      setPendingAction(actionType);
      setShowCommentDialog(true);
      return;
    }

    if (actionType === 'review' || (actionType === 'approve' && claim.amount > 1000)) {
      // Require comments for high-value approvals or reviews
      setPendingAction(actionType);
      setShowCommentDialog(true);
      return;
    }

    // Process immediate approval for simple cases
    await processApproval(actionType, '');
  };

  const processApproval = async (actionType: 'approve' | 'reject' | 'review', comments: string) => {
    setIsProcessing(true);

    try {
      // Use enhanced real-time approval system
      const result = await realtimeApprovalSystem.processRealtimeApproval(
        claim.id,
        currentUser.id,
        actionType,
        comments,
        claim.employee_id ? [claim.employee_id] : []
      );

      if (result.success) {
        // Call legacy callbacks for backward compatibility
        if (actionType === 'approve' && onApprove) {
          onApprove(claim.id);
        } else if (actionType === 'reject' && onReject) {
          onReject(claim.id);
        }

        // Enhanced success notification
        const actionMessages = {
          approve: 'approved',
          reject: 'rejected', 
          review: 'sent for review'
        };

        toast.success(`Claim ${actionMessages[actionType]} successfully`, {
          description: `${claim.employee_name}'s ${claim.category} claim for ${claim.currency} ${claim.amount} has been ${actionMessages[actionType]}`,
          duration: 5000
        });

        // Close dialog and reset state
        setShowCommentDialog(false);
        setPendingAction(null);
        setComments('');
      } else {
        toast.error('Approval processing failed', {
          description: result.error || 'Please try again or contact support',
          duration: 7000
        });
      }
    } catch (error) {
      console.error('Approval processing error:', error);
      toast.error('An error occurred during approval processing', {
        description: 'Please check your connection and try again',
        duration: 7000
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogConfirm = async () => {
    if (pendingAction) {
      await processApproval(pendingAction, comments);
    }
  };

  // Only show for pending claims
  if (claim.status !== 'pending') {
    return (
      <div className="flex items-center space-x-2">
        <Badge 
          variant="outline" 
          className={`
            ${claim.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : 
              claim.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' : 
              claim.status === 'under_review' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              'bg-yellow-100 text-yellow-800 border-yellow-200'}
          `}
        >
          {claim.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
          {claim.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
          {claim.status === 'under_review' && <MessageSquare className="w-3 h-3 mr-1" />}
          {claim.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
          {claim.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        {claim.is_flagged && (
          <AlertTriangle className="w-4 h-4 text-red-600" title="Flagged for review" />
        )}
        
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          PENDING
        </Badge>
        
        {/* Enhanced Manager Approval Buttons */}
        {currentUser.role === 'employer' && (
          <>
            <Button
              size="sm"
              onClick={() => handleQuickAction('approve')}
              disabled={disabled || isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-8 text-xs"
              title={`Approve ${claim.employee_name}'s claim for ${claim.currency} ${claim.amount}`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {isProcessing ? 'Processing...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleQuickAction('reject')}
              disabled={disabled || isProcessing}
              className="px-3 py-1 h-8 text-xs"
              title={`Reject ${claim.employee_name}'s claim for ${claim.currency} ${claim.amount}`}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction('review')}
              disabled={disabled || isProcessing}
              className="px-3 py-1 h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
              title="Send for HR review"
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Review
            </Button>
          </>
        )}
        
        {/* Enhanced HR/Admin Override Buttons */}
        {(currentUser.role === 'hr' || currentUser.role === 'administrator') && (
          <>
            <Button
              size="sm"
              onClick={() => handleQuickAction('approve')}
              disabled={disabled || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 h-8 text-xs"
              title={`Override approve ${claim.employee_name}'s claim`}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {isProcessing ? 'Processing...' : 'Override Approve'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleQuickAction('reject')}
              disabled={disabled || isProcessing}
              className="px-3 py-1 h-8 text-xs"
              title={`Override reject ${claim.employee_name}'s claim`}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Override Reject
            </Button>
          </>
        )}
      </div>

      {/* Comments Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'approve' ? 'Approve Claim' : 
               pendingAction === 'reject' ? 'Reject Claim' : 'Send for Review'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Employee:</strong> {claim.employee_name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Amount:</strong> {claim.currency} {claim.amount}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Category:</strong> {claim.category}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {pendingAction === 'reject' ? 'Reason for rejection (required):' : 'Comments (optional):'}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  pendingAction === 'reject' 
                    ? 'Please provide a reason for rejecting this claim...'
                    : pendingAction === 'review'
                    ? 'Additional review notes...'
                    : 'Optional approval comments...'
                }
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCommentDialog(false);
                setPendingAction(null);
                setComments('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDialogConfirm}
              disabled={isProcessing || (pendingAction === 'reject' && !comments.trim())}
              className={
                pendingAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                pendingAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              <Send className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 
               pendingAction === 'approve' ? 'Approve' :
               pendingAction === 'reject' ? 'Reject' : 'Send for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
