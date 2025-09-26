import { supabase } from './supabase/client';
import { dataService } from './supabaseDataService';

export interface TrendAnalysisData {
  expenseTrends: ExpenseTrend[];
  categoryTrends: CategoryTrend[];
  departmentTrends: DepartmentTrend[];
  seasonalPatterns: SeasonalPattern[];
  predictiveAnalysis: PredictiveAnalysis;
}

export interface ExpenseTrend {
  period: string;
  amount: number;
  claimCount: number;
  averageAmount: number;
  growthRate: number;
  variance: number;
}

export interface CategoryTrend {
  category: string;
  currentMonth: number;
  previousMonth: number;
  growthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast: number;
}

export interface DepartmentTrend {
  department: string;
  monthlyAverage: number;
  currentTrend: 'up' | 'down' | 'stable';
  efficiency: number;
  budgetUtilization: number;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  averageExpenses: number;
  typicalCategories: string[];
  variationIndex: number;
}

export interface PredictiveAnalysis {
  nextMonthForecast: number;
  nextQuarterForecast: number;
  confidenceLevel: number;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * Logan Freights Trends Analysis Service
 * Advanced expense trend analysis and forecasting
 */
class TrendsAnalysisService {
  
  /**
   * Get comprehensive trends analysis
   */
  async getTrendsAnalysis(months: number = 12): Promise<{ success: boolean; data?: TrendAnalysisData; error?: string }> {
    try {
      // Get historical data
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('*')
        .gte('expense_date', startDate.toISOString())
        .eq('status', 'approved')
        .order('expense_date', { ascending: true });

      if (error) throw error;

      const expenseTrends = await this.calculateExpenseTrends(claims || []);
      const categoryTrends = await this.calculateCategoryTrends(claims || []);
      const departmentTrends = await this.calculateDepartmentTrends(claims || []);
      const seasonalPatterns = await this.calculateSeasonalPatterns(claims || []);
      const predictiveAnalysis = await this.generatePredictiveAnalysis(claims || []);

      const analysisData: TrendAnalysisData = {
        expenseTrends,
        categoryTrends,
        departmentTrends,
        seasonalPatterns,
        predictiveAnalysis
      };

      return { success: true, data: analysisData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get trends analysis'
      };
    }
  }

  /**
   * Calculate expense trends over time
   */
  private async calculateExpenseTrends(claims: any[]): Promise<ExpenseTrend[]> {
    const monthlyData = new Map<string, { amount: number; count: number }>();

    // Group claims by month
    claims.forEach(claim => {
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const current = monthlyData.get(monthKey) || { amount: 0, count: 0 };
      current.amount += claim.amount || 0;
      current.count += 1;
      monthlyData.set(monthKey, current);
    });

    // Convert to trend array and calculate growth rates
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const trends: ExpenseTrend[] = [];

    sortedMonths.forEach((period, index) => {
      const data = monthlyData.get(period)!;
      const averageAmount = data.count > 0 ? data.amount / data.count : 0;
      
      // Calculate growth rate
      let growthRate = 0;
      if (index > 0) {
        const previousPeriod = sortedMonths[index - 1];
        const previousData = monthlyData.get(previousPeriod)!;
        const previousAmount = previousData.amount;
        
        if (previousAmount > 0) {
          growthRate = ((data.amount - previousAmount) / previousAmount) * 100;
        }
      }

      // Calculate variance (simplified)
      const variance = this.calculateVariance(claims, period);

      trends.push({
        period,
        amount: data.amount,
        claimCount: data.count,
        averageAmount,
        growthRate: Math.round(growthRate * 100) / 100,
        variance
      });
    });

    return trends;
  }

  /**
   * Calculate category trends
   */
  private async calculateCategoryTrends(claims: any[]): Promise<CategoryTrend[]> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Group by category and month
    const currentMonthData = new Map<string, number>();
    const previousMonthData = new Map<string, number>();

    claims.forEach(claim => {
      const claimDate = new Date(claim.expense_date);
      const category = claim.category;
      const amount = claim.amount || 0;

      if (claimDate >= currentMonth) {
        currentMonthData.set(category, (currentMonthData.get(category) || 0) + amount);
      } else if (claimDate >= previousMonth && claimDate <= previousMonthEnd) {
        previousMonthData.set(category, (previousMonthData.get(category) || 0) + amount);
      }
    });

