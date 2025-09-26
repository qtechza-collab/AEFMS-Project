import { expenseApprovalsService } from './expenseApprovals';

export interface QuickApprovalAction {
  claimId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Logan Freights Quick Approval Buttons Service
 */
class QuickApprovalButtonsService {
  
  async performQuickApproval(
    claimId: string, 
    action: 'approve' | 'reject', 
    approverId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await expenseApprovalsService.processApprovalDecision({
        claimId,
        decision: action,
        approverId,
        comments: reason
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Quick approval failed'
      };
    }
  }

  async bulkQuickApproval(
    actions: QuickApprovalAction[],
    approverId: string
  ): Promise<{ success: boolean; results?: any[]; error?: string }> {
    try {
      const results = [];

      for (const action of actions) {
        const result = await this.performQuickApproval(
          action.claimId,
          action.action,
          approverId,
          action.reason
        );
        results.push({ claimId: action.claimId, ...result });
      }

      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount === results.length,
        results,
        error: successCount < results.length ? 'Some approvals failed' : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk approval failed'
      };
    }
  }
}

export const quickApprovalButtonsService = new QuickApprovalButtonsService();