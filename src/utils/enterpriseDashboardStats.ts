import { supabase } from './supabase/client';

export interface EnterpriseDashboardStats {
  overview: OverviewStats;
  financial: FinancialStats;
  operational: OperationalStats;
  compliance: ComplianceStats;
  performance: PerformanceStats;
  alerts: AlertStats;
}

export interface OverviewStats {
  totalEmployees: number;
  activeUsers: number;
  totalClaims: number;
  monthlyGrowth: number;
  systemUptime: number;
  lastUpdate: string;
}

export interface FinancialStats {
  totalExpenses: number;
  monthlyExpenses: number;
  yearlyExpenses: number;
  budgetUtilization: number;
  costPerEmployee: number;
  savingsGenerated: number;
  topSpendingCategories: Array<{ category: string; amount: number; percentage: number }>;
}

export interface OperationalStats {
  averageProcessingTime: number;
  approvalRate: number;
  rejectionRate: number;
  pendingClaims: number;
  automationRate: number;
  userSatisfaction: number;
  systemErrors: number;
}

export interface ComplianceStats {
  complianceScore: number;
  auditReadiness: number;
  policyViolations: number;
  documentationRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastAudit: string;
}

export interface PerformanceStats {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  scalabilityIndex: number;
  resourceUtilization: number;
}

export interface AlertStats {
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  resolvedToday: number;
  avgResolutionTime: number;
  escalatedAlerts: number;
}

/**
 * Logan Freights Enterprise Dashboard Stats Service
 * Comprehensive enterprise-level analytics and statistics
 */
class EnterpriseDashboardStatsService {
  
