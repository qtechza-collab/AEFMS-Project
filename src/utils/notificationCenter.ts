import { supabase } from './supabase/client';

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
  metadata?: any;
}

export type NotificationType = 
  | 'claim_submitted'
  | 'claim_approved'
  | 'claim_rejected'
  | 'claim_requires_info'
  | 'expense_reminder'
  | 'policy_update'
  | 'budget_alert'
  | 'fraud_alert'
  | 'system_maintenance'
  | 'training_required'
  | 'audit_scheduled';

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]: boolean;
  };
}

export interface BulkNotificationRequest {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  metadata?: any;
}

/**
 * Logan Freights Notification Center Service
 * Comprehensive notification management and delivery system
 */
class NotificationCenterService {
  
  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<{ success: boolean; data?: NotificationData[]; error?: string }> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const notifications: NotificationData[] = (data || []).map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        read: notification.read,
        createdAt: notification.created_at,
        readAt: notification.read_at,
        actionUrl: notification.action_url,
        metadata: notification.metadata
      }));

      return { success: true, data: notifications };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notifications'
      };
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    actionUrl?: string;
    metadata?: any;
  }): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          action_url: notification.actionUrl,
          metadata: notification.metadata,
          read: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send real-time notification if possible
      await this.sendRealTimeNotification(notification.userId, {
        id: data.id,
        ...notification,
        read: false,
        createdAt: new Date().toISOString()
      });

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification'
      };
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(request: BulkNotificationRequest): Promise<{ success: boolean; data?: { count: number }; error?: string }> {
    try {
      const notifications = request.userIds.map(userId => ({
        user_id: userId,
        type: request.type,
        title: request.title,
        message: request.message,
        priority: request.priority,
        action_url: request.actionUrl,
        metadata: request.metadata,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('id');

      if (error) throw error;

      // Send real-time notifications
      for (const userId of request.userIds) {
        await this.sendRealTimeNotification(userId, {
          id: `bulk_${Date.now()}`,
          userId,
          type: request.type,
          title: request.title,
          message: request.message,
          priority: request.priority,
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: request.actionUrl,
          metadata: request.metadata
        });
      }

      return { success: true, data: { count: data?.length || 0 } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bulk notifications'
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
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
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification'
      };
    }
  }

  /**
   * Get notification preferences for user
   */
  async getUserPreferences(userId: string): Promise<{ success: boolean; data?: NotificationPreferences; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Default preferences if none exist
      const defaultPreferences: NotificationPreferences = {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        notificationTypes: {
          claim_submitted: true,
          claim_approved: true,
          claim_rejected: true,
          claim_requires_info: true,
          expense_reminder: true,
          policy_update: true,
          budget_alert: true,
          fraud_alert: true,
          system_maintenance: true,
          training_required: true,
          audit_scheduled: true
        }
      };

      if (!data) {
        return { success: true, data: defaultPreferences };
      }

      const preferences: NotificationPreferences = {
        userId: data.user_id,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        smsNotifications: data.sms_notifications,
        notificationTypes: data.notification_types || defaultPreferences.notificationTypes
      };

      return { success: true, data: preferences };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification preferences'
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateUserPreferences(preferences: NotificationPreferences): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: preferences.userId,
          email_notifications: preferences.emailNotifications,
          push_notifications: preferences.pushNotifications,
          sms_notifications: preferences.smsNotifications,
          notification_types: preferences.notificationTypes,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification preferences'
      };
    }
  }

  /**
   * Get notification statistics for admin
   */
  async getNotificationStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: allNotifications, error: allError } = await supabase
        .from('notifications')
        .select('type, priority, read, created_at');

      if (allError) throw allError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: allNotifications?.length || 0,
        unread: allNotifications?.filter(n => !n.read).length || 0,
        today: allNotifications?.filter(n => new Date(n.created_at) >= todayStart).length || 0,
        thisWeek: allNotifications?.filter(n => new Date(n.created_at) >= weekStart).length || 0,
        byType: {} as Record<string, number>,
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        }
      };

      // Count by type and priority
      (allNotifications || []).forEach(notification => {
        // By type
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
        
        // By priority
        if (notification.priority in stats.byPriority) {
          stats.byPriority[notification.priority as keyof typeof stats.byPriority]++;
        }
      });

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification statistics'
      };
    }
  }

  /**
   * Send real-time notification
   */
  private async sendRealTimeNotification(userId: string, notification: NotificationData): Promise<void> {
    try {
      // In a real implementation, this would use WebSocket or Server-Sent Events
      // For now, we'll use Supabase realtime if available
      const channel = supabase.channel(`notifications_${userId}`);
      
      channel.send({
        type: 'broadcast',
        event: 'new_notification',
        payload: notification
      });
    } catch (error) {
      console.warn('Failed to send real-time notification:', error);
    }
  }

  /**
   * Create system-wide announcement
   */
  async createSystemAnnouncement(announcement: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    targetRoles?: string[];
    targetDepartments?: string[];
    actionUrl?: string;
  }): Promise<{ success: boolean; data?: { count: number }; error?: string }> {
    try {
      // Get target users
      let query = supabase.from('users').select('id, role, department');

      if (announcement.targetRoles?.length) {
        query = query.in('role', announcement.targetRoles);
      }

      if (announcement.targetDepartments?.length) {
        query = query.in('department', announcement.targetDepartments);
      }

      const { data: users, error: usersError } = await query;

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        return { success: true, data: { count: 0 } };
      }

      // Create bulk notification
      const result = await this.createBulkNotifications({
        userIds: users.map(u => u.id),
        type: 'policy_update',
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        actionUrl: announcement.actionUrl
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create system announcement'
      };
    }
  }

  /**
   * Schedule notification for later delivery
   */
  async scheduleNotification(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    scheduledFor: string;
    actionUrl?: string;
    metadata?: any;
  }): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          scheduled_for: notification.scheduledFor,
          action_url: notification.actionUrl,
          metadata: notification.metadata,
          status: 'scheduled',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule notification'
      };
    }
  }
}

// Export singleton instance
export const notificationCenterService = new NotificationCenterService();

// Export utility functions
export const getUserNotifications = (userId: string, unreadOnly?: boolean, limit?: number) =>
  notificationCenterService.getUserNotifications(userId, unreadOnly, limit);
export const createNotification = (notification: any) =>
  notificationCenterService.createNotification(notification);
export const createBulkNotifications = (request: BulkNotificationRequest) =>
  notificationCenterService.createBulkNotifications(request);
export const markAsRead = (notificationId: string) =>
  notificationCenterService.markAsRead(notificationId);
export const markAllAsRead = (userId: string) =>
  notificationCenterService.markAllAsRead(userId);
export const deleteNotification = (notificationId: string) =>
  notificationCenterService.deleteNotification(notificationId);
export const getUserPreferences = (userId: string) =>
  notificationCenterService.getUserPreferences(userId);
export const updateUserPreferences = (preferences: NotificationPreferences) =>
  notificationCenterService.updateUserPreferences(preferences);
export const getNotificationStats = () =>
  notificationCenterService.getNotificationStats();
export const createSystemAnnouncement = (announcement: any) =>
  notificationCenterService.createSystemAnnouncement(announcement);
export const scheduleNotification = (notification: any) =>
  notificationCenterService.scheduleNotification(notification);