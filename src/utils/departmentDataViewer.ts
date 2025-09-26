import { supabase } from './supabase/client';

export interface DepartmentData {
  department: string;
  employeeCount: number;
  totalExpenses: number;
  averageExpensePerEmployee: number;
  monthlyBudget: number;
  budgetUtilization: number;
  topCategories: CategoryData[];
  recentActivity: ActivityData[];
}

export interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ActivityData {
  id: string;
  type: string;
  description: string;
  amount: number;
  employee: string;
  date: string;
}

/**
 * Logan Freights Department Data Viewer Service
 * Department-specific data analysis and visualization
 */
class DepartmentDataViewerService {
  
  /**
   * Get comprehensive department data
   */
  async getDepartmentData(department: string): Promise<{ success: boolean; data?: DepartmentData; error?: string }> {
    try {
      // Get employees in department
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, name')
        .eq('department', department);

      if (employeesError) throw employeesError;

      const employeeCount = employees?.length || 0;
      const employeeIds = employees?.map(e => e.id) || [];

      // Get expenses for department
      const { data: expenses, error: expensesError } = await supabase
        .from('expense_claims')
        .select('*')
        .in('employee_id', employeeIds.length > 0 ? employeeIds : ['']);

      if (expensesError) throw expensesError;

      const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const averageExpensePerEmployee = employeeCount > 0 ? totalExpenses / employeeCount : 0;

      // Get budget information
      const { data: budget, error: budgetError } = await supabase
        .from('department_budgets')
        .select('*')
        .eq('department', department)
        .single();

      const monthlyBudget = budget?.monthly_budget || totalExpenses * 1.2; // Estimate if no budget
      const budgetUtilization = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0;

      // Calculate top categories
      const topCategories = this.calculateTopCategories(expenses || []);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(employeeIds);

      const departmentData: DepartmentData = {
        department,
        employeeCount,
        totalExpenses,
        averageExpensePerEmployee,
        monthlyBudget,
        budgetUtilization,
        topCategories,
        recentActivity
      };

      return { success: true, data: departmentData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department data'
      };
    }
  }

  /**
   * Calculate top expense categories
   */
  private calculateTopCategories(expenses: any[]): CategoryData[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    expenses.forEach(expense => {
      const category = expense.category || 'Other';
      const current = categoryMap.get(category) || { amount: 0, count: 0 };
      current.amount += expense.amount || 0;
      current.count += 1;
      categoryMap.set(category, current);
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  /**
   * Get recent department activity
   */
  private async getRecentActivity(employeeIds: string[]): Promise<ActivityData[]> {
    try {
      if (employeeIds.length === 0) return [];

      const { data: activities, error } = await supabase
        .from('expense_claims')
        .select(`
          id,
          amount,
          category,
          description,
          status,
          submitted_at,
          users!expense_claims_employee_id_fkey(name)
        `)
        .in('employee_id', employeeIds)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (activities || []).map(activity => ({
        id: activity.id,
        type: 'expense_claim',
        description: `${activity.category} - ${activity.description}`,
        amount: activity.amount || 0,
        employee: activity.users?.name || 'Unknown',
        date: activity.submitted_at
      }));
    } catch (error) {
      console.warn('Failed to get recent activity:', error);
      return [];
    }
  }

  /**
   * Get department comparison data
   */
  async getDepartmentComparison(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: departments, error: deptError } = await supabase
        .from('users')
        .select('department')
        .not('department', 'is', null);

      if (deptError) throw deptError;

      const uniqueDepartments = [...new Set(departments?.map(d => d.department) || [])];
      const comparisons = [];

      for (const dept of uniqueDepartments) {
        const result = await this.getDepartmentData(dept);
        if (result.success && result.data) {
          comparisons.push(result.data);
        }
      }

      return { success: true, data: comparisons };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department comparison'
      };
    }
  }

  /**
   * Get department trends over time
   */
  async getDepartmentTrends(department: string, months: number = 6): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id')
        .eq('department', department);

      if (employeesError) throw employeesError;

      const employeeIds = employees?.map(e => e.id) || [];
      if (employeeIds.length === 0) {
        return { success: true, data: [] };
      }

      const { data: expenses, error: expensesError } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, category')
        .in('employee_id', employeeIds)
        .gte('expense_date', startDate.toISOString());

      if (expensesError) throw expensesError;

      // Group by month
      const monthlyData = new Map<string, { total: number; count: number; categories: Set<string> }>();

      (expenses || []).forEach(expense => {
        const date = new Date(expense.expense_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const current = monthlyData.get(monthKey) || { total: 0, count: 0, categories: new Set() };
        current.total += expense.amount || 0;
        current.count += 1;
        current.categories.add(expense.category);
        monthlyData.set(monthKey, current);
      });

      const trends = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        totalAmount: data.total,
        claimCount: data.count,
        averageAmount: data.count > 0 ? data.total / data.count : 0,
        categoryCount: data.categories.size
      })).sort((a, b) => a.month.localeCompare(b.month));

      return { success: true, data: trends };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department trends'
      };
    }
  }
}

// Export singleton instance
export const departmentDataViewerService = new DepartmentDataViewerService();

// Export utility functions
export const getDepartmentData = (department: string) => 
  departmentDataViewerService.getDepartmentData(department);
export const getDepartmentComparison = () => 
  departmentDataViewerService.getDepartmentComparison();
export const getDepartmentTrends = (department: string, months?: number) => 
  departmentDataViewerService.getDepartmentTrends(department, months);