import { supabase } from './supabase/client';

export interface EnterpriseManagementData {
  systemOverview: SystemOverview;
  userManagement: UserManagementData;
  securityStatus: SecurityStatus;
  performanceMetrics: PerformanceMetrics;
  integrationStatus: IntegrationStatus;
  maintenanceSchedule: MaintenanceItem[];
}

export interface SystemOverview {
  version: string;
  uptime: number;
  totalUsers: number;
  activeUsers: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  lastBackup: string;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface UserManagementData {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  usersByRole: Array<{ role: string; count: number }>;
  usersByDepartment: Array<{ department: string; count: number }>;
  pendingApprovals: number;
  suspendedAccounts: number;
}

export interface SecurityStatus {
  overallScore: number;
  securityLevel: 'high' | 'medium' | 'low';
  lastSecurityScan: string;
  vulnerabilities: SecurityVulnerability[];
  accessAttempts: AccessAttempt[];
  securityPolicies: SecurityPolicy[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  detectedAt: string;
}

export interface AccessAttempt {
  id: string;
  type: 'login' | 'api' | 'admin';
  success: boolean;
  userId?: string;
  ipAddress: string;
  timestamp: string;
  location?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  enabled: boolean;
  lastUpdated: string;
  compliance: number;
}

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errors: {
    errorRate: number;
    criticalErrors: number;
    warningErrors: number;
  };
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
}

export interface IntegrationStatus {
  supabase: IntegrationHealth;
  vercel: IntegrationHealth;
  email: IntegrationHealth;
  monitoring: IntegrationHealth;
  backup: IntegrationHealth;
}

export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  uptime: number;
  errors: number;
}

export interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  type: 'scheduled' | 'emergency' | 'routine';
  scheduledFor: string;
  duration: number;
  impact: 'low' | 'medium' | 'high';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Logan Freights Enterprise Management Dashboard Service
 * Comprehensive system administration and management
 */
class EnterpriseManagementDashboardService {
  
  /**
   * Get comprehensive enterprise management data
   */
  async getEnterpriseManagementData(): Promise<{ success: boolean; data?: EnterpriseManagementData; error?: string }> {
    try {
      console.log('🏢 Collecting enterprise management data...');

      const [
        systemOverview,
        userManagement,
        securityStatus,
        performanceMetrics,
        integrationStatus,
        maintenanceSchedule
      ] = await Promise.all([
        this.getSystemOverview(),
        this.getUserManagementData(),
        this.getSecurityStatus(),
        this.getPerformanceMetrics(),
        this.getIntegrationStatus(),
        this.getMaintenanceSchedule()
      ]);

      const managementData: EnterpriseManagementData = {
        systemOverview,
        userManagement,
        securityStatus,
        performanceMetrics,
        integrationStatus,
        maintenanceSchedule
      };

      return { success: true, data: managementData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get enterprise management data'
      };
    }
  }

