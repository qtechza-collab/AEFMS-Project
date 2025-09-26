import { supabase } from './supabase/client';
import { getEnvVar } from './env';

export interface ConnectionStatus {
  online: boolean;
  supabaseConnected: boolean;
  lastChecked: string;
  latency?: number;
  error?: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  auth: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
  lastCheck: string;
}

/**
 * Logan Freights Connection Status Service
 * Monitor system connectivity and health
 */
class ConnectionStatusService {
  
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private currentStatus: ConnectionStatus = {
    online: navigator.onLine,
    supabaseConnected: false,
    lastChecked: new Date().toISOString(),
    connectionQuality: 'offline'
  };

  /**
   * Start monitoring connection status
   */
  startMonitoring(intervalMs: number = 30000): void {
    // Initial check
    this.checkConnectionStatus();

    // Set up periodic checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkConnectionStatus();
    }, intervalMs);

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOnlineStatusChange);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('online', this.handleOnlineStatusChange);
    window.removeEventListener('offline', this.handleOnlineStatusChange);
  }

  /**
   * Get current connection status
   */
  getCurrentStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  /**
   * Add status change listener
   */
  addListener(callback: (status: ConnectionStatus) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove status change listener
   */
  removeListener(callback: (status: ConnectionStatus) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Check connection status
   */
  private async checkConnectionStatus(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check if browser is online
      const online = navigator.onLine;
      
      // Check Supabase connection
      const supabaseConnected = await this.checkSupabaseConnection();
      
      // Calculate latency
      const latency = Date.now() - startTime;
      
      // Determine connection quality
      const connectionQuality = this.determineConnectionQuality(online, supabaseConnected, latency);
      
      const newStatus: ConnectionStatus = {
        online,
        supabaseConnected,
        lastChecked: new Date().toISOString(),
        latency,
        connectionQuality
      };

      // Update current status
      this.currentStatus = newStatus;

      // Notify listeners if status changed significantly
      this.notifyListeners(newStatus);

    } catch (error) {
      const errorStatus: ConnectionStatus = {
        online: navigator.onLine,
        supabaseConnected: false,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection check failed',
        connectionQuality: 'offline'
      };

      this.currentStatus = errorStatus;
      this.notifyListeners(errorStatus);
    }
  }

  /**
   * Check Supabase connection
   */
  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      // Check if Supabase is configured
      const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
      const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('demo-project') || 
          supabaseKey.includes('demo-')) {
        return false; // Demo mode
      }

      // Try a simple query to test connection
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.warn('Supabase connection check failed:', error);
      return false;
    }
  }

  /**
   * Determine connection quality
   */
  private determineConnectionQuality(
    online: boolean, 
    supabaseConnected: boolean, 
    latency: number
  ): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!online || !supabaseConnected) {
      return 'offline';
    }

    if (latency < 200) {
      return 'excellent';
    } else if (latency < 500) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * Handle browser online/offline events
   */
  private handleOnlineStatusChange = (): void => {
    // Trigger immediate check when browser status changes
    this.checkConnectionStatus();
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: ConnectionStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.warn('Connection status listener error:', error);
      }
    });
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{ success: boolean; health?: SystemHealth; error?: string }> {
    try {
      const health: SystemHealth = {
        database: 'error',
        storage: 'error',
        auth: 'error',
        overall: 'error',
        lastCheck: new Date().toISOString()
      };

      // Check database
      try {
        const { error: dbError } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        health.database = dbError ? 'error' : 'healthy';
      } catch (error) {
        health.database = 'error';
      }

      // Check storage
      try {
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        health.storage = storageError ? 'error' : 'healthy';
      } catch (error) {
        health.storage = 'error';
      }

      // Check auth
      try {
        const { data: session } = await supabase.auth.getSession();
        health.auth = 'healthy'; // If we can check, auth is working
      } catch (error) {
        health.auth = 'error';
      }

      // Determine overall health
      const components = [health.database, health.storage, health.auth];
      const healthyCount = components.filter(c => c === 'healthy').length;
      const warningCount = components.filter(c => c === 'warning').length;
      
      if (healthyCount === components.length) {
        health.overall = 'healthy';
      } else if (healthyCount >= components.length / 2) {
        health.overall = 'warning';
      } else {
        health.overall = 'error';
      }

      return { success: true, health };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Test connection speed
   */
  async testConnectionSpeed(): Promise<{ success: boolean; speed?: number; error?: string }> {
    try {
      const startTime = performance.now();
      
      // Make a small request to test speed
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) throw error;

      const endTime = performance.now();
      const speed = endTime - startTime;

      return { success: true, speed };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Speed test failed'
      };
    }
  }

  /**
   * Get connection history
   */
  getConnectionHistory(): ConnectionStatus[] {
    // In a real implementation, this would store history
    // For now, return the current status
    return [this.currentStatus];
  }

  /**
   * Force connection check
   */
  async forceCheck(): Promise<ConnectionStatus> {
    await this.checkConnectionStatus();
    return this.getCurrentStatus();
  }

  /**
   * Get network information (if available)
   */
  getNetworkInfo(): any {
    // Use Navigator.connection API if available
    const nav = navigator as any;
    if (nav.connection || nav.mozConnection || nav.webkitConnection) {
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }

    return null;
  }

  /**
   * Check if in demo mode
   */
  isDemoMode(): boolean {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
    
    return !supabaseUrl || 
           !supabaseKey || 
           supabaseUrl.includes('demo-project') || 
           supabaseKey.includes('demo-');
  }

  /**
   * Get troubleshooting info
   */
  getTroubleshootingInfo(): any {
    return {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      networkInfo: this.getNetworkInfo(),
      isDemoMode: this.isDemoMode(),
      currentStatus: this.currentStatus,
      supabaseUrl: getEnvVar('VITE_SUPABASE_URL') ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const connectionStatusService = new ConnectionStatusService();

// Export utility functions
export const getCurrentStatus = () => connectionStatusService.getCurrentStatus();
export const startMonitoring = (intervalMs?: number) => connectionStatusService.startMonitoring(intervalMs);
export const stopMonitoring = () => connectionStatusService.stopMonitoring();
export const addStatusListener = (callback: (status: ConnectionStatus) => void) => connectionStatusService.addListener(callback);
export const removeStatusListener = (callback: (status: ConnectionStatus) => void) => connectionStatusService.removeListener(callback);
export const getSystemHealth = () => connectionStatusService.getSystemHealth();
export const testConnectionSpeed = () => connectionStatusService.testConnectionSpeed();
export const forceCheck = () => connectionStatusService.forceCheck();
export const getTroubleshootingInfo = () => connectionStatusService.getTroubleshootingInfo();