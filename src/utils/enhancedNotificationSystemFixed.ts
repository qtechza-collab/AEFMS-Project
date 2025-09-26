// Logan Freights Enhanced Notification System - Fixed Version
// Handles real-time notifications, email alerts, and system-wide messaging

import { supabase } from './supabase/client';

export interface NotificationData {
  id?: string;
  userId: string;
  type: 'expense_approved' | 'expense_rejected' | 'expense_pending' | 'system_alert' | 'reminder';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead?: boolean;
  createdAt?: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  template?: 'expense_approval' | 'expense_rejection' | 'system_alert';
  variables?: Record<string, any>;
}

class EnhancedNotificationSystemFixed {
  private initialized = false;
  private subscriptions: Array<() => void> = [];

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up real-time subscriptions for notifications
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications' 
          }, 
          (payload) => {
            this.handleRealtimeNotification(payload);
          }
        )
        .subscribe();

      this.subscriptions.push(() => subscription.unsubscribe());
      this.initialized = true;
      console.log('✅ Enhanced Notification System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
    }
  }

  private handleRealtimeNotification(payload: any): void {
    // Handle real-time notification updates
    console.log('📱 Real-time notification received:', payload);
    
    // Trigger browser notifications if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const data = payload.new || payload.record;
      if (data) {
        new Notification(data.title, {
          body: data.message,
          icon: '/favicon.ico',
          tag: data.id
        });
      }
    }
  }

  /**
   * Create a new notification for a user
   */
  async createNotification(notification: NotificationData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata || {},
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Notification created:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get notifications for a specific user
   */
  async getUserNotifications(userId: string, limit = 50): Promise<{ success: boolean; data?: NotificationData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const notifications: NotificationData[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        message: item.message,
        metadata: item.metadata,
        isRead: item.is_read,
        createdAt: item.created_at
      }));

      return { success: true, data: notifications };
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      console.log('✅ Notification marked as read:', notificationId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      console.log('✅ All notifications marked as read for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send email notification (requires backend service)
   */
  async sendEmailNotification(emailData: EmailNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Call Supabase Edge Function for email sending
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          template: emailData.template,
          variables: emailData.variables
        }
      });

      if (error) throw error;

      console.log('✅ Email notification sent:', emailData.to);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Email service unavailable' };
    }
  }

  /**
   * Create expense approval notification
   */
  async notifyExpenseApproval(employeeId: string, claimId: string, approverName: string): Promise<void> {
    await this.createNotification({
      userId: employeeId,
      type: 'expense_approved',
      title: 'Expense Approved',
      message: `Your expense claim has been approved by ${approverName}.`,
      metadata: { claimId, approverName, action: 'approved' }
    });
  }

  /**
   * Create expense rejection notification
   */
  async notifyExpenseRejection(employeeId: string, claimId: string, approverName: string, reason?: string): Promise<void> {
    await this.createNotification({
      userId: employeeId,
      type: 'expense_rejected',
      title: 'Expense Rejected',
      message: `Your expense claim has been rejected by ${approverName}.${reason ? ` Reason: ${reason}` : ''}`,
      metadata: { claimId, approverName, reason, action: 'rejected' }
    });
  }

  /**
   * Create expense pending notification for managers
   */
  async notifyExpensePending(managerId: string, claimId: string, employeeName: string, amount: number): Promise<void> {
    await this.createNotification({
      userId: managerId,
      type: 'expense_pending',
      title: 'New Expense for Approval',
      message: `${employeeName} has submitted an expense claim of R${amount.toFixed(2)} for approval.`,
      metadata: { claimId, employeeName, amount, action: 'pending_approval' }
    });
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    this.initialized = false;
    console.log('🧹 Enhanced Notification System destroyed');
  }
}

// Export default class
export default EnhancedNotificationSystemFixed;

// Export instance for singleton usage
export const enhancedNotificationSystem = new EnhancedNotificationSystemFixed();