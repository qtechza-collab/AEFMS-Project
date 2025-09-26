/**
 * Enterprise Notification Hub
 * Centralized notification management for Logan Freights
 */

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'expense' | 'approval' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'expense' | 'approval' | 'system' | 'user' | 'compliance' | 'financial';
  timestamp: string;
  read: boolean;
  userId?: string;
  department?: string;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  action: string;
  url?: string;
}

export interface NotificationSettings {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  categories: {
    expense: boolean;
    approval: boolean;
    system: boolean;
    compliance: boolean;
    financial: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  todayCount: number;
  weekCount: number;
}

/**
 * Enterprise Notification Hub Service
 */
class EnterpriseNotificationHubService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private settings: NotificationSettings = {
    enablePushNotifications: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    categories: {
      expense: true,
      approval: true,
      system: true,
      compliance: true,
      financial: true
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      critical: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };

  /**
   * Initialize notification hub
   */
  initialize(): void {
    console.log('🔔 Initializing Enterprise Notification Hub...');
    this.loadNotifications();
    this.startCleanupInterval();
  }

  /**
   * Load notifications from storage
   */
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('logan-notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
    }
  }

  /**
   * Save notifications to storage
   */
  private saveNotifications(): void {
    try {
      localStorage.setItem('logan-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  /**
   * Add a new notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const newNotification: Notification = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date().toISOString(),
      read: false
    };

    // Check if we should show this notification based on settings
    if (!this.shouldShowNotification(newNotification)) {
      return newNotification.id;
    }

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();
    this.notifyListeners();

    // Show browser notification if supported and enabled
    this.showBrowserNotification(newNotification);

    return newNotification.id;
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if notification should be shown based on settings
   */
  private shouldShowNotification(notification: Notification): boolean {
    // Check category setting
    if (!this.settings.categories[notification.category]) {
      return false;
    }

    // Check priority setting
    if (!this.settings.priorities[notification.priority]) {
      return false;
    }

    // Check quiet hours
    if (this.settings.quietHours.enabled && this.isQuietHours()) {
      // Only show critical notifications during quiet hours
      return notification.priority === 'critical';
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.settings.quietHours;

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: Notification): Promise<void> {
    if (!this.settings.enablePushNotifications || !('Notification' in window)) {
      return;
    }

    try {
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'critical'
        });

        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };

        // Auto-close after 5 seconds unless critical
        if (notification.priority !== 'critical') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications with filters
   */
  getFilteredNotifications(filters: {
    unreadOnly?: boolean;
    category?: string;
    priority?: string;
    userId?: string;
    department?: string;
    limit?: number;
  }): Notification[] {
    let filtered = [...this.notifications];

    if (filters.unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    if (filters.category) {
      filtered = filtered.filter(n => n.category === filters.category);
    }

    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    if (filters.userId) {
      filtered = filtered.filter(n => n.userId === filters.userId);
    }

    if (filters.department) {
      filtered = filtered.filter(n => n.department === filters.department);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(filters?: { category?: string; userId?: string }): number {
    let marked = 0;
    
    this.notifications.forEach(notification => {
      if (notification.read) return;
      
      if (filters?.category && notification.category !== filters.category) return;
      if (filters?.userId && notification.userId !== filters.userId) return;
      
      notification.read = true;
      marked++;
    });

    if (marked > 0) {
      this.saveNotifications();
      this.notifyListeners();
    }

    return marked;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveNotifications();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear all notifications
   */
  clearAll(filters?: { category?: string; read?: boolean }): number {
    const originalLength = this.notifications.length;
    
    if (!filters) {
      this.notifications = [];
    } else {
      this.notifications = this.notifications.filter(notification => {
        if (filters.category && notification.category === filters.category) return false;
        if (filters.read !== undefined && notification.read === filters.read) return false;
        return true;
      });
    }

    const cleared = originalLength - this.notifications.length;
    
    if (cleared > 0) {
      this.saveNotifications();
      this.notifyListeners();
    }

    return cleared;
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const total = this.notifications.length;
    const unread = this.notifications.filter(n => !n.read).length;
    
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    this.notifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = this.notifications.filter(n => 
      new Date(n.timestamp) >= today
    ).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = this.notifications.filter(n => 
      new Date(n.timestamp) >= weekAgo
    ).length;

    return {
      total,
      unread,
      byType,
      byPriority,
      todayCount,
      weekCount
    };
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current notifications
    listener(this.getNotifications());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getNotifications());
      } catch (error) {
        console.error('Notification listener error:', error);
      }
    });
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Save settings
    try {
      localStorage.setItem('logan-notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  /**
   * Get notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('logan-notification-settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  /**
   * Start cleanup interval to remove old notifications
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const originalLength = this.notifications.length;
      this.notifications = this.notifications.filter(n => 
        new Date(n.timestamp) > thirtyDaysAgo || n.priority === 'critical'
      );
      
      if (this.notifications.length !== originalLength) {
        this.saveNotifications();
        console.log(`🧹 Cleaned up ${originalLength - this.notifications.length} old notifications`);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Create expense-related notifications
   */
  createExpenseNotification(type: 'submitted' | 'approved' | 'rejected', data: {
    expenseId: string;
    employeeName: string;
    amount: number;
    category: string;
    managerId?: string;
  }): string {
    const notifications = {
      submitted: {
        title: 'New Expense Submitted',
        message: `${data.employeeName} submitted a ${data.category} expense for R${data.amount.toLocaleString()}`,
        type: 'expense' as const,
        priority: 'medium' as const,
        userId: data.managerId
      },
      approved: {
        title: 'Expense Approved',
        message: `Your ${data.category} expense of R${data.amount.toLocaleString()} has been approved`,
        type: 'success' as const,
        priority: 'low' as const
      },
      rejected: {
        title: 'Expense Rejected',
        message: `Your ${data.category} expense of R${data.amount.toLocaleString()} was rejected`,
        type: 'warning' as const,
        priority: 'medium' as const
      }
    };

    return this.addNotification({
      ...notifications[type],
      category: 'expense',
      metadata: { expenseId: data.expenseId }
    });
  }

  /**
   * Create system notifications
   */
  createSystemNotification(type: 'maintenance' | 'update' | 'alert', data: {
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): string {
    return this.addNotification({
      title: data.title,
      message: data.message,
      type: 'system',
      priority: data.priority || 'medium',
      category: 'system'
    });
  }

  /**
   * Create compliance notifications
   */
  createComplianceNotification(data: {
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    department?: string;
  }): string {
    return this.addNotification({
      title: data.title,
      message: data.message,
      type: 'warning',
      priority: data.priority,
      category: 'compliance',
      userId: data.userId,
      department: data.department
    });
  }
}

// Export singleton instance
export const enterpriseNotificationHub = new EnterpriseNotificationHubService();

// Auto-initialize
if (typeof window !== 'undefined') {
  enterpriseNotificationHub.initialize();
}

// Export convenience functions
export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) =>
  enterpriseNotificationHub.addNotification(notification);

export const getNotifications = () => enterpriseNotificationHub.getNotifications();

export const markAsRead = (id: string) => enterpriseNotificationHub.markAsRead(id);

export const getNotificationStats = () => enterpriseNotificationHub.getStats();

export const createExpenseNotification = (
  type: 'submitted' | 'approved' | 'rejected',
  data: {
    expenseId: string;
    employeeName: string;
    amount: number;
    category: string;
    managerId?: string;
  }
) => enterpriseNotificationHub.createExpenseNotification(type, data);

export const createSystemNotification = (
  type: 'maintenance' | 'update' | 'alert',
  data: {
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }
) => enterpriseNotificationHub.createSystemNotification(type, data);

export const subscribe = (listener: (notifications: Notification[]) => void) =>
  enterpriseNotificationHub.subscribe(listener);

export default enterpriseNotificationHub;