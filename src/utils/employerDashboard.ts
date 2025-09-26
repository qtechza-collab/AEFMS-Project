import { supabase } from './supabase/client';
import { dataService } from './supabaseDataService';

export interface EmployerDashboardData {
  pendingApprovals: number;
  monthlyExpenses: number;
  teamSize: number;
  budgetUtilization: number;
  recentClaims: any[];
  departmentStats: DepartmentStats;
  approvalMetrics: ApprovalMetrics;
  notifications: any[];
}

export interface DepartmentStats {
  totalEmployees: number;
  activeClaimers: number;
  averageClaimAmount: number;
  approvalRate: number;
  monthlyTrend: number;
}

export interface ApprovalMetrics {
  totalApprovals: number;
  averageApprovalTime: number;
  rejectionRate: number;
  pendingCount: number;
}

/**
 * Logan Freights Employer/Manager Dashboard Service
 * Manager-specific dashboard data and analytics
 */
class EmployerDashboardService {
  
  /**
   * Get comprehensive manager dashboard data
   */
  async getDashboardData(managerId: string): Promise<{ success: boolean; data?: EmployerDashboardData; error?: string }> {
    try {
      // Get manager's department
      const { data: manager, error: managerError } = await supabase
        .from('users')
        .select('department')
        .eq('id', managerId)
        .single();

      if (managerError || !manager) {
        throw new Error('Manager not found');
      }

      const department = manager.department;

      // Get department claims
      const { data: departmentClaims, error: claimsError } = await supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, email)
        `)
        .eq('department', department);

      if (claimsError) throw claimsError;

      // Calculate metrics
      const pendingApprovals = departmentClaims?.filter(c => c.status === 'pending').length || 0;
      
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthlyExpenses = departmentClaims
        ?.filter(c => 
          c.status === 'approved' && 
          new Date(c.expense_date) >= monthStart
        )
        .reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Get team size
      const { data: teamMembers, error: teamError } = await supabase
        .from('users')
        .select('id')
        .eq('department', department)
        .neq('role', 'manager');

      const teamSize = teamMembers?.length || 0;

      // Calculate budget utilization (simplified)
      const budgetUtilization = Math.min(100, (monthlyExpenses / 50000) * 100); // Assume R50k monthly budget

      // Get recent claims
      const recentClaims = (departmentClaims || [])
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 10);

      // Calculate department stats
      const departmentStats = await this.calculateDepartmentStats(department, departmentClaims || []);

      // Calculate approval metrics
      const approvalMetrics = await this.calculateApprovalMetrics(managerId);

      // Get notifications
      const notifications = await this.getManagerNotifications(managerId);

      const dashboardData: EmployerDashboardData = {
        pendingApprovals,
        monthlyExpenses,
        teamSize,
        budgetUtilization,
        recentClaims,
        departmentStats,
        approvalMetrics,
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
   * Calculate department statistics
   */
  private async calculateDepartmentStats(department: string, claims: any[]): Promise<DepartmentStats> {
    // Get department employees
    const { data: employees, error } = await supabase
      .from('users')
      .select('id')
      .eq('department', department);

    const totalEmployees = employees?.length || 0;
    const activeClaimers = new Set(claims.map(c => c.employee_id)).size;
    const averageClaimAmount = claims.length > 0 
      ? claims.reduce((sum, c) => sum + (c.amount || 0), 0) / claims.length 
      : 0;

    const approvedClaims = claims.filter(c => c.status === 'approved').length;
    const approvalRate = claims.length > 0 ? (approvedClaims / claims.length) * 100 : 0;

    // Calculate monthly trend (simplified)
    const thisMonth = new Date();
    const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
    const thisMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);
    const lastMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 0);

    const thisMonthAmount = claims
      .filter(c => {
        const date = new Date(c.expense_date);
        return date >= new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1) && date <= thisMonthEnd;
      })
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const lastMonthAmount = claims
      .filter(c => {
        const date = new Date(c.expense_date);
        return date >= lastMonth && date <= lastMonthEnd;
      })
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const monthlyTrend = lastMonthAmount > 0 
      ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 
      : 0;

    return {
      totalEmployees,
      activeClaimers,
      averageClaimAmount,
      approvalRate,
      monthlyTrend
    };
  }

  /**
   * Calculate approval metrics for manager
   */
  private async calculateApprovalMetrics(managerId: string): Promise<ApprovalMetrics> {
    const { data: approvals, error } = await supabase
      .from('expense_claims')
      .select('status, submitted_at, approved_at')
      .eq('approved_by', managerId);

    if (error) {
      return {
        totalApprovals: 0,
        averageApprovalTime: 0,
        rejectionRate: 0,
        pendingCount: 0
      };
    }

    const totalApprovals = approvals?.length || 0;
    const rejectedCount = approvals?.filter(a => a.status === 'rejected').length || 0;
    const rejectionRate = totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0;

    // Calculate average approval time
    const approvedClaims = approvals?.filter(a => a.approved_at && a.submitted_at) || [];
    let averageApprovalTime = 0;

    if (approvedClaims.length > 0) {
      const totalTime = approvedClaims.reduce((sum, claim) => {
        const submitted = new Date(claim.submitted_at).getTime();
        const approved = new Date(claim.approved_at).getTime();
        return sum + (approved - submitted);
      }, 0);

      averageApprovalTime = totalTime / approvedClaims.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Get pending count (claims waiting for this manager)
    const { data: manager } = await supabase
      .from('users')
      .select('department')
      .eq('id', managerId)
      .single();

    const { data: pendingClaims } = await supabase
      .from('expense_claims')
      .select('id')
      .eq('status', 'pending')
      .eq('department', manager?.department || '');

    const pendingCount = pendingClaims?.length || 0;

    return {
      totalApprovals,
      averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      pendingCount
    };
  }

  /**
   * Get manager notifications
   */
  private async getManagerNotifications(managerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', managerId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get team performance summary
   */
  async getTeamPerformance(managerId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: manager, error: managerError } = await supabase
        .from('users')
        .select('department')
        .eq('id', managerId)
        .single();

      if (managerError || !manager) {
        throw new Error('Manager not found');
      }

      // Get team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('department', manager.department)
        .neq('role', 'manager');

      if (teamError) throw teamError;

      // Get claims for each team member
      const teamPerformance = [];

      for (const member of teamMembers || []) {
        const { data: memberClaims, error: claimsError } = await supabase
          .from('expense_claims')
          .select('amount, status, submitted_at')
          .eq('employee_id', member.id);

        if (!claimsError && memberClaims) {
          const totalClaims = memberClaims.length;
          const approvedClaims = memberClaims.filter(c => c.status === 'approved').length;
          const totalAmount = memberClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
          const approvalRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;

          teamPerformance.push({
            id: member.id,
            name: member.name,
            email: member.email,
            totalClaims,
            totalAmount,
            approvalRate,
            averageClaimAmount: totalClaims > 0 ? totalAmount / totalClaims : 0
          });
        }
      }

      return { success: true, data: teamPerformance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get team performance'
      };
    }
  }

  /**
   * Get budget analysis for department
   */
  async getBudgetAnalysis(managerId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: manager, error: managerError } = await supabase
        .from('users')
        .select('department')
        .eq('id', managerId)
        .single();

      if (managerError || !manager) {
        throw new Error('Manager not found');
      }

      // Get department budget (if configured)
      const { data: budget, error: budgetError } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('department', manager.department)
        .single();

      // Get current year expenses
      const currentYear = new Date().getFullYear();
      const { data: expenses, error: expensesError } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, category')
        .eq('department', manager.department)
        .eq('status', 'approved')
        .gte('expense_date', `${currentYear}-01-01`)
        .lte('expense_date', `${currentYear}-12-31`);

      if (expensesError) throw expensesError;

      const totalSpent = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const budgetAllocated = budget?.annual_budget || totalSpent * 1.5; // Estimate if no budget

      // Monthly breakdown
      const monthlyBreakdown = {};
      (expenses || []).forEach(expense => {
        const month = new Date(expense.expense_date).getMonth() + 1;
        monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + (expense.amount || 0);
      });

      // Category breakdown
      const categoryBreakdown = {};
      (expenses || []).forEach(expense => {
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + (expense.amount || 0);
      });

      const analysis = {
        budgetAllocated,
        totalSpent,
        remaining: budgetAllocated - totalSpent,
        utilizationRate: budgetAllocated > 0 ? (totalSpent / budgetAllocated) * 100 : 0,
        monthlyBreakdown,
        categoryBreakdown,
        projectedYearEnd: this.projectYearEndSpending(expenses || []),
        status: this.getBudgetStatus(totalSpent, budgetAllocated)
      };

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get budget analysis'
      };
    }
  }

  /**
   * Project year-end spending
   */
  private projectYearEndSpending(expenses: any[]): number {
    const currentMonth = new Date().getMonth() + 1;
    const monthsElapsed = currentMonth;
    const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return monthsElapsed > 0 ? (totalSpent / monthsElapsed) * 12 : 0;
  }

  /**
   * Get budget status
   */
  private getBudgetStatus(spent: number, allocated: number): 'good' | 'warning' | 'over' {
    const utilization = allocated > 0 ? (spent / allocated) : 0;
    
    if (utilization > 1) return 'over';
    if (utilization > 0.8) return 'warning';
    return 'good';
  }
}

// Export singleton instance
export const employerDashboardService = new EmployerDashboardService();

// Export utility functions
export const getDashboardData = (managerId: string) => employerDashboardService.getDashboardData(managerId);
export const getTeamPerformance = (managerId: string) => employerDashboardService.getTeamPerformance(managerId);
export const getBudgetAnalysis = (managerId: string) => employerDashboardService.getBudgetAnalysis(managerId);