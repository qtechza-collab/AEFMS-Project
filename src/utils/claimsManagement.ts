import { dataService, type ExpenseClaim } from './supabaseDataService';
import { supabase } from './supabase/client';

export interface ClaimFilters {
  status?: string[];
  department?: string[];
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
  employeeId?: string;
}

export interface ClaimApprovalData {
  claimId: string;
  decision: 'approve' | 'reject';
  comments?: string;
  approvedBy: string;
}

/**
 * Logan Freights Claims Management Service
 * Comprehensive claim processing and workflow management
 */
class ClaimsManagementService {
  
  /**
   * Get filtered claims for management
   */
  async getFilteredClaims(filters: ClaimFilters): Promise<{ success: boolean; data?: ExpenseClaim[]; error?: string }> {
    try {
      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, email, department)
        `);

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters.department?.length) {
        query = query.in('department', filters.department);
      }

      if (filters.dateRange) {
        query = query
          .gte('expense_date', filters.dateRange.start.toISOString())
          .lte('expense_date', filters.dateRange.end.toISOString());
      }

      if (filters.amountRange) {
        query = query
          .gte('amount', filters.amountRange.min)
          .lte('amount', filters.amountRange.max);
      }

      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }

      const { data, error } = await query.order('submitted_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get filtered claims'
      };
    }
  }

  /**
   * Bulk approve/reject claims
   */
  async bulkProcessClaims(approvals: ClaimApprovalData[]): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const results = [];

      for (const approval of approvals) {
        const result = await this.processSingleClaim(approval);
        results.push({ claimId: approval.claimId, ...result });
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      return {
        success: successCount === totalCount,
        results,
        error: successCount < totalCount ? `${totalCount - successCount} claims failed to process` : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk processing failed'
      };
    }
  }

  /**
   * Process single claim approval/rejection
   */
  private async processSingleClaim(approval: ClaimApprovalData): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status: approval.decision === 'approve' ? 'approved' : 'rejected',
        approved_by: approval.approvedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (approval.comments) {
        updateData.approval_comments = approval.comments;
      }

      const { error } = await supabase
        .from('expense_claims')
        .update(updateData)
        .eq('id', approval.claimId);

      if (error) throw error;

      // Create notification for employee
      await this.createClaimNotification(approval.claimId, approval.decision, approval.approvedBy);

      // Log the approval action
      await this.logClaimAction(approval.claimId, approval.decision, approval.approvedBy, approval.comments);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process claim'
      };
    }
  }

  /**
   * Get claims requiring attention (pending, flagged, etc.)
   */
  async getClaimsRequiringAttention(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get pending claims
      const { data: pendingClaims, error: pendingError } = await supabase
        .from('expense_claims')
        .select('*, users!expense_claims_employee_id_fkey(name, department)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (pendingError) throw pendingError;

      // Get flagged claims
      const { data: flaggedClaims, error: flaggedError } = await supabase
        .from('expense_claims')
        .select('*, users!expense_claims_employee_id_fkey(name, department)')
        .eq('flagged_for_review', true)
        .order('submitted_at', { ascending: true });

      if (flaggedError) throw flaggedError;

      // Get high-value claims (over R5000)
      const { data: highValueClaims, error: highValueError } = await supabase
        .from('expense_claims')
        .select('*, users!expense_claims_employee_id_fkey(name, department)')
        .gte('amount', 5000)
        .eq('status', 'pending')
        .order('amount', { ascending: false });

      if (highValueError) throw highValueError;

      return {
        success: true,
        data: {
          pendingClaims: pendingClaims || [],
          flaggedClaims: flaggedClaims || [],
          highValueClaims: highValueClaims || [],
          totalRequiringAttention: (pendingClaims?.length || 0) + (flaggedClaims?.length || 0)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claims requiring attention'
      };
    }
  }

  /**
   * Get claim processing statistics
   */
  async getProcessingStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: stats, error } = await supabase
        .rpc('get_claim_processing_stats');

      if (error) throw error;

      const defaultStats = {
        totalClaims: 0,
        pendingClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
        averageProcessingTime: 0,
        totalAmount: 0,
        approvedAmount: 0
      };

      return {
        success: true,
        data: stats || defaultStats
      };
    } catch (error) {
      // Fallback to manual calculation if RPC doesn't exist
      try {
        const { data: claims, error: claimsError } = await supabase
          .from('expense_claims')
          .select('*');

        if (claimsError) throw claimsError;

        const stats = {
          totalClaims: claims?.length || 0,
          pendingClaims: claims?.filter(c => c.status === 'pending').length || 0,
          approvedClaims: claims?.filter(c => c.status === 'approved').length || 0,
          rejectedClaims: claims?.filter(c => c.status === 'rejected').length || 0,
          averageProcessingTime: 0, // Would need more complex calculation
          totalAmount: claims?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
          approvedAmount: claims?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0
        };

        return { success: true, data: stats };
      } catch (fallbackError) {
        return {
          success: false,
          error: fallbackError instanceof Error ? fallbackError.message : 'Failed to get processing stats'
        };
      }
    }
  }

  /**
   * Create notification for claim decision
   */
  private async createClaimNotification(claimId: string, decision: string, approvedBy: string): Promise<void> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('*, users!expense_claims_employee_id_fkey(name)')
        .eq('id', claimId)
        .single();

      if (claimError || !claim) return;

      const message = decision === 'approve' 
        ? `Your expense claim for R${claim.amount} has been approved`
        : `Your expense claim for R${claim.amount} has been rejected`;

      await supabase
        .from('notifications')
        .insert({
          user_id: claim.employee_id,
          type: decision === 'approve' ? 'claim_approved' : 'claim_rejected',
          title: `Claim ${decision === 'approve' ? 'Approved' : 'Rejected'}`,
          message,
          priority: 'medium',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to create claim notification:', error);
    }
  }

  /**
   * Log claim processing action
   */
  private async logClaimAction(claimId: string, action: string, userId: string, comments?: string): Promise<void> {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action_type: `claim_${action}`,
          description: `Claim ${action}ed by manager`,
          metadata: { claimId, comments },
          user_id: userId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log claim action:', error);
    }
  }
}

// Export singleton instance
export const claimsManagementService = new ClaimsManagementService();

// Export utility functions
export const getFilteredClaims = (filters: ClaimFilters) => 
  claimsManagementService.getFilteredClaims(filters);
export const bulkProcessClaims = (approvals: ClaimApprovalData[]) => 
  claimsManagementService.bulkProcessClaims(approvals);
export const getClaimsRequiringAttention = () => 
  claimsManagementService.getClaimsRequiringAttention();
export const getProcessingStats = () => 
  claimsManagementService.getProcessingStats();