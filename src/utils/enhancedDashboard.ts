import { employeeDashboardService } from './employeeDashboard';
import { employerDashboardService } from './employerDashboard';
import { hrDashboardService } from './hrDashboard';
import { adminDashboardService } from './adminDashboard';

export interface EnhancedDashboardData {
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  personalizations: DashboardPersonalization;
  realTimeData: RealTimeMetrics;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'activity' | 'notification';
  title: string;
  data: any;
  position: { x: number; y: number; width: number; height: number };
  visible: boolean;
  refreshInterval?: number;
}

export interface DashboardLayout {
  columns: number;
  compact: boolean;
  theme: 'light' | 'dark';
  showTitles: boolean;
}

export interface DashboardPersonalization {
  favoriteMetrics: string[];
  hiddenWidgets: string[];
  customColors: Record<string, string>;
  notifications: boolean;
}

export interface RealTimeMetrics {
  onlineUsers: number;
  pendingApprovals: number;
  todaySubmissions: number;
  systemHealth: 'good' | 'warning' | 'error';
}

/**
 * Logan Freights Enhanced Dashboard Service
 */
class EnhancedDashboardService {
  
  async getEnhancedDashboard(userId: string, userRole: string): Promise<{ success: boolean; data?: EnhancedDashboardData; error?: string }> {
    try {
      // Get base dashboard data based on role
      let baseDashboard: any;
      
      switch (userRole) {
        case 'employee':
          const empResult = await employeeDashboardService.getDashboardData(userId);
          baseDashboard = empResult.data;
          break;
        case 'manager':
          const mgrResult = await employerDashboardService.getDashboardData(userId);
          baseDashboard = mgrResult.data;
          break;
        case 'hr':
          const hrResult = await hrDashboardService.getHRDashboardData();
          baseDashboard = hrResult.data;
          break;
        case 'administrator':
          const adminResult = await adminDashboardService.getAdminAnalytics();
          baseDashboard = adminResult.data;
          break;
        default:
          throw new Error('Invalid user role');
      }

      // Generate enhanced widgets
      const widgets = await this.generateWidgets(baseDashboard, userRole);
      
      // Get user's layout preferences
      const layout = await this.getUserLayout(userId);
      
      // Get personalizations
      const personalizations = await this.getPersonalizations(userId);
      
      // Get real-time metrics
      const realTimeData = await this.getRealTimeMetrics();

      const enhancedData: EnhancedDashboardData = {
        widgets,
        layout,
        personalizations,
        realTimeData
      };

      return { success: true, data: enhancedData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get enhanced dashboard'
      };
    }
  }

  private async generateWidgets(dashboardData: any, userRole: string): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Common widgets for all roles
    widgets.push({
      id: 'recent-activity',
      type: 'activity',
      title: 'Recent Activity',
      data: dashboardData?.recentActivity || [],
      position: { x: 0, y: 0, width: 6, height: 4 },
      visible: true,
      refreshInterval: 30000
    });

    // Role-specific widgets
    if (userRole === 'employee') {
      widgets.push({
        id: 'my-claims',
        type: 'metric',
        title: 'My Claims',
        data: {
          total: dashboardData?.totalSubmitted || 0,
          pending: dashboardData?.totalPending || 0,
          approved: dashboardData?.totalApproved || 0
        },
        position: { x: 6, y: 0, width: 6, height: 2 },
        visible: true
      });
    }

    if (['manager', 'hr', 'administrator'].includes(userRole)) {
      widgets.push({
        id: 'approval-queue',
        type: 'table',
        title: 'Pending Approvals',
        data: dashboardData?.pendingApprovals || [],
        position: { x: 0, y: 4, width: 12, height: 4 },
        visible: true,
        refreshInterval: 60000
      });
    }

    return widgets;
  }

  private async getUserLayout(userId: string): Promise<DashboardLayout> {
    // In a real implementation, this would fetch from database
    return {
      columns: 12,
      compact: false,
      theme: 'light',
      showTitles: true
    };
  }

  private async getPersonalizations(userId: string): Promise<DashboardPersonalization> {
    // In a real implementation, this would fetch from database
    return {
      favoriteMetrics: ['total-claims', 'monthly-expenses'],
      hiddenWidgets: [],
      customColors: {},
      notifications: true
    };
  }

  private async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    // Mock real-time data
    return {
      onlineUsers: Math.floor(Math.random() * 50) + 10,
      pendingApprovals: Math.floor(Math.random() * 20) + 5,
      todaySubmissions: Math.floor(Math.random() * 30) + 10,
      systemHealth: 'good'
    };
  }

  async saveWidgetLayout(userId: string, widgets: DashboardWidget[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Save widget positions and visibility
      // Implementation would save to database
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save layout'
      };
    }
  }

  async resetDashboard(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Reset to default layout
      // Implementation would reset user's customizations
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset dashboard'
      };
    }
  }
}

export const enhancedDashboardService = new EnhancedDashboardService();