import { supabase } from './supabase/client';
import { dataService } from './supabaseDataService';

export interface FinancialMetrics {
  totalExpenses: number;
  monthlyExpenses: number;
  yearlyExpenses: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  averageClaimAmount: number;
  expenseGrowthRate: number;
}

export interface CategoryAnalysis {
  category: string;
  amount: number;
  percentage: number;
  claimCount: number;
  averageAmount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendData {
  period: string;
  totalAmount: number;
  claimCount: number;
  averageAmount: number;
  approvalRate: number;
}

export interface BudgetAnalysis {
  department: string;
  budgetAllocated: number;
  budgetUsed: number;
  budgetRemaining: number;
  utilizationRate: number;
  projectedOverrun: number;
}

/**
 * Logan Freights Financial Analytics Service
 * Advanced financial analysis and reporting for expense management
 */
class FinancialAnalyticsService {
  
  /**
   * Get comprehensive financial metrics
   */
  async getFinancialMetrics(): Promise<{ success: boolean; data?: FinancialMetrics; error?: string }> {
    try {
      // Get all claims
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('amount, status, expense_date, submitted_at');

      if (claimsError) throw claimsError;

      const allClaims = claims || [];
      
      // Calculate date ranges
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Filter claims by periods
      const thisMonthClaims = allClaims.filter(c => new Date(c.expense_date) >= currentMonth);
      const thisYearClaims = allClaims.filter(c => new Date(c.expense_date) >= currentYear);
      const lastMonthClaims = allClaims.filter(c => {
        const date = new Date(c.expense_date);
        return date >= lastMonth && date <= lastMonthEnd;
      });

      // Calculate totals
      const totalExpenses = allClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
      const monthlyExpenses = thisMonthClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
      const yearlyExpenses = thisYearClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
      const lastMonthExpenses = lastMonthClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

      // Calculate by status
      const pendingAmount = allClaims.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.amount || 0), 0);
      const approvedAmount = allClaims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.amount || 0), 0);
      const rejectedAmount = allClaims.filter(c => c.status === 'rejected').reduce((sum, c) => sum + (c.amount || 0), 0);

      // Calculate growth rate
      const expenseGrowthRate = lastMonthExpenses > 0 
        ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

      const metrics: FinancialMetrics = {
        totalExpenses,
        monthlyExpenses,
        yearlyExpenses,
        pendingAmount,
        approvedAmount,
        rejectedAmount,
        averageClaimAmount: allClaims.length > 0 ? totalExpenses / allClaims.length : 0,
        expenseGrowthRate: Math.round(expenseGrowthRate * 100) / 100
      };

      return { success: true, data: metrics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get financial metrics'
      };
    }
  }

  /**
   * Get category-wise analysis
   */
  async getCategoryAnalysis(): Promise<{ success: boolean; data?: CategoryAnalysis[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('category, amount, expense_date')
        .eq('status', 'approved');

      if (error) throw error;

      const categoryMap = new Map<string, { amount: number; count: number; trend: number[] }>();
      const totalAmount = (claims || []).reduce((sum, c) => sum + (c.amount || 0), 0);

      // Group by category and calculate trends
      (claims || []).forEach(claim => {
        const category = claim.category;
        const current = categoryMap.get(category) || { amount: 0, count: 0, trend: [] };
        
        current.amount += claim.amount || 0;
        current.count++;
        
        // Add to trend data (simplified - by month)
        const month = new Date(claim.expense_date).getMonth();
        current.trend[month] = (current.trend[month] || 0) + (claim.amount || 0);
        
        categoryMap.set(category, current);
      });

      const analysis: CategoryAnalysis[] = Array.from(categoryMap.entries()).map(([category, data]) => {
        // Calculate trend (simplified)
        const recentTrend = data.trend.slice(-3).reduce((a, b) => a + (b || 0), 0);
        const earlierTrend = data.trend.slice(-6, -3).reduce((a, b) => a + (b || 0), 0);
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentTrend > earlierTrend * 1.1) trend = 'up';
        else if (recentTrend < earlierTrend * 0.9) trend = 'down';

        return {
          category,
          amount: data.amount,
          percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
          claimCount: data.count,
          averageAmount: data.count > 0 ? data.amount / data.count : 0,
          trend
        };
      }).sort((a, b) => b.amount - a.amount);

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category analysis'
      };
    }
  }

  /**
   * Get expense trends over time
   */
  async getExpenseTrends(months: number = 12): Promise<{ success: boolean; data?: TrendData[]; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, status')
        .gte('expense_date', startDate.toISOString());

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, { total: number; count: number; approved: number }>();

      (claims || []).forEach(claim => {
        const date = new Date(claim.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const current = monthlyData.get(monthKey) || { total: 0, count: 0, approved: 0 };
        current.total += claim.amount || 0;
        current.count++;
        if (claim.status === 'approved') current.approved++;

        monthlyData.set(monthKey, current);
      });

      const trends: TrendData[] = Array.from(monthlyData.entries())
        .map(([period, data]) => ({
          period,
          totalAmount: data.total,
          claimCount: data.count,
          averageAmount: data.count > 0 ? data.total / data.count : 0,
          approvalRate: data.count > 0 ? (data.approved / data.count) * 100 : 0
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get expense trends'
      };
    }
  }

  /**
   * Get budget analysis by department
   */
  async getBudgetAnalysis(): Promise<{ success: boolean; data?: BudgetAnalysis[]; error?: string }> {
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
        .gte('expense_date', `${currentYear}-01-01`)
        .lte('expense_date', `${currentYear}-12-31`);

      if (expenseError) throw expenseError;

      // Group expenses by department
      const departmentExpenses = new Map<string, number>();
      (expenses || []).forEach(expense => {
        const dept = expense.department;
        departmentExpenses.set(dept, (departmentExpenses.get(dept) || 0) + (expense.amount || 0));
      });

      // Create analysis
      const analysis: BudgetAnalysis[] = [];

      // If budgets exist, use them
      if (!budgetError && budgets && budgets.length > 0) {
        budgets.forEach(budget => {
          const used = departmentExpenses.get(budget.department) || 0;
          const allocated = budget.annual_budget || 0;
          const remaining = Math.max(0, allocated - used);
          const utilizationRate = allocated > 0 ? (used / allocated) * 100 : 0;
          
          // Simple projection based on current rate
          const monthsElapsed = new Date().getMonth() + 1;
          const projectedYearlyUsage = (used / monthsElapsed) * 12;
          const projectedOverrun = Math.max(0, projectedYearlyUsage - allocated);

          analysis.push({
            department: budget.department,
            budgetAllocated: allocated,
            budgetUsed: used,
            budgetRemaining: remaining,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            projectedOverrun: Math.round(projectedOverrun)
          });
        });
      } else {
        // If no budgets configured, show department expenses with estimated budgets
        departmentExpenses.forEach((used, department) => {
          const estimatedBudget = used * 1.5; // Rough estimate
          
          analysis.push({
            department,
            budgetAllocated: estimatedBudget,
            budgetUsed: used,
            budgetRemaining: estimatedBudget - used,
            utilizationRate: (used / estimatedBudget) * 100,
            projectedOverrun: 0 // Can't calculate without proper budget
          });
        });
      }

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get budget analysis'
      };
    }
  }

  /**
   * Get expense forecast
   */
  async getExpenseForecast(months: number = 6): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Get historical data for forecasting
      const historicalMonths = 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - historicalMonths);

      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, expense_date')
        .eq('status', 'approved')
        .gte('expense_date', startDate.toISOString());

      if (error) throw error;

      // Group by month
      const monthlyTotals: number[] = [];
      const monthlyMap = new Map<string, number>();

      (claims || []).forEach(claim => {
        const date = new Date(claim.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (claim.amount || 0));
      });

      // Convert to array for trend calculation
      Array.from(monthlyMap.values()).forEach(total => monthlyTotals.push(total));

      // Simple linear trend forecast
      const forecast = [];
      const average = monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length;
      
      // Calculate trend slope (simplified)
      let trend = 0;
      if (monthlyTotals.length >= 2) {
        const recent = monthlyTotals.slice(-3);
        const earlier = monthlyTotals.slice(-6, -3);
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
        trend = (recentAvg - earlierAvg) / 3; // Monthly trend
      }

      // Generate forecast
      for (let i = 1; i <= months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        const forecastAmount = Math.max(0, average + (trend * i));
        
        forecast.push({
          period: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
          forecastAmount: Math.round(forecastAmount),
          confidence: Math.max(60, 90 - (i * 5)), // Confidence decreases over time
          type: 'forecast'
        });
      }

      return { success: true, data: forecast };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate expense forecast'
      };
    }
  }

  /**
   * Get cost center analysis
   */
  async getCostCenterAnalysis(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('department, category, amount, employee_id')
        .eq('status', 'approved');

      if (error) throw error;

      const costCenters = new Map<string, Map<string, number>>();

      (claims || []).forEach(claim => {
        const department = claim.department;
        const category = claim.category;
        
        if (!costCenters.has(department)) {
          costCenters.set(department, new Map());
        }
        
        const deptCategories = costCenters.get(department)!;
        deptCategories.set(category, (deptCategories.get(category) || 0) + (claim.amount || 0));
      });

      const analysis = Array.from(costCenters.entries()).map(([department, categories]) => {
        const totalAmount = Array.from(categories.values()).reduce((sum, amount) => sum + amount, 0);
        const categoryBreakdown = Array.from(categories.entries()).map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / totalAmount) * 100
        }));

        return {
          department,
          totalAmount,
          categoryBreakdown: categoryBreakdown.sort((a, b) => b.amount - a.amount)
        };
      });

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cost center analysis'
      };
    }
  }
}

// Export singleton instance
export const financialAnalyticsService = new FinancialAnalyticsService();

// Export utility functions
export const getFinancialMetrics = () => financialAnalyticsService.getFinancialMetrics();
export const getCategoryAnalysis = () => financialAnalyticsService.getCategoryAnalysis();
export const getExpenseTrends = (months?: number) => financialAnalyticsService.getExpenseTrends(months);
export const getBudgetAnalysis = () => financialAnalyticsService.getBudgetAnalysis();
export const getExpenseForecast = (months?: number) => financialAnalyticsService.getExpenseForecast(months);
export const getCostCenterAnalysis = () => financialAnalyticsService.getCostCenterAnalysis();