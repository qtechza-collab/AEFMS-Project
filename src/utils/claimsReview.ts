import { supabase } from './supabase/client';
import { dataService, type ExpenseClaim } from './supabaseDataService';

export interface ReviewCriteria {
  requiresReview: boolean;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAction: 'approve' | 'reject' | 'investigate';
}

export interface ClaimReviewData {
  claim: ExpenseClaim;
  criteria: ReviewCriteria;
  reviewHistory: ReviewHistoryItem[];
  attachments: AttachmentInfo[];
}

export interface ReviewHistoryItem {
  id: string;
  action: string;
  reviewer: string;
  timestamp: string;
  comments?: string;
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

/**
 * Logan Freights Claims Review Service
 * Advanced claim analysis and review workflow
 */
class ClaimsReviewService {
  
  /**
   * Get claim for detailed review
   */
  async getClaimForReview(claimId: string): Promise<{ success: boolean; data?: ClaimReviewData; error?: string }> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, email, department, role)
        `)
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      // Analyze claim against review criteria
      const criteria = await this.analyzeClaim(claim);

      // Get review history
      const reviewHistory = await this.getReviewHistory(claimId);

      // Get attachments
      const attachments = await this.getClaimAttachments(claimId);

      const reviewData: ClaimReviewData = {
        claim,
        criteria,
        reviewHistory,
        attachments
      };

      return { success: true, data: reviewData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claim for review'
      };
    }
  }

  /**
   * Analyze claim against business rules and criteria
   */
  private async analyzeClaim(claim: ExpenseClaim): Promise<ReviewCriteria> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let suggestedAction: 'approve' | 'reject' | 'investigate' = 'approve';

    // High amount check
    if (claim.amount > 5000) {
      reasons.push('High-value claim (>R5,000)');
      riskLevel = 'medium';
    }

    // Very high amount check
    if (claim.amount > 15000) {
      reasons.push('Very high-value claim (>R15,000)');
      riskLevel = 'high';
      suggestedAction = 'investigate';
    }

    // Weekend/holiday submission check
    const submissionDate = new Date(claim.submitted_at);
    if (submissionDate.getDay() === 0 || submissionDate.getDay() === 6) {
      reasons.push('Submitted on weekend');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Frequent submitter check
    const frequentSubmitter = await this.checkFrequentSubmitter(claim.employee_id);
    if (frequentSubmitter) {
      reasons.push('Frequent claim submitter');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Category analysis
    const suspiciousCategories = ['Entertainment', 'Miscellaneous', 'Other'];
    if (suspiciousCategories.includes(claim.category)) {
      reasons.push('Requires category verification');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Round number check (potential red flag)
    if (claim.amount % 100 === 0 && claim.amount > 500) {
      reasons.push('Round number amount (verify authenticity)');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Missing receipt check
    const hasAttachments = await this.checkAttachments(claim.id);
    if (!hasAttachments) {
      reasons.push('No receipt attached');
      riskLevel = 'high';
      suggestedAction = 'reject';
    }

    // Description analysis
    if (!claim.description || claim.description.length < 10) {
      reasons.push('Insufficient description');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    const requiresReview = reasons.length > 0 || riskLevel !== 'low';

    return {
      requiresReview,
      reasons,
      riskLevel,
      suggestedAction
    };
  }

  /**
   * Check if employee is a frequent submitter
   */
  private async checkFrequentSubmitter(employeeId: string): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('expense_claims')
        .select('id')
        .eq('employee_id', employeeId)
        .gte('submitted_at', thirtyDaysAgo.toISOString());

      if (error) return false;

      return (data?.length || 0) > 10; // More than 10 claims in 30 days
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if claim has attachments
   */
  private async checkAttachments(claimId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('receipt_images')
        .select('id')
        .eq('claim_id', claimId)
        .limit(1);

      return !error && (data?.length || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get review history for claim
   */
  private async getReviewHistory(claimId: string): Promise<ReviewHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('claim_reviews')
        .select(`
          *,
          users!claim_reviews_reviewer_id_fkey(name)
        `)
        .eq('claim_id', claimId)
        .order('reviewed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        action: item.action,
        reviewer: item.users?.name || 'Unknown',
        timestamp: item.reviewed_at,
        comments: item.comments
      }));
    } catch (error) {
      console.warn('Failed to get review history:', error);
      return [];
    }
  }

  /**
   * Get claim attachments
   */
  private async getClaimAttachments(claimId: string): Promise<AttachmentInfo[]> {
    try {
      const { data, error } = await supabase
        .from('receipt_images')
        .select('*')
        .eq('claim_id', claimId);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        filename: item.file_name,
        url: item.file_url,
        type: item.file_type,
        size: item.file_size
      }));
    } catch (error) {
      console.warn('Failed to get attachments:', error);
      return [];
    }
  }

  /**
   * Submit claim review decision
   */
  async submitReviewDecision(
    claimId: string,
    decision: 'approve' | 'reject' | 'request_info',
    reviewerId: string,
    comments?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update claim status
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (decision === 'approve') {
        updateData.status = 'approved';
        updateData.approved_by = reviewerId;
        updateData.approved_at = new Date().toISOString();
      } else if (decision === 'reject') {
        updateData.status = 'rejected';
        updateData.approved_by = reviewerId;
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.status = 'info_requested';
      }

      if (comments) {
        updateData.approval_comments = comments;
      }

      const { error: updateError } = await supabase
        .from('expense_claims')
        .update(updateData)
        .eq('id', claimId);

      if (updateError) throw updateError;

      // Record review in history
      await supabase
        .from('claim_reviews')
        .insert({
          claim_id: claimId,
          reviewer_id: reviewerId,
          action: decision,
          comments,
          reviewed_at: new Date().toISOString()
        });

      // Create notification for employee
      await this.createReviewNotification(claimId, decision, reviewerId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit review decision'
      };
    }
  }

  /**
   * Get claims pending review
   */
  async getClaimsPendingReview(): Promise<{ success: boolean; data?: ExpenseClaim[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, department)
        `)
        .in('status', ['pending', 'under_review'])
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claims pending review'
      };
    }
  }

  /**
   * Create notification for review decision
   */
  private async createReviewNotification(claimId: string, decision: string, reviewerId: string): Promise<void> {
    try {
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('employee_id, amount, description')
        .eq('id', claimId)
        .single();

      if (claimError || !claim) return;

      let title = '';
      let message = '';

      switch (decision) {
        case 'approve':
          title = 'Claim Approved';
          message = `Your expense claim for R${claim.amount} has been approved`;
          break;
        case 'reject':
          title = 'Claim Rejected';
          message = `Your expense claim for R${claim.amount} has been rejected`;
          break;
        case 'request_info':
          title = 'Additional Information Required';
          message = `Please provide additional information for your claim of R${claim.amount}`;
          break;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: claim.employee_id,
          type: `claim_${decision}`,
          title,
          message,
          priority: 'medium',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to create review notification:', error);
    }
  }
}

// Export singleton instance
export const claimsReviewService = new ClaimsReviewService();

// Export utility functions
export const getClaimForReview = (claimId: string) => 
  claimsReviewService.getClaimForReview(claimId);
export const submitReviewDecision = (claimId: string, decision: 'approve' | 'reject' | 'request_info', reviewerId: string, comments?: string) => 
  claimsReviewService.submitReviewDecision(claimId, decision, reviewerId, comments);
export const getClaimsPendingReview = () => 
  claimsReviewService.getClaimsPendingReview();