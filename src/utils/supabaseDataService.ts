import { supabase } from './supabase/client';

export interface ExpenseClaim {
  id: string;
  employee_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  vendor: string;
  payment_method: string;
  expense_date: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  receipt_files?: any[];
  tax_amount?: number;
  notes?: string;
  manager_id?: string;
  manager_comments?: string;
  approved_at?: string;
  rejected_at?: string;
  fraud_score?: number;
  fraud_flags?: string[];
  is_flagged?: boolean;
  employee?: any;
  manager?: any;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  related_claim_id?: string;
  amount?: number;
  created_at: string;
}

class SupabaseDataService {
  // Claims management
  async getClaims(filters?: { status?: string; employee_id?: string }): Promise<ExpenseClaim[]> {
    try {
      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          employee:users!employee_id(*),
          manager:users!manager_id(*)
        `)
        .order('submitted_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching claims:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getClaims:', error);
      return [];
    }
  }

  async createClaim(claim: Partial<ExpenseClaim>): Promise<{ success: boolean; claim?: ExpenseClaim; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .insert(claim)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, claim: data };
    } catch (error) {
      return { success: false, error: 'Failed to create claim' };
    }
  }

  async updateClaim(id: string, updates: Partial<ExpenseClaim>): Promise<{ success: boolean; claim?: ExpenseClaim; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, claim: data };
    } catch (error) {
      return { success: false, error: 'Failed to update claim' };
    }
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  // File upload
  async uploadReceipt(file: File, claimId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${claimId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: publicUrl } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl.publicUrl };
    } catch (error) {
      return { success: false, error: 'Failed to upload receipt' };
    }
  }

  async markNotificationAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to mark notification as read' };
    }
  }

  async getUserExpenseClaims(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_claims')
        .select(`
          *,
          employee:users!employee_id(*),
          manager:users!manager_id(*)
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user expense claims:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error in getUserExpenseClaims:', error);
      return { success: false, error: 'Failed to fetch user expense claims' };
    }
  }

  async uploadFile(file: File, path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('logan-receipts')
        .upload(fileName, file);

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: publicUrl } = supabase.storage
        .from('logan-receipts')
        .getPublicUrl(fileName);

      return { success: true, url: publicUrl.publicUrl };
    } catch (error) {
      return { success: false, error: 'Failed to upload file' };
    }
  }



  async getClaimAnalytics(): Promise<any> {
    try {
      // Basic analytics implementation
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, status, category, expense_date');

      if (error) throw error;

      const analytics = {
        totalClaims: claims?.length || 0,
        totalAmount: claims?.reduce((sum, claim) => sum + claim.amount, 0) || 0,
        pendingClaims: claims?.filter(c => c.status === 'pending').length || 0,
        approvedClaims: claims?.filter(c => c.status === 'approved').length || 0,
        rejectedClaims: claims?.filter(c => c.status === 'rejected').length || 0
      };

      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: 'Failed to get analytics' };
    }
  }
}

export const dataService = new SupabaseDataService();
export default dataService;