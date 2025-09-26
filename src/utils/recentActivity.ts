import { supabase } from './supabase/client';

export interface ActivityItem {
  id: string;
  type: 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'receipt_uploaded' | 'user_registered';
  title: string;
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  metadata?: any;
}

/**
 * Logan Freights Recent Activity Service
 */
class RecentActivityService {
  
  async getRecentActivity(limit: number = 10): Promise<{ success: boolean; activities?: ActivityItem[]; error?: string }> {
    try {
      // Get recent audit log entries
      const { data: auditLogs, error } = await supabase
        .from('audit_log')
        .select(`
          id,
          action_type,
          description,
          created_at,
          user_id,
          metadata,
          users!audit_log_user_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const activities: ActivityItem[] = (auditLogs || []).map(log => ({
        id: log.id,
        type: this.mapActionTypeToActivityType(log.action_type),
        title: this.generateActivityTitle(log.action_type),
        description: log.description || 'Activity performed',
        timestamp: log.created_at,
        userId: log.user_id,
        userName: log.users?.name || 'Unknown User',
        metadata: log.metadata
      }));

      return { success: true, activities };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recent activity'
      };
    }
  }

  async getUserActivity(userId: string, limit: number = 10): Promise<{ success: boolean; activities?: ActivityItem[]; error?: string }> {
    try {
      const { data: auditLogs, error } = await supabase
        .from('audit_log')
        .select(`
          id,
          action_type,
          description,
          created_at,
          user_id,
          metadata,
          users!audit_log_user_id_fkey(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const activities: ActivityItem[] = (auditLogs || []).map(log => ({
        id: log.id,
        type: this.mapActionTypeToActivityType(log.action_type),
        title: this.generateActivityTitle(log.action_type),
        description: log.description || 'Activity performed',
        timestamp: log.created_at,
        userId: log.user_id,
        userName: log.users?.name || 'Unknown User',
        metadata: log.metadata
      }));

      return { success: true, activities };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user activity'
      };
    }
  }

  private mapActionTypeToActivityType(actionType: string): ActivityItem['type'] {
    switch (actionType) {
      case 'claim_submit':
      case 'claim_create':
        return 'claim_submitted';
      case 'claim_approve':
        return 'claim_approved';
      case 'claim_reject':
        return 'claim_rejected';
      case 'receipt_upload':
        return 'receipt_uploaded';
      case 'user_create':
        return 'user_registered';
      default:
        return 'claim_submitted';
    }
  }

  private generateActivityTitle(actionType: string): string {
    switch (actionType) {
      case 'claim_submit':
      case 'claim_create':
        return 'Expense Claim Submitted';
      case 'claim_approve':
        return 'Claim Approved';
      case 'claim_reject':
        return 'Claim Rejected';
      case 'receipt_upload':
        return 'Receipt Uploaded';
      case 'user_create':
        return 'User Registered';
      default:
        return 'Activity';
    }
  }

  async logActivity(
    actionType: string,
    description: string,
    userId: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('audit_log')
        .insert({
          action_type: actionType,
          description,
          user_id: userId,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log activity'
      };
    }
  }
}

export const recentActivityService = new RecentActivityService();