import { dataService } from './supabaseDataService';
import { supabase } from './supabase/client';

export interface AdminAnalytics {
  totalUsers: number;
  totalClaims: number;
  totalAmount: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  backupFrequency: string;
}

/**
 * Logan Freights Admin Dashboard Service
 * Comprehensive system administration and monitoring
 */
class AdminDashboardService {
  
  /**
   * Get comprehensive admin analytics
   */
  async getAdminAnalytics(): Promise<{ success: boolean; data?: AdminAnalytics; error?: string }> {
    try {
      // Get user count
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) throw usersError;

      // Get claims analytics
      const claimsResult = await dataService.getClaimAnalytics();
      
      // Get recent system activity
      const { data: activities, error: activitiesError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const analytics: AdminAnalytics = {
        totalUsers: users?.length || 0,
        totalClaims: claimsResult.totalClaims || 0,
        totalAmount: claimsResult.totalAmount || 0,
        systemHealth: this.calculateSystemHealth(users?.length || 0, claimsResult.totalClaims || 0),
        recentActivity: (activities || []).map(activity => ({
          id: activity.id,
          type: activity.action_type,
          description: activity.description,
          timestamp: activity.created_at,
          user: activity.user_name || 'System'
        }))
      };

      return { success: true, data: analytics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get admin analytics'
      };
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<{ success: boolean; data?: SystemSettings; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const settings: SystemSettings = {
        maintenanceMode: data?.maintenance_mode || false,
        maxFileSize: data?.max_file_size || 10485760, // 10MB default
        allowedFileTypes: data?.allowed_file_types || ['image/jpeg', 'image/png', 'application/pdf'],
        sessionTimeout: data?.session_timeout || 3600, // 1 hour default
        backupFrequency: data?.backup_frequency || 'daily'
      };

      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system settings'
      };
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 'main',
          maintenance_mode: settings.maintenanceMode,
          max_file_size: settings.maxFileSize,
          allowed_file_types: settings.allowedFileTypes,
          session_timeout: settings.sessionTimeout,
          backup_frequency: settings.backupFrequency,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Log admin action
      await this.logAdminAction('settings_update', 'System settings updated', settings);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update system settings'
      };
    }
  }

  /**
   * Get all users for management
   */
  async getAllUsers(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users'
      };
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log admin action
      await this.logAdminAction('user_role_update', `User role changed to ${newRole}`, { userId, newRole });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user role'
      };
    }
  }

  /**
   * Calculate system health score
   */
  private calculateSystemHealth(userCount: number, claimCount: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = Math.min(100, (userCount * 2) + (claimCount * 0.1));
    
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'critical';
  }

  /**
   * Log admin actions for audit trail
   */
  private async logAdminAction(actionType: string, description: string, metadata?: any): Promise<void> {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action_type: actionType,
          description,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log admin action:', error);
    }
  }
}

// Export singleton instance
export const adminDashboardService = new AdminDashboardService();

// Export utility functions
export const getAdminAnalytics = () => adminDashboardService.getAdminAnalytics();
export const getSystemSettings = () => adminDashboardService.getSystemSettings();
export const updateSystemSettings = (settings: Partial<SystemSettings>) => 
  adminDashboardService.updateSystemSettings(settings);
export const getAllUsers = () => adminDashboardService.getAllUsers();
export const updateUserRole = (userId: string, newRole: string) => 
  adminDashboardService.updateUserRole(userId, newRole);