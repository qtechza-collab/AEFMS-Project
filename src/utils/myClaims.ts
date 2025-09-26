import { dataService, type ExpenseClaim } from './supabaseDataService';
import { supabase } from './supabase/client';

export interface ClaimSummary {
  totalClaims: number;
  approvedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
}

export interface ClaimFilters {
  status?: string[];
  dateRange?: { start: Date; end: Date };
  category?: string[];
  amountRange?: { min: number; max: number };
}

export interface ClaimGrouping {
  period: string;
  claims: ExpenseClaim[];
  totalAmount: number;
  claimCount: number;
}

/**
 * Logan Freights My Claims Service
 * Employee's personal expense claim management
 */
class MyClaimsService {
  
  /**
   * Get user's expense claims with filtering
   */
  async getUserClaims(
    userId: string, 
    filters?: ClaimFilters
  ): Promise<{ success: boolean; data?: ExpenseClaim[]; error?: string }> {
    try {
      let query = supabase
        .from('expense_claims')
        .select('*')
        .eq('employee_id', userId)
        .order('submitted_at', { ascending: false });

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters?.dateRange) {
        query = query
          .gte('expense_date', filters.dateRange.start.toISOString())
          .lte('expense_date', filters.dateRange.end.toISOString());
      }

      if (filters?.category?.length) {
        query = query.in('category', filters.category);
      }

      if (filters?.amountRange) {
        query = query
          .gte('amount', filters.amountRange.min)
          .lte('amount', filters.amountRange.max);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user claims'
      };
    }
  }

  /**
   * Get claim summary statistics
   */
  async getClaimSummary(userId: string): Promise<{ success: boolean; data?: ClaimSummary; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('status, amount')
        .eq('employee_id', userId);

      if (error) throw error;

      const summary: ClaimSummary = {
        totalClaims: claims?.length || 0,
        approvedClaims: claims?.filter(c => c.status === 'approved').length || 0,
        pendingClaims: claims?.filter(c => c.status === 'pending').length || 0,
        rejectedClaims: claims?.filter(c => c.status === 'rejected').length || 0,
        totalAmount: claims?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
        approvedAmount: claims?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
        pendingAmount: claims?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0) || 0
      };

      return { success: true, data: summary };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claim summary'
      };
    }
  }

  /**
   * Get claims grouped by time period
   */
  async getClaimsGroupedByPeriod(
    userId: string, 
    groupBy: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<{ success: boolean; data?: ClaimGrouping[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('employee_id', userId)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const groupings = new Map<string, ExpenseClaim[]>();

      (claims || []).forEach(claim => {
        const date = new Date(claim.expense_date);
        let periodKey = '';

        switch (groupBy) {
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'quarter':
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodKey = `${date.getFullYear()}-Q${quarter}`;
            break;
          case 'year':
            periodKey = date.getFullYear().toString();
            break;
        }

        if (!groupings.has(periodKey)) {
          groupings.set(periodKey, []);
        }
        groupings.get(periodKey)!.push(claim);
      });

      const result: ClaimGrouping[] = Array.from(groupings.entries()).map(([period, claims]) => ({
        period,
        claims,
        totalAmount: claims.reduce((sum, c) => sum + (c.amount || 0), 0),
        claimCount: claims.length
      }));

      // Sort by period descending
      result.sort((a, b) => b.period.localeCompare(a.period));

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to group claims by period'
      };
    }
  }

  /**
   * Submit new expense claim
   */
  async submitClaim(claimData: {
    employeeId: string;
    amount: number;
    currency: string;
    category: string;
    description: string;
    expenseDate: string;
    receipts?: File[];
  }): Promise<{ success: boolean; data?: { claimId: string }; error?: string }> {
    try {
      // Create the claim
      const result = await dataService.createClaim({
        employee_id: claimData.employeeId,
        amount: claimData.amount,
        currency: claimData.currency,
        category: claimData.category,
        description: claimData.description,
        expense_date: claimData.expenseDate,
        status: 'pending',
        submitted_at: new Date().toISOString()
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create claim');
      }

      const claimId = result.data.id;

      // Upload receipts if provided
      if (claimData.receipts && claimData.receipts.length > 0) {
        // Import the receipt capture service
        const { processBulkReceipts } = await import('./receiptCapture');
        
        const receiptResult = await processBulkReceipts(
          claimData.receipts, 
          claimData.employeeId, 
          claimId
        );

        if (!receiptResult.success) {
          console.warn('Receipt upload failed:', receiptResult.error);
        }
      }

      // Send notification to managers
      await this.notifyManagers(claimId, claimData);

      return { success: true, data: { claimId } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit claim'
      };
    }
  }

  /**
   * Update existing claim
   */
  async updateClaim(
    claimId: string, 
    userId: string, 
    updates: Partial<ExpenseClaim>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify claim ownership
      const { data: existingClaim, error: claimError } = await supabase
        .from('expense_claims')
        .select('employee_id, status')
        .eq('id', claimId)
        .single();

      if (claimError || !existingClaim) {
        throw new Error('Claim not found');
      }

      if (existingClaim.employee_id !== userId) {
        throw new Error('Not authorized to update this claim');
      }

      // Don't allow updates to approved/rejected claims
      if (['approved', 'rejected'].includes(existingClaim.status)) {
        throw new Error('Cannot update approved or rejected claims');
      }

      // Update the claim
      const { error } = await supabase
        .from('expense_claims')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update claim'
      };
    }
  }

  /**
   * Delete claim (only if pending)
   */
  async deleteClaim(claimId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify claim ownership and status
      const { data: existingClaim, error: claimError } = await supabase
        .from('expense_claims')
        .select('employee_id, status')
        .eq('id', claimId)
        .single();

      if (claimError || !existingClaim) {
        throw new Error('Claim not found');
      }

      if (existingClaim.employee_id !== userId) {
        throw new Error('Not authorized to delete this claim');
      }

      if (existingClaim.status !== 'pending') {
        throw new Error('Can only delete pending claims');
      }

      // Delete associated receipts first
      await supabase
        .from('receipt_images')
        .delete()
        .eq('claim_id', claimId);

      // Delete the claim
      const { error } = await supabase
        .from('expense_claims')
        .delete()
        .eq('id', claimId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete claim'
      };
    }
  }

  /**
   * Get claim details with receipts
   */
  async getClaimDetails(claimId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('id', claimId)
        .eq('employee_id', userId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found or access denied');
      }

      // Get receipts
      const { data: receipts, error: receiptsError } = await supabase
        .from('receipt_images')
        .select('*')
        .eq('claim_id', claimId);

      if (receiptsError) throw receiptsError;

      // Get approval history
      const { data: history, error: historyError } = await supabase
        .from('approval_history')
        .select(`
          *,
          users!approval_history_approver_id_fkey(name, role)
        `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      const claimDetails = {
        ...claim,
        receipts: receipts || [],
        approvalHistory: (history || []).map(h => ({
          action: h.action,
          comments: h.comments,
          approver: h.users?.name || 'Unknown',
          approverRole: h.users?.role || 'Unknown',
          createdAt: h.created_at
        }))
      };

      return { success: true, data: claimDetails };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get claim details'
      };
    }
  }

  /**
   * Get spending trends for user
   */
  async getSpendingTrends(userId: string, months: number = 6): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, category, status')
        .eq('employee_id', userId)
        .gte('expense_date', startDate.toISOString())
        .order('expense_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, { 
        total: number; 
        count: number; 
        approved: number; 
        categories: Map<string, number> 
      }>();

      (claims || []).forEach(claim => {
        const date = new Date(claim.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { 
            total: 0, 
            count: 0, 
            approved: 0, 
            categories: new Map() 
          });
        }

        const data = monthlyData.get(monthKey)!;
        data.total += claim.amount || 0;
        data.count += 1;
        
        if (claim.status === 'approved') {
          data.approved += claim.amount || 0;
        }

        const category = claim.category;
        data.categories.set(category, (data.categories.get(category) || 0) + (claim.amount || 0));
      });

      const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        totalAmount: data.total,
        approvedAmount: data.approved,
        claimCount: data.count,
        averageAmount: data.count > 0 ? data.total / data.count : 0,
        topCategories: Array.from(data.categories.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([category, amount]) => ({ category, amount }))
      }));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get spending trends'
      };
    }
  }

  /**
   * Notify managers about new claim
   */
  private async notifyManagers(claimId: string, claimData: any): Promise<void> {
    try {
      // Get user's department
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('department')
        .eq('id', claimData.employeeId)
        .single();

      if (userError || !user) return;

      // Get managers in the same department
      const { data: managers, error: managersError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'manager')
        .eq('department', user.department);

      if (managersError || !managers) return;

      // Create notifications for managers
      const notifications = managers.map(manager => ({
        user_id: manager.id,
        type: 'claim_submitted',
        title: 'New Expense Claim',
        message: `New expense claim for R${claimData.amount} requires approval`,
        priority: 'medium',
        action_url: `/claims/${claimId}`,
        created_at: new Date().toISOString()
      }));

      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications);
      }
    } catch (error) {
      console.warn('Failed to notify managers:', error);
    }
  }
}

// Export singleton instance
export const myClaimsService = new MyClaimsService();

// Export utility functions
export const getUserClaims = (userId: string, filters?: ClaimFilters) =>
  myClaimsService.getUserClaims(userId, filters);
export const getClaimSummary = (userId: string) =>
  myClaimsService.getClaimSummary(userId);
export const getClaimsGroupedByPeriod = (userId: string, groupBy?: 'month' | 'quarter' | 'year') =>
  myClaimsService.getClaimsGroupedByPeriod(userId, groupBy);
export const submitClaim = (claimData: any) =>
  myClaimsService.submitClaim(claimData);
export const updateClaim = (claimId: string, userId: string, updates: Partial<ExpenseClaim>) =>
  myClaimsService.updateClaim(claimId, userId, updates);
export const deleteClaim = (claimId: string, userId: string) =>
  myClaimsService.deleteClaim(claimId, userId);
export const getClaimDetails = (claimId: string, userId: string) =>
  myClaimsService.getClaimDetails(claimId, userId);
export const getSpendingTrends = (userId: string, months?: number) =>
  myClaimsService.getSpendingTrends(userId, months);