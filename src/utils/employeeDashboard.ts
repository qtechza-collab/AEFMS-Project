import { dataService, type ExpenseClaim } from './supabaseDataService';
import { supabase } from './supabase/client';

export interface EmployeeDashboardData {
  recentClaims: ExpenseClaim[];
  totalSubmitted: number;
  totalApproved: number;
  totalPending: number;
  thisMonthTotal: number;
  quickStats: {
    pendingAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    lastSubmission: string | null;
  };
  notifications: EmployeeNotification[];
}

export interface EmployeeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  profilePhoto?: string;
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
  };
}

/**
 * Logan Freights Employee Dashboard Service
 * Personalized dashboard data and employee-specific functionality
 */
class EmployeeDashboardService {
  
  /**
   * Get comprehensive dashboard data for employee
   */
  async getDashboardData(employeeId: string): Promise<{ success: boolean; data?: EmployeeDashboardData; error?: string }> {
    try {
      // Get user's claims
      const claimsResult = await dataService.getUserExpenseClaims(employeeId);
      if (!claimsResult.success) throw new Error(claimsResult.error);

      const claims = claimsResult.data || [];

      // Calculate current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter claims for current month
      const thisMonthClaims = claims.filter(claim => {
        const claimDate = new Date(claim.expense_date);
        return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
      });

      // Calculate quick stats
      const quickStats = {
        pendingAmount: claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
        approvedAmount: claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0),
        rejectedAmount: claims.filter(c => c.status === 'rejected').reduce((sum, c) => sum + c.amount, 0),
        lastSubmission: claims.length > 0 ? claims[0].submitted_at : null
      };

      // Get recent notifications
      const notifications = await this.getEmployeeNotifications(employeeId);

      const dashboardData: EmployeeDashboardData = {
        recentClaims: claims.slice(0, 10), // Most recent 10 claims
        totalSubmitted: claims.length,
        totalApproved: claims.filter(c => c.status === 'approved').length,
        totalPending: claims.filter(c => c.status === 'pending').length,
        thisMonthTotal: thisMonthClaims.reduce((sum, c) => sum + c.amount, 0),
        quickStats,
        notifications
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard data'
      };
    }
  }

  /**
   * Get employee notifications
   */
  private async getEmployeeNotifications(employeeId: string): Promise<EmployeeNotification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: notification.created_at
      }));
    } catch (error) {
      console.warn('Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Get employee profile and preferences
   */
  async getEmployeeProfile(employeeId: string): Promise<{ success: boolean; data?: EmployeeProfile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Employee profile not found');
      }

      const profile: EmployeeProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        department: data.department,
        role: data.role,
        profilePhoto: data.profile_photo,
        preferences: {
          emailNotifications: data.email_notifications ?? true,
          pushNotifications: data.push_notifications ?? true,
          weeklyReports: data.weekly_reports ?? false
        }
      };

      return { success: true, data: profile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employee profile'
      };
    }
  }

  /**
   * Update employee preferences
   */
  async updateEmployeePreferences(
    employeeId: string, 
    preferences: Partial<EmployeeProfile['preferences']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (preferences.emailNotifications !== undefined) {
        updateData.email_notifications = preferences.emailNotifications;
      }
      if (preferences.pushNotifications !== undefined) {
        updateData.push_notifications = preferences.pushNotifications;
      }
      if (preferences.weeklyReports !== undefined) {
        updateData.weekly_reports = preferences.weeklyReports;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', employeeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      };
    }
  }

  /**
   * Get expense categories for employee
   */
  async getExpenseCategories(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('name')
        .eq('active', true)
        .order('name');

      if (error) throw error;

      const categories = (data || []).map(item => item.name);
      
      // Add default categories if none exist
      if (categories.length === 0) {
        return {
          success: true,
          data: ['Travel', 'Meals', 'Accommodation', 'Transport', 'Fuel', 'Office Supplies', 'Communications', 'Other']
        };
      }

      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get expense categories'
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Get employee spending trends
   */
  async getSpendingTrends(employeeId: string, months: number = 6): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, category')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .gte('expense_date', startDate.toISOString())
        .order('expense_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: { [key: string]: { total: number; count: number; categories: { [key: string]: number } } } = {};

      (data || []).forEach(claim => {
        const date = new Date(claim.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, count: 0, categories: {} };
        }

        monthlyData[monthKey].total += claim.amount;
        monthlyData[monthKey].count += 1;
        monthlyData[monthKey].categories[claim.category] = (monthlyData[monthKey].categories[claim.category] || 0) + claim.amount;
      });

      const trends = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count,
        categories: data.categories
      }));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get spending trends'
      };
    }
  }
}

// Export singleton instance
export const employeeDashboardService = new EmployeeDashboardService();

// Export utility functions
export const getDashboardData = (employeeId: string) => 
  employeeDashboardService.getDashboardData(employeeId);
export const getEmployeeProfile = (employeeId: string) => 
  employeeDashboardService.getEmployeeProfile(employeeId);
export const updateEmployeePreferences = (employeeId: string, preferences: Partial<EmployeeProfile['preferences']>) => 
  employeeDashboardService.updateEmployeePreferences(employeeId, preferences);
export const getExpenseCategories = () => 
  employeeDashboardService.getExpenseCategories();
export const markNotificationAsRead = (notificationId: string) => 
  employeeDashboardService.markNotificationAsRead(notificationId);
export const getSpendingTrends = (employeeId: string, months?: number) => 
  employeeDashboardService.getSpendingTrends(employeeId, months);