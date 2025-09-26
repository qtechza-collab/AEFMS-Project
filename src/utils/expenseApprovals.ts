import { supabase } from './supabase/client';
import { dataService, type ExpenseClaim } from './supabaseDataService';

export interface ApprovalWorkflow {
  id: string;
  claimId: string;
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  steps: ApprovalStep[];
  createdAt: string;
  completedAt?: string;
}

export interface ApprovalStep {
  stepNumber: number;
  approverRole: string;
  approverId?: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approvedAt?: string;
  requiredAmount?: number; // Minimum amount that requires this approval
}

export interface ApprovalDecision {
  claimId: string;
  decision: 'approve' | 'reject' | 'request_info';
  comments?: string;
  approverId: string;
}

export interface ApprovalRule {
  id: string;
  name: string;
  conditions: ApprovalCondition[];
  approvers: ApprovalStep[];
  active: boolean;
}

export interface ApprovalCondition {
  field: 'amount' | 'category' | 'department' | 'employee_role';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in';
  value: any;
}

/**
 * Logan Freights Expense Approvals Service
 * Advanced multi-level approval workflow management
 */
class ExpenseApprovalsService {
  
  /**
   * Get pending approvals for a user
   */
  async getPendingApprovals(userId: string, userRole: string): Promise<{ success: boolean; data?: ExpenseClaim[]; error?: string }> {
    try {
      // Different logic based on user role
      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, email, department)
        `);

      if (userRole === 'manager') {
        // Managers can approve claims from their department
        query = query
          .eq('status', 'pending')
          .or('approved_by.is.null,approved_by.neq.' + userId);
      } else if (userRole === 'hr') {
        // HR can see all pending claims
        query = query.eq('status', 'pending');
      } else if (userRole === 'administrator') {
        // Admins can see all claims
        query = query.in('status', ['pending', 'under_review']);
      } else {
        // Regular employees can't approve claims
        return { success: true, data: [] };
      }

      const { data, error } = await query.order('submitted_at', { ascending: true });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pending approvals'
      };
    }
  }

  /**
   * Process approval decision
   */
  async processApprovalDecision(decision: ApprovalDecision): Promise<{ success: boolean; error?: string }> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('id', decision.claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      // Check if user has permission to approve this claim
      const canApprove = await this.canUserApproveClaim(decision.approverId, claim);
      if (!canApprove) {
        throw new Error('User does not have permission to approve this claim');
      }

      // Update claim based on decision
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (decision.decision === 'approve') {
        updateData.status = 'approved';
        updateData.approved_by = decision.approverId;
        updateData.approved_at = new Date().toISOString();
      } else if (decision.decision === 'reject') {
        updateData.status = 'rejected';
        updateData.approved_by = decision.approverId;
        updateData.approved_at = new Date().toISOString();
      } else if (decision.decision === 'request_info') {
        updateData.status = 'info_requested';
        updateData.info_requested_by = decision.approverId;
        updateData.info_requested_at = new Date().toISOString();
      }

      if (decision.comments) {
        updateData.approval_comments = decision.comments;
      }

      const { error } = await supabase
        .from('expense_claims')
        .update(updateData)
        .eq('id', decision.claimId);

      if (error) throw error;

      // Create approval history record
      await this.createApprovalHistory(decision);

      // Send notification to employee
      await this.sendApprovalNotification(claim, decision);

      // Log the approval action
      await this.logApprovalAction(decision);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process approval decision'
      };
    }
  }

  /**
   * Check if user can approve a claim
   */
  private async canUserApproveClaim(userId: string, claim: any): Promise<boolean> {
    try {
      // Get user details
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, department')
        .eq('id', userId)
        .single();

      if (userError || !user) return false;

      // Administrators can approve any claim
      if (user.role === 'administrator') return true;

      // HR can approve any claim
      if (user.role === 'hr') return true;

      // Managers can approve claims from their department
      if (user.role === 'manager' && user.department === claim.department) {
        // Additional check for high-value claims
        if (claim.amount > 10000) {
          // High-value claims might need additional approval
          return user.role === 'administrator' || user.role === 'hr';
        }
        return true;
      }

      // Employees cannot approve claims
      return false;
    } catch (error) {
      console.error('Error checking approval permission:', error);
      return false;
    }
  }

  /**
   * Create approval workflow for claim
   */
  async createApprovalWorkflow(claimId: string): Promise<{ success: boolean; data?: ApprovalWorkflow; error?: string }> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      // Determine approval steps based on claim
      const steps = await this.determineApprovalSteps(claim);

      const workflow: ApprovalWorkflow = {
        id: `workflow_${Date.now()}`,
        claimId,
        currentStep: 1,
        totalSteps: steps.length,
        status: 'pending',
        steps,
        createdAt: new Date().toISOString()
      };

      // Save workflow to database
      const { error } = await supabase
        .from('approval_workflows')
        .insert({
          id: workflow.id,
          claim_id: workflow.claimId,
          current_step: workflow.currentStep,
          total_steps: workflow.totalSteps,
          status: workflow.status,
          steps: workflow.steps,
          created_at: workflow.createdAt
        });

      if (error) throw error;

      return { success: true, data: workflow };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create approval workflow'
      };
    }
  }

  /**
   * Determine approval steps based on claim properties
   */
  private async determineApprovalSteps(claim: any): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];

    // Step 1: Manager approval (always required)
    steps.push({
      stepNumber: 1,
      approverRole: 'manager',
      status: 'pending',
      requiredAmount: 0
    });

    // Step 2: HR approval for high amounts or sensitive categories
    if (claim.amount > 5000 || ['Entertainment', 'Travel'].includes(claim.category)) {
      steps.push({
        stepNumber: 2,
        approverRole: 'hr',
        status: 'pending',
        requiredAmount: 5000
      });
    }

    // Step 3: Administrator approval for very high amounts
    if (claim.amount > 15000) {
      steps.push({
        stepNumber: steps.length + 1,
        approverRole: 'administrator',
        status: 'pending',
        requiredAmount: 15000
      });
    }

    return steps;
  }

  /**
   * Get approval history for claim
   */
  async getApprovalHistory(claimId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select(`
          *,
          users!approval_history_approver_id_fkey(name, role)
        `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const history = (data || []).map(item => ({
        id: item.id,
        action: item.action,
        comments: item.comments,
        approver: item.users?.name || 'Unknown',
        approverRole: item.users?.role || 'Unknown',
        createdAt: item.created_at
      }));

      return { success: true, data: history };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get approval history'
      };
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get user's role
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get approval data based on role
      let query = supabase
        .from('expense_claims')
        .select('status, approved_by, amount, submitted_at, approved_at');

      if (user.role !== 'administrator' && user.role !== 'hr') {
        query = query.eq('approved_by', userId);
      }

      const { data: claims, error: claimsError } = await query;

      if (claimsError) throw claimsError;

      // Calculate statistics
      const stats = {
        totalApprovals: (claims || []).filter(c => c.approved_by === userId).length,
        pendingApprovals: (claims || []).filter(c => c.status === 'pending').length,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        averageApprovalTime: 0,
        totalAmountApproved: 0
      };

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      let totalApprovalTime = 0;
      let approvalTimeCount = 0;

      (claims || []).forEach(claim => {
        const submittedDate = new Date(claim.submitted_at);
        const approvedDate = claim.approved_at ? new Date(claim.approved_at) : null;

        // Monthly stats
        if (approvedDate && 
            approvedDate.getMonth() === currentMonth && 
            approvedDate.getFullYear() === currentYear) {
          if (claim.status === 'approved') {
            stats.approvedThisMonth++;
            stats.totalAmountApproved += claim.amount || 0;
          } else if (claim.status === 'rejected') {
            stats.rejectedThisMonth++;
          }
        }

        // Approval time calculation
        if (approvedDate && claim.approved_by === userId) {
          const timeDiff = approvedDate.getTime() - submittedDate.getTime();
          const daysDiff = timeDiff / (1000 * 3600 * 24);
          totalApprovalTime += daysDiff;
          approvalTimeCount++;
        }
      });

      if (approvalTimeCount > 0) {
        stats.averageApprovalTime = Math.round((totalApprovalTime / approvalTimeCount) * 10) / 10;
      }

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get approval statistics'
      };
    }
  }

  /**
   * Create approval history record
   */
  private async createApprovalHistory(decision: ApprovalDecision): Promise<void> {
    try {
      await supabase
        .from('approval_history')
        .insert({
          claim_id: decision.claimId,
          approver_id: decision.approverId,
          action: decision.decision,
          comments: decision.comments,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to create approval history:', error);
    }
  }

  /**
   * Send approval notification to employee
   */
  private async sendApprovalNotification(claim: any, decision: ApprovalDecision): Promise<void> {
    try {
      let title = '';
      let message = '';

      switch (decision.decision) {
        case 'approve':
          title = 'Expense Claim Approved';
          message = `Your expense claim for R${claim.amount} has been approved`;
          break;
        case 'reject':
          title = 'Expense Claim Rejected';
          message = `Your expense claim for R${claim.amount} has been rejected`;
          break;
        case 'request_info':
          title = 'Additional Information Required';
          message = `Please provide additional information for your expense claim of R${claim.amount}`;
          break;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: claim.employee_id,
          type: `claim_${decision.decision}`,
          title,
          message,
          priority: 'medium',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to send approval notification:', error);
    }
  }

  /**
   * Log approval action for audit trail
   */
  private async logApprovalAction(decision: ApprovalDecision): Promise<void> {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action_type: `claim_${decision.decision}`,
          description: `Expense claim ${decision.decision}ed`,
          metadata: {
            claimId: decision.claimId,
            approverId: decision.approverId,
            comments: decision.comments
          },
          user_id: decision.approverId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log approval action:', error);
    }
  }

  /**
   * Bulk approve claims
   */
  async bulkApprove(
    claimIds: string[], 
    approverId: string, 
    comments?: string
  ): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const results = [];

      for (const claimId of claimIds) {
        const result = await this.processApprovalDecision({
          claimId,
          decision: 'approve',
          approverId,
          comments
        });
        results.push({ claimId, ...result });
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      return {
        success: successCount === totalCount,
        results,
        error: successCount < totalCount ? 
          `${totalCount - successCount} claims failed to approve` : 
          undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk approval failed'
      };
    }
  }
}

// Export singleton instance
export const expenseApprovalsService = new ExpenseApprovalsService();

// Export utility functions
export const getPendingApprovals = (userId: string, userRole: string) =>
  expenseApprovalsService.getPendingApprovals(userId, userRole);
export const processApprovalDecision = (decision: ApprovalDecision) =>
  expenseApprovalsService.processApprovalDecision(decision);
export const createApprovalWorkflow = (claimId: string) =>
  expenseApprovalsService.createApprovalWorkflow(claimId);
export const getApprovalHistory = (claimId: string) =>
  expenseApprovalsService.getApprovalHistory(claimId);
export const getApprovalStatistics = (userId: string) =>
  expenseApprovalsService.getApprovalStatistics(userId);
export const bulkApprove = (claimIds: string[], approverId: string, comments?: string) =>
  expenseApprovalsService.bulkApprove(claimIds, approverId, comments);