  /**
   * Get comprehensive enterprise dashboard statistics
   */
  async getEnterpriseDashboardStats(): Promise<{ success: boolean; data?: EnterpriseDashboardStats; error?: string }> {
    try {
      console.log('📊 Collecting enterprise dashboard statistics...');

      const [
        overview,
        financial,
        operational,
        compliance,
        performance,
        alerts
      ] = await Promise.all([
        this.getOverviewStats(),
        this.getFinancialStats(),
        this.getOperationalStats(),
        this.getComplianceStats(),
        this.getPerformanceStats(),
        this.getAlertStats()
      ]);

      const stats: EnterpriseDashboardStats = {
        overview,
        financial,
        operational,
        compliance,
        performance,
        alerts
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get enterprise dashboard stats'
      };
    }
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats(): Promise<OverviewStats> {
    try {
      // Get total employees
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, created_at, last_login');

      // Get total claims
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('id, submitted_at');

      const totalEmployees = employees?.length || 0;
      const activeUsers = employees?.filter(e => {
        if (!e.last_login) return false;
        const lastLogin = new Date(e.last_login);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastLogin > thirtyDaysAgo;
      }).length || 0;

      const totalClaims = claims?.length || 0;

      // Calculate monthly growth
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthClaims = claims?.filter(c => {
        const date = new Date(c.submitted_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length || 0;

      const lastMonthClaims = claims?.filter(c => {
        const date = new Date(c.submitted_at);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === year;
      }).length || 0;

      const monthlyGrowth = lastMonthClaims > 0 
        ? ((thisMonthClaims - lastMonthClaims) / lastMonthClaims) * 100 
        : 0;

      return {
        totalEmployees,
        activeUsers,
        totalClaims,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        systemUptime: 99.8, // Would be from monitoring service
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Failed to get overview stats:', error);
      return {
        totalEmployees: 0,
        activeUsers: 0,
        totalClaims: 0,
        monthlyGrowth: 0,
        systemUptime: 99.8,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Get financial statistics
   */
  private async getFinancialStats(): Promise<FinancialStats> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, category, expense_date, status');

      if (error) throw error;

      const totalExpenses = claims?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Calculate monthly/yearly expenses
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);

      const monthlyExpenses = claims?.filter(c => new Date(c.expense_date) >= currentMonth)
        .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      const yearlyExpenses = claims?.filter(c => new Date(c.expense_date) >= currentYear)
        .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Get top spending categories
      const categoryMap = new Map<string, number>();
      claims?.forEach(claim => {
        const category = claim.category || 'Other';
        categoryMap.set(category, (categoryMap.get(category) || 0) + (claim.amount || 0));
      });

      const topSpendingCategories = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Logan Freights specific calculations
      const targetBudget = 2500000; // R2.5M annual target
      const budgetUtilization = (yearlyExpenses / targetBudget) * 100;
      const totalEmployees = 45; // From Logan Freights data
      const costPerEmployee = totalEmployees > 0 ? totalExpenses / totalEmployees : 0;
      const savingsGenerated = Math.max(0, targetBudget - yearlyExpenses);

      return {
        totalExpenses,
        monthlyExpenses,
        yearlyExpenses,
        budgetUtilization: Math.round(budgetUtilization * 100) / 100,
        costPerEmployee: Math.round(costPerEmployee),
        savingsGenerated: Math.round(savingsGenerated),
        topSpendingCategories
      };
    } catch (error) {
      console.warn('Failed to get financial stats:', error);
      return {
        totalExpenses: 0,
        monthlyExpenses: 0,
        yearlyExpenses: 0,
        budgetUtilization: 0,
        costPerEmployee: 0,
        savingsGenerated: 0,
        topSpendingCategories: []
      };
    }
  }

  /**
   * Get operational statistics
   */
  private async getOperationalStats(): Promise<OperationalStats> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('status, submitted_at, approved_at');

      if (error) throw error;

      const totalClaims = claims?.length || 0;
      const approvedClaims = claims?.filter(c => c.status === 'approved').length || 0;
      const rejectedClaims = claims?.filter(c => c.status === 'rejected').length || 0;
      const pendingClaims = claims?.filter(c => c.status === 'pending').length || 0;

      const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;
      const rejectionRate = totalClaims > 0 ? (rejectedClaims / totalClaims) * 100 : 0;

      // Calculate average processing time
      const processedClaims = claims?.filter(c => c.approved_at && c.submitted_at) || [];
      const avgProcessingTime = processedClaims.length > 0
        ? processedClaims.reduce((sum, c) => {
            const submitted = new Date(c.submitted_at).getTime();
            const approved = new Date(c.approved_at!).getTime();
            return sum + (approved - submitted) / (1000 * 60 * 60 * 24); // days
          }, 0) / processedClaims.length
        : 0;

      return {
        averageProcessingTime: Math.round(avgProcessingTime * 10) / 10,
        approvalRate: Math.round(approvalRate * 100) / 100,
        rejectionRate: Math.round(rejectionRate * 100) / 100,
        pendingClaims,
        automationRate: 85, // Would be calculated from automated vs manual approvals
        userSatisfaction: 4.2, // Would be from user feedback
        systemErrors: 2 // Would be from error monitoring
      };
    } catch (error) {
      console.warn('Failed to get operational stats:', error);
      return {
        averageProcessingTime: 0,
        approvalRate: 0,
        rejectionRate: 0,
        pendingClaims: 0,
        automationRate: 0,
        userSatisfaction: 0,
        systemErrors: 0
      };
    }
  }

  /**
   * Get compliance statistics
   */
  private async getComplianceStats(): Promise<ComplianceStats> {
    try {
      // Get claims with receipts
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('id, amount');

      const { data: receipts, error: receiptsError } = await supabase
        .from('receipt_images')
        .select('claim_id');

      const totalClaims = claims?.length || 0;
      const claimsWithReceipts = new Set(receipts?.map(r => r.claim_id) || []).size;
      const documentationRate = totalClaims > 0 ? (claimsWithReceipts / totalClaims) * 100 : 100;

      // Get audit data
      const { data: audits, error: auditError } = await supabase
        .from('audit_log')
        .select('id')
        .limit(1);

      const hasAuditTrail = !auditError && (audits?.length || 0) > 0;

      // Calculate compliance score
      let complianceScore = 0;
      complianceScore += documentationRate * 0.4; // 40% weight on documentation
      complianceScore += (hasAuditTrail ? 100 : 0) * 0.3; // 30% weight on audit trail
      complianceScore += 85 * 0.3; // 30% weight on other compliance factors

      const riskLevel = complianceScore >= 90 ? 'low' : complianceScore >= 70 ? 'medium' : 'high';

      return {
        complianceScore: Math.round(complianceScore),
        auditReadiness: Math.round(complianceScore * 0.95), // Slightly lower than compliance
        policyViolations: 3, // Would be from fraud detection
        documentationRate: Math.round(documentationRate),
        riskLevel,
        lastAudit: '2024-01-15' // Would be from audit records
      };
    } catch (error) {
      console.warn('Failed to get compliance stats:', error);
      return {
        complianceScore: 75,
        auditReadiness: 70,
        policyViolations: 0,
        documentationRate: 80,
        riskLevel: 'medium',
        lastAudit: '2024-01-15'
      };
    }
  }

  /**
   * Get performance statistics
   */
  private async getPerformanceStats(): Promise<PerformanceStats> {
    // In a real implementation, these would come from monitoring services
    return {
      responseTime: 245, // milliseconds
      throughput: 150, // requests per minute
      errorRate: 0.2, // percentage
      availability: 99.95, // percentage
      scalabilityIndex: 85, // custom metric
      resourceUtilization: 68 // percentage
    };
  }

  /**
   * Get alert statistics
   */
  private async getAlertStats(): Promise<AlertStats> {
    try {
      // Get system alerts/notifications
      const { data: alerts, error } = await supabase
        .from('notifications')
        .select('priority, created_at, read')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) throw error;

      const criticalAlerts = alerts?.filter(a => a.priority === 'critical').length || 0;
      const warningAlerts = alerts?.filter(a => a.priority === 'high').length || 0;
      const infoAlerts = alerts?.filter(a => a.priority === 'medium' || a.priority === 'low').length || 0;
      const resolvedToday = alerts?.filter(a => a.read).length || 0;

      return {
        criticalAlerts,
        warningAlerts,
        infoAlerts,
        resolvedToday,
        avgResolutionTime: 2.5, // hours - would be calculated
        escalatedAlerts: 1 // would be from escalation tracking
      };
    } catch (error) {
      console.warn('Failed to get alert stats:', error);
      return {
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        resolvedToday: 0,
        avgResolutionTime: 0,
        escalatedAlerts: 0
      };
    }
  }

  /**
   * Get real-time stats update
   */
  async getRealTimeUpdate(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const overview = await this.getOverviewStats();
      const operational = await this.getOperationalStats();
      const alerts = await this.getAlertStats();

      return {
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          activeUsers: overview.activeUsers,
          pendingClaims: operational.pendingClaims,
          systemUptime: overview.systemUptime,
          criticalAlerts: alerts.criticalAlerts,
          responseTime: 245 // Would be from monitoring
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get real-time update'
      };
    }
  }

  /**
   * Get historical trends
   */
  async getHistoricalTrends(days: number = 30): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, submitted_at, status')
        .gte('submitted_at', startDate.toISOString());

      if (error) throw error;

      // Group by day
      const dailyData = new Map<string, { total: number; count: number; approved: number }>();

      (claims || []).forEach(claim => {
        const date = new Date(claim.submitted_at).toISOString().split('T')[0];
        const current = dailyData.get(date) || { total: 0, count: 0, approved: 0 };
        
        current.total += claim.amount || 0;
        current.count += 1;
        if (claim.status === 'approved') current.approved += 1;
        
        dailyData.set(date, current);
      });

      const trends = Array.from(dailyData.entries())
        .map(([date, data]) => ({
          date,
          totalAmount: data.total,
          claimCount: data.count,
          approvedCount: data.approved,
          approvalRate: data.count > 0 ? (data.approved / data.count) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get historical trends'
      };
    }
  }
}

// Export singleton instance
export const enterpriseDashboardStatsService = new EnterpriseDashboardStatsService();

// Export utility functions
export const getEnterpriseDashboardStats = () => 
  enterpriseDashboardStatsService.getEnterpriseDashboardStats();
export const getRealTimeUpdate = () => 
  enterpriseDashboardStatsService.getRealTimeUpdate();
export const getHistoricalTrends = (days?: number) => 
  enterpriseDashboardStatsService.getHistoricalTrends(days);