    // Calculate trends
    const allCategories = new Set([...currentMonthData.keys(), ...previousMonthData.keys()]);
    const trends: CategoryTrend[] = [];

    allCategories.forEach(category => {
      const currentMonth = currentMonthData.get(category) || 0;
      const previousMonth = previousMonthData.get(category) || 0;
      
      let growthRate = 0;
      if (previousMonth > 0) {
        growthRate = ((currentMonth - previousMonth) / previousMonth) * 100;
      }

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (growthRate > 10) trend = 'increasing';
      else if (growthRate < -10) trend = 'decreasing';

      // Simple forecast (can be enhanced with ML)
      const forecast = currentMonth + (currentMonth * (growthRate / 100));

      trends.push({
        category,
        currentMonth,
        previousMonth,
        growthRate: Math.round(growthRate * 100) / 100,
        trend,
        forecast: Math.max(0, forecast)
      });
    });

    return trends.sort((a, b) => b.currentMonth - a.currentMonth);
  }

  /**
   * Calculate department trends
   */
  private async calculateDepartmentTrends(claims: any[]): Promise<DepartmentTrend[]> {
    const departmentData = new Map<string, { amounts: number[]; totalAmount: number; claimCount: number }>();
    const monthsToAnalyze = 6;

    // Group by department
    claims.forEach(claim => {
      const department = claim.department;
      const amount = claim.amount || 0;
      
      if (!departmentData.has(department)) {
        departmentData.set(department, { amounts: [], totalAmount: 0, claimCount: 0 });
      }
      
      const data = departmentData.get(department)!;
      data.amounts.push(amount);
      data.totalAmount += amount;
      data.claimCount += 1;
    });

    // Calculate trends
    const trends: DepartmentTrend[] = [];

    departmentData.forEach((data, department) => {
      const monthlyAverage = data.totalAmount / Math.min(monthsToAnalyze, 12);
      
      // Determine trend direction (simplified)
      const recentHalf = data.amounts.slice(-Math.floor(data.amounts.length / 2));
      const earlierHalf = data.amounts.slice(0, Math.floor(data.amounts.length / 2));
      
      const recentAvg = recentHalf.reduce((sum, amt) => sum + amt, 0) / recentHalf.length;
      const earlierAvg = earlierHalf.reduce((sum, amt) => sum + amt, 0) / earlierHalf.length;
      
      let currentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvg > earlierAvg * 1.1) currentTrend = 'up';
      else if (recentAvg < earlierAvg * 0.9) currentTrend = 'down';

      // Calculate efficiency (claims per amount ratio)
      const efficiency = data.claimCount > 0 ? data.totalAmount / data.claimCount : 0;

      // Simplified budget utilization (would need actual budget data)
      const estimatedBudget = monthlyAverage * 12;
      const budgetUtilization = estimatedBudget > 0 ? (data.totalAmount / estimatedBudget) * 100 : 0;

      trends.push({
        department,
        monthlyAverage,
        currentTrend,
        efficiency,
        budgetUtilization: Math.min(100, budgetUtilization)
      });
    });

