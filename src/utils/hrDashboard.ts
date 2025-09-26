import { supabase } from './supabase/client';
import { dataService } from './supabaseDataService';

export interface HRDashboardData {
  totalEmployees: number;
  activeEmployees: number;
  totalClaims: number;
  totalExpenses: number;
  departmentStats: DepartmentStats[];
  complianceMetrics: ComplianceMetrics;
  recentHires: EmployeeInfo[];
  expenseOverview: ExpenseOverview;
}

export interface DepartmentStats {
  department: string;
  employeeCount: number;
  avgExpensePerEmployee: number;
  totalExpenses: number;
  complianceScore: number;
}

export interface ComplianceMetrics {
  overallScore: number;
  policyViolations: number;
  pendingTraining: number;
  auditFindings: number;
  lastAuditDate: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  hireDate: string;
  status: string;
}

export interface ExpenseOverview {
  monthlyTotal: number;
  yearlyTotal: number;
  averagePerEmployee: number;
  topSpendingDepartments: Array<{ department: string; amount: number }>;
}

/**
 * Logan Freights HR Dashboard Service
 * HR-specific analytics and employee management functionality
 */
class HRDashboardService {
  
  /**
   * Get complete HR dashboard data
   */
  async getHRDashboardData(): Promise<{ success: boolean; data?: HRDashboardData; error?: string }> {
    try {
      // Get employee statistics
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('*');

      if (employeesError) throw employeesError;

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(e => e.status === 'active' || !e.status).length || 0;

      // Get expense claims
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('*');

      if (claimsError) throw claimsError;

      const totalClaims = claims?.length || 0;
      const totalExpenses = claims?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Calculate department stats
      const departmentStats = await this.calculateDepartmentStats(employees || [], claims || []);

      // Get compliance metrics
      const complianceMetrics = await this.getComplianceMetrics();

      // Get recent hires (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentHires = (employees || [])
        .filter(e => new Date(e.created_at || e.hire_date) >= thirtyDaysAgo)
        .map(e => ({
          id: e.id,
          name: e.name,
          email: e.email,
          department: e.department,
          position: e.position || 'Employee',
          hireDate: e.hire_date || e.created_at,
          status: e.status || 'active'
        }));

      // Calculate expense overview
      const expenseOverview = await this.calculateExpenseOverview(claims || [], employees || []);

      const dashboardData: HRDashboardData = {
        totalEmployees,
        activeEmployees,
        totalClaims,
        totalExpenses,
        departmentStats,
        complianceMetrics,
        recentHires,
        expenseOverview
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get HR dashboard data'
      };
    }
  }