  /**
   * Get system overview
   */
  private async getSystemOverview(): Promise<SystemOverview> {
    try {
      // Get user counts
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, last_login');

      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => {
        if (!u.last_login) return false;
        const lastLogin = new Date(u.last_login);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return lastLogin > sevenDaysAgo;
      }).length || 0;

      // Calculate system health
      const uptimePercent = 99.95; // Would come from monitoring
      const loadPercent = 45; // Would come from monitoring
      const memoryPercent = 68; // Would come from monitoring

      let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
      if (loadPercent > 80 || memoryPercent > 85) systemHealth = 'warning';
      if (loadPercent > 90 || memoryPercent > 95) systemHealth = 'critical';
      else if (loadPercent > 60 || memoryPercent > 70) systemHealth = 'good';

      return {
        version: '2.1.0',
        uptime: uptimePercent,
        totalUsers,
        activeUsers,
        systemLoad: loadPercent,
        memoryUsage: memoryPercent,
        diskUsage: 42,
        lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        systemHealth
      };
    } catch (error) {
      console.warn('Failed to get system overview:', error);
      return {
        version: '2.1.0',
        uptime: 99.95,
        totalUsers: 0,
        activeUsers: 0,
        systemLoad: 45,
        memoryUsage: 68,
        diskUsage: 42,
        lastBackup: new Date().toISOString(),
        systemHealth: 'good'
      };
    }
  }

  /**
   * Get user management data
   */
  private async getUserManagementData(): Promise<UserManagementData> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role, department, status, created_at, last_login');

      if (error) throw error;

      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => u.status !== 'inactive').length || 0;
      const inactiveUsers = totalUsers - activeUsers;

      // New users this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newUsersThisMonth = users?.filter(u => {
        const created = new Date(u.created_at);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
      }).length || 0;

      // Users by role
      const roleMap = new Map<string, number>();
      users?.forEach(user => {
        const role = user.role || 'employee';
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
      const usersByRole = Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));

      // Users by department
      const deptMap = new Map<string, number>();
      users?.forEach(user => {
        const department = user.department || 'Unknown';
        deptMap.set(department, (deptMap.get(department) || 0) + 1);
      });
      const usersByDepartment = Array.from(deptMap.entries()).map(([department, count]) => ({ department, count }));

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisMonth,
        usersByRole,
        usersByDepartment,
        pendingApprovals: 5, // Would be calculated from actual approvals
        suspendedAccounts: 0
      };
    } catch (error) {
      console.warn('Failed to get user management data:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        newUsersThisMonth: 0,
        usersByRole: [],
        usersByDepartment: [],
        pendingApprovals: 0,
        suspendedAccounts: 0
      };
    }
  }

  /**
   * Get security status
   */
  private async getSecurityStatus(): Promise<SecurityStatus> {
    try {
      // Get recent login attempts
      const { data: loginAttempts, error: loginError } = await supabase
        .from('login_attempts')
        .select('*')
        .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('attempted_at', { ascending: false })
        .limit(50);

      const accessAttempts: AccessAttempt[] = (loginAttempts || []).map(attempt => ({
        id: attempt.id,
        type: 'login',
        success: attempt.successful,
        userId: attempt.user_id,
        ipAddress: attempt.ip_address || 'unknown',
        timestamp: attempt.attempted_at,
        location: attempt.location
      }));

      // Mock security vulnerabilities and policies
      const vulnerabilities: SecurityVulnerability[] = [
        {
          id: 'vuln_001',
          severity: 'medium',
          title: 'Password Policy Enhancement',
          description: 'Consider implementing stronger password requirements',
          status: 'investigating',
          detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const securityPolicies: SecurityPolicy[] = [
        {
          id: 'policy_001',
          name: 'Password Policy',
          enabled: true,
          lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          compliance: 85
        },
        {
          id: 'policy_002',
          name: 'Session Management',
          enabled: true,
          lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          compliance: 95
        },
        {
          id: 'policy_003',
          name: 'Data Encryption',
          enabled: true,
          lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          compliance: 100
        }
      ];

      // Calculate overall security score
      const avgCompliance = securityPolicies.reduce((sum, p) => sum + p.compliance, 0) / securityPolicies.length;
      const vulnerabilityScore = Math.max(0, 100 - (vulnerabilities.filter(v => v.status === 'open').length * 10));
      const overallScore = Math.round((avgCompliance + vulnerabilityScore) / 2);

      const securityLevel = overallScore >= 90 ? 'high' : overallScore >= 70 ? 'medium' : 'low';

      return {
        overallScore,
        securityLevel,
        lastSecurityScan: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        vulnerabilities,
        accessAttempts,
        securityPolicies
      };
    } catch (error) {
      console.warn('Failed to get security status:', error);
      return {
        overallScore: 85,
        securityLevel: 'high',
        lastSecurityScan: new Date().toISOString(),
        vulnerabilities: [],
        accessAttempts: [],
        securityPolicies: []
      };
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // In a real implementation, these would come from monitoring services
    return {
      responseTime: {
        avg: 245,
        p95: 450,
        p99: 850
      },
      throughput: {
        requestsPerSecond: 2.5,
        requestsPerMinute: 150
      },
      errors: {
        errorRate: 0.2,
        criticalErrors: 0,
        warningErrors: 3
      },
      resources: {
        cpuUsage: 45,
        memoryUsage: 68,
        diskUsage: 42,
        networkUsage: 25
      }
    };
  }

  /**
   * Get integration status
   */
  private async getIntegrationStatus(): Promise<IntegrationStatus> {
    // Test Supabase connection
    const supabaseHealth = await this.testSupabaseConnection();

    return {
      supabase: supabaseHealth,
      vercel: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 120,
        uptime: 99.98,
        errors: 0
      },
      email: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 300,
        uptime: 99.5,
        errors: 1
      },
      monitoring: {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 80,
        uptime: 100,
        errors: 0
      },
      backup: {
        status: 'healthy',
        lastCheck: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        responseTime: 500,
        uptime: 99.9,
        errors: 0
      }
    };
  }

  /**
   * Test Supabase connection
   */
  private async testSupabaseConnection(): Promise<IntegrationHealth> {
    try {
      const startTime = Date.now();
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      return {
        status: error ? 'degraded' : 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        uptime: error ? 95 : 99.99,
        errors: error ? 1 : 0
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        responseTime: 0,
        uptime: 0,
        errors: 1
      };
    }
  }

  /**
   * Get maintenance schedule
   */
  private async getMaintenanceSchedule(): Promise<MaintenanceItem[]> {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedule')
        .select('*')
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(10);

      if (error && error.code !== 'PGRST116') throw error;

      // Return mock data if no maintenance table exists
      if (!data || data.length === 0) {
        return [
          {
            id: 'maint_001',
            title: 'Database Backup Optimization',
            description: 'Optimize backup procedures for better performance',
            type: 'routine',
            scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 120, // minutes
            impact: 'low',
            status: 'planned'
          },
          {
            id: 'maint_002',
            title: 'Security Patch Update',
            description: 'Apply latest security patches to system components',
            type: 'scheduled',
            scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            duration: 60,
            impact: 'medium',
            status: 'planned'
          }
        ];
      }

      return data.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        scheduledFor: item.scheduled_for,
        duration: item.duration,
        impact: item.impact,
        status: item.status
      }));
    } catch (error) {
      console.warn('Failed to get maintenance schedule:', error);
      return [];
    }
  }

  /**
   * Schedule maintenance
   */
  async scheduleMaintenance(maintenance: Omit<MaintenanceItem, 'id' | 'status'>): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedule')
        .insert({
          title: maintenance.title,
          description: maintenance.description,
          type: maintenance.type,
          scheduled_for: maintenance.scheduledFor,
          duration: maintenance.duration,
          impact: maintenance.impact,
          status: 'planned',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule maintenance'
      };
    }
  }

  /**
   * Update maintenance status
   */
  async updateMaintenanceStatus(
    maintenanceId: string, 
    status: MaintenanceItem['status']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('maintenance_schedule')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', maintenanceId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update maintenance status'
      };
    }
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      return { success: true, data: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system alerts'
      };
    }
  }
}

// Export singleton instance
export const enterpriseManagementDashboardService = new EnterpriseManagementDashboardService();

// Export utility functions
export const getEnterpriseManagementData = () => 
  enterpriseManagementDashboardService.getEnterpriseManagementData();
export const scheduleMaintenance = (maintenance: any) => 
  enterpriseManagementDashboardService.scheduleMaintenance(maintenance);
export const updateMaintenanceStatus = (maintenanceId: string, status: any) => 
  enterpriseManagementDashboardService.updateMaintenanceStatus(maintenanceId, status);
export const getSystemAlerts = () => 
  enterpriseManagementDashboardService.getSystemAlerts();