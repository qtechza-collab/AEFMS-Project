import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Mail,
  Volume2,
  VolumeX
} from 'lucide-react';
import { dataService } from '../utils/supabaseDataService';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
  read_at?: string;
}

interface NotificationCenterProps {
  userId: string;
  userRole?: string;
}

export function NotificationCenter({ userId, userRole }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    // Create notification sound (using Web Audio API for a simple beep)
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    if (soundEnabled && 'AudioContext' in window) {
      audioRef.current = { play: createNotificationSound } as any;
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [soundEnabled]);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time updates
    const handleNotificationUpdate = (event?: any) => {
      console.log('🔔 NotificationCenter: Received notification update event', event?.detail);
      fetchNotifications();
    };
    
    window.addEventListener('logan-notification-update', handleNotificationUpdate);
    window.addEventListener('logan-notification-created', handleNotificationUpdate);
    window.addEventListener('logan-claims-updated', handleNotificationUpdate);
    window.addEventListener('logan-claims-refresh', handleNotificationUpdate);
    window.addEventListener('logan-data-sync', handleNotificationUpdate);
    
    // Poll for new notifications every 30 seconds as fallback
    pollInterval.current = setInterval(fetchNotifications, 30000);
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      window.removeEventListener('logan-notification-update', handleNotificationUpdate);
      window.removeEventListener('logan-notification-created', handleNotificationUpdate);
      window.removeEventListener('logan-claims-updated', handleNotificationUpdate);
      window.removeEventListener('logan-claims-refresh', handleNotificationUpdate);
      window.removeEventListener('logan-data-sync', handleNotificationUpdate);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      console.log(`🔔 NotificationCenter: Fetching notifications for user ${userId}`);
      
      // Use Supabase data service for notifications
      const notifications = await dataService.getNotifications();
      console.log(`🔔 NotificationCenter: Fetched ${notifications.length} notifications`);
      
      const formattedNotifications = notifications.map(notif => ({
        id: notif.id,
        user_id: notif.user_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        priority: notif.priority || 'medium',
        read: notif.is_read,
        created_at: notif.created_at
      }));
      
      const newUnreadCount = formattedNotifications.filter(n => !n.read).length;
      
      // Play sound for new notifications
      if (soundEnabled && unreadCount >= 0 && newUnreadCount > unreadCount && audioRef.current) {
        try {
          audioRef.current.play();
        } catch (error) {
          console.log('Could not play notification sound:', error);
        }
      }
      
      setNotifications(formattedNotifications);
      setUnreadCount(newUnreadCount);
      console.log(`🔔 NotificationCenter: Set ${formattedNotifications.length} notifications, ${newUnreadCount} unread`);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Create some demo notifications if we can't fetch real ones
      const demoNotifications = [
        {
          id: 'demo-1',
          user_id: userId,
          type: 'system',
          title: 'Welcome to Logan Freights',
          message: 'Your expense management system is ready to use.',
          priority: 'medium' as const,
          read: false,
          created_at: new Date().toISOString()
        }
      ];
      setNotifications(demoNotifications);
      setUnreadCount(1);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log(`🔔 NotificationCenter: Marking notification ${notificationId} as read`);
      
      // Use Supabase data service to mark as read
      await dataService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      console.log(`🔔 NotificationCenter: Marked notification ${notificationId} as read`);
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      // Fallback: Update local state only
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(notification => 
          dataService.markNotificationAsRead(notification.id)
        )
      );
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      // Fallback: Update local state only
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string, priority: string) => {
    switch (type) {
      case 'expense_submitted':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'expense_claim':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'claim_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'claim_rejected':
        return <X className="w-5 h-5 text-red-600" />;
      case 'fraud_detected':
      case 'fraud_alert':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'escalation_required':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'password_reset':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'user_registration':
        return <Info className="w-5 h-5 text-purple-600" />;
      case 'account_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'support_ticket':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-600 bg-red-50';
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="relative"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-blue-600" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {unreadCount > 0 && (
          <Badge 
            variant="secondary" 
            className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-white text-xs ${
              unreadCount > 5 ? 'bg-red-600 animate-pulse' : 'bg-red-600'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-slate-900">Notifications</DialogTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={isLoading}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            <DialogDescription>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] px-6">
              <div className="space-y-2 pb-6">
                {notifications.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`
                        border-l-4 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-sm
                        ${getPriorityColor(notification.priority)}
                        ${notification.read ? 'opacity-60' : ''}
                      `}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm text-slate-900 mb-1">
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600">
                            {notification.message}
                          </p>
                          {(notification.priority === 'high' || notification.priority === 'urgent') && (
                            <Badge variant="secondary" className="mt-2 bg-red-100 text-red-800 text-xs">
                              {notification.priority === 'urgent' ? 'URGENT' : 'High Priority'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}