  /**
   * Calculate department statistics
   */
  private async calculateDepartmentStats(employees: any[], claims: any[]): Promise<DepartmentStats[]> {
    const departmentMap = new Map<string, {
      employeeCount: number;
      totalExpenses: number;
      claimCount: number;
      violations: number;
    }>();

    // Initialize departments from employees
    employees.forEach(employee => {
      const dept = employee.department;
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          employeeCount: 0,
          totalExpenses: 0,
          claimCount: 0,
          violations: 0
        });
      }
      departmentMap.get(dept)!.employeeCount++;
    });

    // Add claim data
    claims.forEach(claim => {
      const dept = claim.department;
      if (departmentMap.has(dept)) {
        const stats = departmentMap.get(dept)!;
        stats.totalExpenses += claim.amount || 0;
        stats.claimCount++;
        if (claim.flagged_for_review || claim.status === 'rejected') {
          stats.violations++;
        }
      }
    });

    return Array.from(departmentMap.entries()).map(([department, stats]) => ({
      department,
      employeeCount: stats.employeeCount,
      avgExpensePerEmployee: stats.employeeCount > 0 ? stats.totalExpenses / stats.employeeCount : 0,
      totalExpenses: stats.totalExpenses,
      complianceScore: stats.claimCount > 0 ? Math.max(0, 100 - (stats.violations / stats.claimCount * 100)) : 100
    }));
  }

  /**
   * Get compliance metrics
   */
  private async getComplianceMetrics(): Promise<ComplianceMetrics> {
    try {
      // Get policy violations (flagged claims)
      const { data: violations, error: violationsError } = await supabase
        .from('expense_claims')
        .select('id')
        .eq('flagged_for_review', true);

      // Get training records (if available)
      const { data: training, error: trainingError } = await supabase
        .from('employee_training')
        .select('employee_id')
        .eq('completed', false);

      // Get audit findings (if available)
      const { data: audits, error: auditsError } = await supabase
        .from('audit_findings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      const policyViolations = violations?.length || 0;
      const pendingTraining = training?.length || 0;
      const auditFindings = audits?.length || 0;
      const lastAuditDate = audits?.[0]?.created_at || new Date().toISOString();

      // Calculate overall compliance score
      const totalEmployees = 100; // Rough estimate
      const violationRate = totalEmployees > 0 ? (policyViolations / totalEmployees) * 100 : 0;
      const trainingRate = totalEmployees > 0 ? (pendingTraining / totalEmployees) * 100 : 0;
      
      const overallScore = Math.max(0, 100 - violationRate - trainingRate);

      return {
        overallScore: Math.round(overallScore),
        policyViolations,
        pendingTraining,
        auditFindings,
        lastAuditDate
      };
    } catch (error) {
      // Return default metrics if database queries fail
      return {
        overallScore: 85,
        policyViolations: 0,
        pendingTraining: 0,
        auditFindings: 0,
        lastAuditDate: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate expense overview
   */
  private async calculateExpenseOverview(claims: any[], employees: any[]): Promise<ExpenseOverview> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = new Date(now.getFullYear(), 0, 1);

    // Filter claims by time period
    const monthlyClaims = claims.filter(c => new Date(c.expense_date) >= currentMonth);
    const yearlyClaims = claims.filter(c => new Date(c.expense_date) >= currentYear);

    const monthlyTotal = monthlyClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
    const yearlyTotal = yearlyClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
    const averagePerEmployee = employees.length > 0 ? yearlyTotal / employees.length : 0;

    // Calculate top spending departments
    const departmentSpending = new Map<string, number>();
    yearlyClaims.forEach(claim => {
      const dept = claim.department;
      departmentSpending.set(dept, (departmentSpending.get(dept) || 0) + (claim.amount || 0));
    });

    const topSpendingDepartments = Array.from(departmentSpending.entries())
      .map(([department, amount]) => ({ department, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      monthlyTotal,
      yearlyTotal,
      averagePerEmployee,
      topSpendingDepartments
    };
  }

  /**
   * Get employee performance reports
   */
  async getEmployeePerformanceReports(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, name, department, created_at');

      if (employeesError) throw employeesError;

      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('employee_id, amount, status, submitted_at, approved_at');

      if (claimsError) throw claimsError;

      const reports = (employees || []).map(employee => {
        const employeeClaims = (claims || []).filter(c => c.employee_id === employee.id);
        const totalClaims = employeeClaims.length;
        const approvedClaims = employeeClaims.filter(c => c.status === 'approved').length;
        const totalAmount = employeeClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

        // Calculate average processing time
        const processedClaims = employeeClaims.filter(c => c.approved_at);
        const avgProcessingTime = processedClaims.length > 0
          ? processedClaims.reduce((sum, c) => {
              const submitted = new Date(c.submitted_at).getTime();
              const approved = new Date(c.approved_at).getTime();
              return sum + (approved - submitted) / (1000 * 60 * 60 * 24);
            }, 0) / processedClaims.length
          : 0;

        return {
          employeeId: employee.id,
          name: employee.name,
          department: employee.department,
          totalClaims,
          approvedClaims,
          approvalRate: totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0,
          totalAmount,
          averageClaimAmount: totalClaims > 0 ? totalAmount / totalClaims : 0,
          averageProcessingTime: Math.round(avgProcessingTime * 10) / 10
        };
      });

      return { success: true, data: reports };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get performance reports'
      };
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const complianceMetrics = await this.getComplianceMetrics();
      
      // Get detailed violation data
      const { data: violations, error: violationsError } = await supabase
        .from('expense_claims')
        .select(`
          id, employee_id, amount, category, flagged_for_review, status,
          users!expense_claims_employee_id_fkey(name, department)
        `)
        .eq('flagged_for_review', true);

      if (violationsError) throw violationsError;

      const report = {
        summary: complianceMetrics,
        violations: (violations || []).map(v => ({
          claimId: v.id,
          employeeName: v.users?.name || 'Unknown',
          department: v.users?.department || 'Unknown',
          amount: v.amount,
          category: v.category,
          status: v.status
        })),
        recommendations: [
          'Conduct regular expense policy training',
          'Implement automated policy checking',
          'Review high-risk categories monthly',
          'Establish clear escalation procedures'
        ],
        generatedAt: new Date().toISOString()
      };

      return { success: true, data: report };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate compliance report'
      };
    }
  }

  /**
   * Get department budget utilization
   */
  async getDepartmentBudgetUtilization(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Get department budgets (if configured)
      const { data: budgets, error: budgetError } = await supabase
        .from('department_budgets')
        .select('*');

      // Get current year expenses by department
      const currentYear = new Date().getFullYear();
      const { data: expenses, error: expenseError } = await supabase
        .from('expense_claims')
        .select('department, amount')
        .eq('status', 'approved')
        .gte('expense_date', `${currentYear}-01-01`);

      if (expenseError) throw expenseError;

      // Group expenses by department
      const departmentExpenses = new Map<string, number>();
      (expenses || []).forEach(expense => {
        const dept = expense.department;
        departmentExpenses.set(dept, (departmentExpenses.get(dept) || 0) + (expense.amount || 0));
      });

      const utilization = Array.from(departmentExpenses.entries()).map(([department, spent]) => {
        const budget = (budgets || []).find(b => b.department === department);
        const allocated = budget?.annual_budget || spent * 1.5; // Estimate if no budget
        
        return {
          department,
          budgetAllocated: allocated,
          budgetSpent: spent,
          budgetRemaining: Math.max(0, allocated - spent),
          utilizationRate: (spent / allocated) * 100,
          status: spent > allocated ? 'over_budget' : spent > allocated * 0.8 ? 'warning' : 'good'
        };
      });

      return { success: true, data: utilization };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get budget utilization'
      };
    }
  }
}

// Export singleton instance
export const hrDashboardService = new HRDashboardService();

// Export utility functions
export const getHRDashboardData = () => hrDashboardService.getHRDashboardData();
export const getEmployeePerformanceReports = () => hrDashboardService.getEmployeePerformanceReports();
export const generateComplianceReport = () => hrDashboardService.generateComplianceReport();
export const getDepartmentBudgetUtilization = () => hrDashboardService.getDepartmentBudgetUtilization();