    return trends.sort((a, b) => b.monthlyAverage - a.monthlyAverage);
  }

  /**
   * Calculate seasonal patterns
   */
  private async calculateSeasonalPatterns(claims: any[]): Promise<SeasonalPattern[]> {
    const monthlyData = new Map<number, { totalAmount: number; count: number; categories: Map<string, number> }>();

    // Initialize all months
    for (let i = 1; i <= 12; i++) {
      monthlyData.set(i, { totalAmount: 0, count: 0, categories: new Map() });
    }

    // Group by month across all years
    claims.forEach(claim => {
      const month = new Date(claim.expense_date).getMonth() + 1;
      const category = claim.category;
      const amount = claim.amount || 0;

      const data = monthlyData.get(month)!;
      data.totalAmount += amount;
      data.count += 1;
      data.categories.set(category, (data.categories.get(category) || 0) + amount);
    });

    // Calculate patterns
    const patterns: SeasonalPattern[] = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Calculate average for variation index
    const allAmounts = Array.from(monthlyData.values()).map(d => d.totalAmount);
    const overallAverage = allAmounts.reduce((sum, amt) => sum + amt, 0) / 12;

    monthlyData.forEach((data, month) => {
      const averageExpenses = data.totalAmount;
      
      // Get top categories for this month
      const sortedCategories = Array.from(data.categories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

      // Calculate variation index
      const variationIndex = overallAverage > 0 ? (averageExpenses / overallAverage) : 1;

      patterns.push({
        month,
        monthName: monthNames[month - 1],
        averageExpenses,
        typicalCategories: sortedCategories,
        variationIndex: Math.round(variationIndex * 100) / 100
      });
    });

    return patterns;
  }

  /**
   * Generate predictive analysis
   */
  private async generatePredictiveAnalysis(claims: any[]): Promise<PredictiveAnalysis> {
    if (claims.length === 0) {
      return {
        nextMonthForecast: 0,
        nextQuarterForecast: 0,
        confidenceLevel: 0,
        riskFactors: ['Insufficient historical data'],
        recommendations: ['Collect more expense data for accurate forecasting']
      };
    }

    // Group by month for trend analysis
    const monthlyTotals: number[] = [];
    const monthlyData = new Map<string, number>();

    claims.forEach(claim => {
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + (claim.amount || 0));
    });

    const sortedMonths = Array.from(monthlyData.keys()).sort();
    sortedMonths.forEach(month => {
      monthlyTotals.push(monthlyData.get(month)!);
    });

    // Simple linear trend forecast
    const recentMonths = monthlyTotals.slice(-6); // Last 6 months
    const average = recentMonths.reduce((sum, val) => sum + val, 0) / recentMonths.length;
    
    // Calculate trend
    let trend = 0;
    if (recentMonths.length >= 3) {
      const recent = recentMonths.slice(-3);
      const earlier = recentMonths.slice(-6, -3);
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
      trend = (recentAvg - earlierAvg) / 3; // Monthly trend
    }

    const nextMonthForecast = Math.max(0, average + trend);
    const nextQuarterForecast = Math.max(0, (average + trend) * 3);

    // Calculate confidence level
    const variance = this.calculateArrayVariance(recentMonths);
    const confidenceLevel = Math.max(60, Math.min(95, 90 - (variance / average) * 100));

    // Identify risk factors
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (trend > average * 0.1) {
      riskFactors.push('Rapidly increasing expense trend');
      recommendations.push('Review expense policies and approval thresholds');
    }

    if (variance > average * 0.5) {
      riskFactors.push('High expense volatility');
      recommendations.push('Implement more consistent expense management practices');
    }

    const currentMonth = new Date().getMonth() + 1;
    if ([11, 12, 1].includes(currentMonth)) { // Holiday season
      riskFactors.push('Holiday season expense increase expected');
      recommendations.push('Plan for seasonal expense variations');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring expense trends');
      recommendations.push('Maintain current expense management practices');
    }

    return {
      nextMonthForecast: Math.round(nextMonthForecast),
      nextQuarterForecast: Math.round(nextQuarterForecast),
      confidenceLevel: Math.round(confidenceLevel),
      riskFactors,
      recommendations
    };
  }

  /**
   * Calculate variance for a period
   */
  private calculateVariance(claims: any[], period: string): number {
    const periodClaims = claims.filter(claim => {
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === period;
    });

    if (periodClaims.length === 0) return 0;

    const amounts = periodClaims.map(c => c.amount || 0);
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const squaredDiffs = amounts.map(amt => Math.pow(amt - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / amounts.length;

    return Math.round(variance);
  }

  /**
   * Calculate variance for array of values
   */
  private calculateArrayVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;

    return variance;
  }

  /**
   * Get expense growth analysis
   */
  async getExpenseGrowthAnalysis(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('amount, expense_date, department, category')
        .eq('status', 'approved')
        .order('expense_date', { ascending: true });

      if (error) throw error;

      const analysis = {
        overallGrowth: this.calculateOverallGrowth(claims || []),
        departmentGrowth: this.calculateDepartmentGrowth(claims || []),
        categoryGrowth: this.calculateCategoryGrowth(claims || []),
        monthlyGrowthRates: this.calculateMonthlyGrowthRates(claims || [])
      };

      return { success: true, data: analysis };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get growth analysis'
      };
    }
  }

  /**
   * Calculate overall expense growth
   */
  private calculateOverallGrowth(claims: any[]): any {
    if (claims.length === 0) return { growthRate: 0, trend: 'stable' };

    const monthlyTotals = new Map<string, number>();
    claims.forEach(claim => {
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + (claim.amount || 0));
    });

    const sortedMonths = Array.from(monthlyTotals.keys()).sort();
    if (sortedMonths.length < 2) return { growthRate: 0, trend: 'stable' };

    const firstMonth = monthlyTotals.get(sortedMonths[0])!;
    const lastMonth = monthlyTotals.get(sortedMonths[sortedMonths.length - 1])!;

    const growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
    const trend = growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

    return { growthRate: Math.round(growthRate * 100) / 100, trend };
  }

  /**
   * Calculate department growth rates
   */
  private calculateDepartmentGrowth(claims: any[]): any[] {
    const departmentData = new Map<string, Map<string, number>>();

    claims.forEach(claim => {
      const department = claim.department;
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!departmentData.has(department)) {
        departmentData.set(department, new Map());
      }

      const deptMonths = departmentData.get(department)!;
      deptMonths.set(monthKey, (deptMonths.get(monthKey) || 0) + (claim.amount || 0));
    });

    return Array.from(departmentData.entries()).map(([department, monthlyData]) => {
      const sortedMonths = Array.from(monthlyData.keys()).sort();
      if (sortedMonths.length < 2) return { department, growthRate: 0, trend: 'stable' };

      const firstMonth = monthlyData.get(sortedMonths[0])!;
      const lastMonth = monthlyData.get(sortedMonths[sortedMonths.length - 1])!;
      const growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
      const trend = growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

      return {
        department,
        growthRate: Math.round(growthRate * 100) / 100,
        trend
      };
    });
  }

  /**
   * Calculate category growth rates
   */
  private calculateCategoryGrowth(claims: any[]): any[] {
    // Similar to department growth but for categories
    const categoryData = new Map<string, Map<string, number>>();

    claims.forEach(claim => {
      const category = claim.category;
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!categoryData.has(category)) {
        categoryData.set(category, new Map());
      }

      const catMonths = categoryData.get(category)!;
      catMonths.set(monthKey, (catMonths.get(monthKey) || 0) + (claim.amount || 0));
    });

    return Array.from(categoryData.entries()).map(([category, monthlyData]) => {
      const sortedMonths = Array.from(monthlyData.keys()).sort();
      if (sortedMonths.length < 2) return { category, growthRate: 0, trend: 'stable' };

      const firstMonth = monthlyData.get(sortedMonths[0])!;
      const lastMonth = monthlyData.get(sortedMonths[sortedMonths.length - 1])!;
      const growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
      const trend = growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

      return {
        category,
        growthRate: Math.round(growthRate * 100) / 100,
        trend
      };
    });
  }

  /**
   * Calculate monthly growth rates
   */
  private calculateMonthlyGrowthRates(claims: any[]): any[] {
    const monthlyTotals = new Map<string, number>();
    claims.forEach(claim => {
      const date = new Date(claim.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + (claim.amount || 0));
    });

    const sortedMonths = Array.from(monthlyTotals.entries()).sort(([a], [b]) => a.localeCompare(b));
    const growthRates = [];

    for (let i = 1; i < sortedMonths.length; i++) {
      const [currentMonth, currentAmount] = sortedMonths[i];
      const [previousMonth, previousAmount] = sortedMonths[i - 1];
      
      const growthRate = previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
      
      growthRates.push({
        month: currentMonth,
        amount: currentAmount,
        growthRate: Math.round(growthRate * 100) / 100
      });
    }

    return growthRates;
  }
}

// Export singleton instance
export const trendsAnalysisService = new TrendsAnalysisService();

// Export utility functions
export const getTrendsAnalysis = (months?: number) => trendsAnalysisService.getTrendsAnalysis(months);
export const getExpenseGrowthAnalysis = () => trendsAnalysisService.getExpenseGrowthAnalysis();