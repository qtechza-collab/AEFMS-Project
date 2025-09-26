import { supabase } from './supabase/client';
import { dataService, type ExpenseClaim } from './supabaseDataService';

export interface ClaimViewData {
  claim: ExpenseClaim;
  receipts: ReceiptInfo[];
  approvalHistory: ApprovalHistoryItem[];
  relatedClaims: ExpenseClaim[];
  employee: EmployeeInfo;
}

export interface ReceiptInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  extractedData?: any;
}

export interface ApprovalHistoryItem {
  id: string;
  action: string;
  approver: string;
  approverRole: string;
  comments?: string;
  timestamp: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  profilePhoto?: string;
}

/**
 * Logan Freights Claims Viewer Service
 * Detailed claim viewing with related data and history
 */
class ClaimsViewerService {
  
  /**
   * Get comprehensive claim view data
   */
  async getClaimViewData(claimId: string): Promise<{ success: boolean; data?: ClaimViewData; error?: string }> {
    try {
      // Get main claim data
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(id, name, email, department, role, profile_photo)
        `)
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      // Get receipts
      const receipts = await this.getClaimReceipts(claimId);
      
      // Get approval history
      const approvalHistory = await this.getApprovalHistory(claimId);
      
      // Get related claims (same employee, similar category/amount)
      const relatedClaims = await this.getRelatedClaims(claim);

      const viewData: ClaimViewData = {
        claim,
        receipts,
        approvalHistory,
        relatedClaims,
        employee: {
          id: claim.users.id,
          name: claim.users.name,
          email: claim.users.email,
          department: claim.users.department,
          role: claim.users.role,
          profilePhoto: claim.users.profile_photo
        }
      };

      return { success: true, data: viewData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claim view data'
      };
    }
  }

  /**
   * Get claim receipts
   */
  private async getClaimReceipts(claimId: string): Promise<ReceiptInfo[]> {
    try {
      const { data, error } = await supabase
        .from('receipt_images')
        .select('*')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(receipt => ({
        id: receipt.id,
        fileName: receipt.file_name,
        fileUrl: receipt.file_url,
        fileSize: receipt.file_size,
        uploadedAt: receipt.uploaded_at,
        extractedData: receipt.extracted_data
      }));
    } catch (error) {
      console.warn('Failed to get claim receipts:', error);
      return [];
    }
  }

  /**
   * Get approval history
   */
  private async getApprovalHistory(claimId: string): Promise<ApprovalHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select(`
          id,
          action,
          comments,
          created_at,
          users!approval_history_approver_id_fkey(name, role)
        `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        action: item.action,
        approver: item.users?.name || 'Unknown',
        approverRole: item.users?.role || 'Unknown',
        comments: item.comments,
        timestamp: item.created_at
      }));
    } catch (error) {
      console.warn('Failed to get approval history:', error);
      return [];
    }
  }

  /**
   * Get related claims
   */
  private async getRelatedClaims(claim: ExpenseClaim): Promise<ExpenseClaim[]> {
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('employee_id', claim.employee_id)
        .neq('id', claim.id)
        .or(`category.eq.${claim.category},amount.gte.${claim.amount * 0.8}.and.amount.lte.${claim.amount * 1.2}`)
        .order('expense_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.warn('Failed to get related claims:', error);
      return [];
    }
  }

  /**
   * Get claim timeline
   */
  async getClaimTimeline(claimId: string): Promise<{ success: boolean; timeline?: any[]; error?: string }> {
    try {
      const timeline = [];

      // Get claim creation
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('submitted_at, employee_id, users!expense_claims_employee_id_fkey(name)')
        .eq('id', claimId)
        .single();

      if (claimError) throw claimError;

      timeline.push({
        id: 'created',
        type: 'created',
        title: 'Claim Submitted',
        description: `Submitted by ${claim.users.name}`,
        timestamp: claim.submitted_at,
        user: claim.users.name,
        icon: 'plus'
      });

      // Get receipts uploaded
      const { data: receipts } = await supabase
        .from('receipt_images')
        .select('uploaded_at, file_name')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: true });

      (receipts || []).forEach(receipt => {
        timeline.push({
          id: `receipt_${receipt.file_name}`,
          type: 'receipt',
          title: 'Receipt Uploaded',
          description: `Uploaded ${receipt.file_name}`,
          timestamp: receipt.uploaded_at,
          icon: 'paperclip'
        });
      });

      // Get approval history
      const { data: approvals } = await supabase
        .from('approval_history')
        .select(`
          id, action, comments, created_at,
          users!approval_history_approver_id_fkey(name)
        `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      (approvals || []).forEach(approval => {
        let title = '';
        let icon = '';
        
        switch (approval.action) {
          case 'approve':
            title = 'Claim Approved';
            icon = 'check';
            break;
          case 'reject':
            title = 'Claim Rejected';
            icon = 'x';
            break;
          case 'request_info':
            title = 'Information Requested';
            icon = 'help';
            break;
          default:
            title = 'Action Taken';
            icon = 'activity';
        }

        timeline.push({
          id: approval.id,
          type: 'approval',
          title,
          description: approval.comments || `Action by ${approval.users?.name}`,
          timestamp: approval.created_at,
          user: approval.users?.name,
          icon
        });
      });

      // Sort timeline by timestamp
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return { success: true, timeline };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claim timeline'
      };
    }
  }

  /**
   * Get similar claims analysis
   */
  async getSimilarClaimsAnalysis(claimId: string): Promise<{ success: boolean; analysis?: any; error?: string }> {
    try {
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      // Find similar claims by amount range
      const amountRange = {
        min: claim.amount * 0.8,
        max: claim.amount * 1.2
      };

      const { data: similarByAmount, error: amountError } = await supabase
        .from('expense_claims')
        .select('id, amount, category, status')
        .gte('amount', amountRange.min)
        .lte('amount', amountRange.max)
        .neq('id', claimId)
        .limit(10);

      // Find similar claims by category
      const { data: similarByCategory, error: categoryError } = await supabase
        .from('expense_claims')
        .select('id, amount, category, status')
        .eq('category', claim.category)
        .neq('id', claimId)
        .limit(10);

      // Find claims from same employee
      const { data: employeeClaims, error: employeeError } = await supabase
        .from('expense_claims')
        .select('id, amount, category, status, expense_date')
        .eq('employee_id', claim.employee_id)
        .neq('id', claimId)
        .order('expense_date', { ascending: false })
        .limit(5);

      const analysis = {
        similarByAmount: similarByAmount || [],
        similarByCategory: similarByCategory || [],
        employeeClaims: employeeClaims || [],
        patterns: {
          averageAmountForCategory: 0,
          approvalRateForCategory: 0,
          employeeApprovalRate: 0
        }
      };

      // Calculate patterns
      if (similarByCategory && similarByCategory.length > 0) {
        analysis.patterns.averageAmountForCategory = 
          similarByCategory.reduce((sum, c) => sum + (c.amount || 0), 0) / similarByCategory.length;
        
        analysis.patterns.approvalRateForCategory = 
          (similarByCategory.filter(c => c.status === 'approved').length / similarByCategory.length) * 100;
      }

      if (employeeClaims && employeeClaims.length > 0) {
        analysis.patterns.employeeApprovalRate = 
          (employeeClaims.filter(c => c.status === 'approved').length / employeeClaims.length) * 100;
      }

      return { success: true, analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get similar claims analysis'
      };
    }
  }

  /**
   * Get claim insights
   */
  async getClaimInsights(claimId: string): Promise<{ success: boolean; insights?: string[]; error?: string }> {
    try {
      const analysisResult = await this.getSimilarClaimsAnalysis(claimId);
      
      if (!analysisResult.success || !analysisResult.analysis) {
        return { success: true, insights: [] };
      }

      const analysis = analysisResult.analysis;
      const insights: string[] = [];

      // Amount insights
      if (analysis.patterns.averageAmountForCategory > 0) {
        const { data: claim } = await supabase
          .from('expense_claims')
          .select('amount, category')
          .eq('id', claimId)
          .single();

        if (claim) {
          const percentageDiff = ((claim.amount - analysis.patterns.averageAmountForCategory) / analysis.patterns.averageAmountForCategory) * 100;
          
          if (percentageDiff > 50) {
            insights.push(`This claim is ${Math.round(percentageDiff)}% higher than average for ${claim.category} category`);
          } else if (percentageDiff < -50) {
            insights.push(`This claim is ${Math.round(Math.abs(percentageDiff))}% lower than average for ${claim.category} category`);
          }
        }
      }

      // Approval rate insights
      if (analysis.patterns.approvalRateForCategory < 70) {
        insights.push(`Claims in this category have a ${Math.round(analysis.patterns.approvalRateForCategory)}% approval rate`);
      }

      if (analysis.patterns.employeeApprovalRate > 90) {
        insights.push('This employee has a high approval rate (>90%)');
      } else if (analysis.patterns.employeeApprovalRate < 60) {
        insights.push('This employee has a low approval rate (<60%)');
      }

      // Pattern insights
      if (analysis.employeeClaims.length > 5) {
        const recentClaims = analysis.employeeClaims.slice(0, 3);
        const sameCategory = recentClaims.filter(c => c.category === claim?.category).length;
        
        if (sameCategory >= 2) {
          insights.push('Employee has submitted multiple claims in this category recently');
        }
      }

      return { success: true, insights };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate insights'
      };
    }
  }

  /**
   * Mark claim as viewed
   */
  async markClaimAsViewed(claimId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('claim_views')
        .upsert({
          claim_id: claimId,
          user_id: userId,
          viewed_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark claim as viewed'
      };
    }
  }

  /**
   * Get claim view statistics
   */
  async getClaimViewStats(claimId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('claim_views')
        .select(`
          viewed_at,
          users!claim_views_user_id_fkey(name, role)
        `)
        .eq('claim_id', claimId)
        .order('viewed_at', { ascending: false });

      if (error) throw error;

      const stats = {
        totalViews: data?.length || 0,
        uniqueViewers: new Set((data || []).map(v => v.users?.name)).size,
        lastViewed: data?.[0]?.viewed_at,
        viewersByRole: {}
      };

      // Group viewers by role
      (data || []).forEach(view => {
        const role = view.users?.role || 'unknown';
        stats.viewersByRole[role] = (stats.viewersByRole[role] || 0) + 1;
      });

      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get view statistics'
      };
    }
  }
}

// Export singleton instance
export const claimsViewerService = new ClaimsViewerService();

// Export utility functions
export const getClaimViewData = (claimId: string) => claimsViewerService.getClaimViewData(claimId);
export const getClaimTimeline = (claimId: string) => claimsViewerService.getClaimTimeline(claimId);
export const getSimilarClaimsAnalysis = (claimId: string) => claimsViewerService.getSimilarClaimsAnalysis(claimId);
export const getClaimInsights = (claimId: string) => claimsViewerService.getClaimInsights(claimId);
export const markClaimAsViewed = (claimId: string, userId: string) => claimsViewerService.markClaimAsViewed(claimId, userId);
export const getClaimViewStats = (claimId: string) => claimsViewerService.getClaimViewStats(claimId);