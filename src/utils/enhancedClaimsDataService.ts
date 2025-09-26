import { dataService } from './supabaseDataService';
import type { ExpenseClaim } from './supabaseDataService';

/**
 * Enhanced Claims Data Service for Logan Freights
 * Provides advanced analytics, caching, and optimized data operations
 */
class EnhancedClaimsDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get enhanced user claims with caching and analytics
   */
  async getUserClaimsEnhanced(userId: string): Promise<{
    success: boolean;
    data?: ExpenseClaim[];
    analytics?: {
      totalClaims: number;
      pendingClaims: number;
      approvedClaims: number;
      rejectedClaims: number;
      totalAmount: number;
      approvedAmount: number;
      averageClaimAmount: number;
      monthlyTrend: { month: string; amount: number; count: number }[];
    };
    error?: string;
  }> {
    try {
      const cacheKey = `user-claims-${userId}`;
      const cached = this.getCachedData(cacheKey);
      
      if (cached) {
        console.log('🚀 Enhanced Claims Service: Using cached data for user', userId);
        return cached;
      }

      // Fetch claims using the base data service
      const result = await dataService.getUserExpenseClaims(userId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to fetch claims' };
      }

      const claims = result.data;

      // Generate enhanced analytics
      const analytics = this.generateClaimsAnalytics(claims);

      const enhancedResult = {
        success: true,
        data: claims,
        analytics
      };

      // Cache the result
      this.setCachedData(cacheKey, enhancedResult);

      console.log(`📊 Enhanced Claims: Loaded ${claims.length} claims with analytics for user ${userId}`);
      return enhancedResult;

    } catch (error) {
      console.error('Enhanced Claims Service Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate comprehensive analytics from claims data
   */
  private generateClaimsAnalytics(claims: ExpenseClaim[]) {
    const totalClaims = claims.length;
    const pendingClaims = claims.filter(c => c.status === 'pending').length;
    const approvedClaims = claims.filter(c => c.status === 'approved').length;
    const rejectedClaims = claims.filter(c => c.status === 'rejected').length;
    
    const totalAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
    const approvedAmount = claims
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    
    const averageClaimAmount = totalClaims > 0 ? totalAmount / totalClaims : 0;

    // Generate monthly trend data
    const monthlyData = new Map<string, { amount: number; count: number }>();
    
    claims.forEach(claim => {
      const date = new Date(claim.expense_date || claim.submitted_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = monthlyData.get(monthKey) || { amount: 0, count: 0 };
      existing.amount += claim.amount || 0;
      existing.count += 1;
      monthlyData.set(monthKey, existing);
    });

    const monthlyTrend = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    return {
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      totalAmount,
      approvedAmount,
      averageClaimAmount,
      monthlyTrend
    };
  }

  /**
   * Get claims by category with analytics
   */
  async getClaimsByCategory(userId: string): Promise<{
    success: boolean;
    data?: { category: string; amount: number; count: number; avgAmount: number }[];
    error?: string;
  }> {
    try {
      const result = await this.getUserClaimsEnhanced(userId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const categoryMap = new Map<string, { amount: number; count: number }>();
      
      result.data.forEach(claim => {
        const category = claim.category || 'Uncategorized';
        const existing = categoryMap.get(category) || { amount: 0, count: 0 };
        existing.amount += claim.amount || 0;
        existing.count += 1;
        categoryMap.set(category, existing);
      });

      const categoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        avgAmount: data.count > 0 ? data.amount / data.count : 0
      }));

      return { success: true, data: categoryData };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get category data' 
      };
    }
  }

  /**
   * Clear cache for specific user or all users
   */
  clearCache(userId?: string): void {
    if (userId) {
      const cacheKey = `user-claims-${userId}`;
      this.cache.delete(cacheKey);
      console.log(`🗑️ Cache cleared for user ${userId}`);
    } else {
      this.cache.clear();
      console.log('🗑️ All cache cleared');
    }
  }

  /**
   * Get dashboard summary with enhanced metrics
   */
  async getDashboardSummary(userId: string): Promise<{
    success: boolean;
    data?: {
      pendingClaims: number;
      approvedClaims: number;
      totalApproved: number;
      spent: number;
      receiptsUploaded: number;
      monthlyLimit: number;
      utilizationPercentage: number;
      averageProcessingTime: number;
      complianceScore: number;
    };
    error?: string;
  }> {
    try {
      const result = await this.getUserClaimsEnhanced(userId);
      
      if (!result.success || !result.analytics) {
        return { success: false, error: result.error };
      }

      const analytics = result.analytics;
      const monthlyLimit = 5000; // Default limit for Logan Freights employees
      
      // Calculate additional metrics
      const utilizationPercentage = Math.min((analytics.totalAmount / monthlyLimit) * 100, 100);
      const averageProcessingTime = 2.5; // Days - placeholder for real calculation
      const complianceScore = this.calculateComplianceScore(result.data || []);

      const summary = {
        pendingClaims: analytics.pendingClaims,
        approvedClaims: analytics.approvedClaims,
        totalApproved: analytics.approvedAmount,
        spent: analytics.totalAmount,
        receiptsUploaded: analytics.totalClaims,
        monthlyLimit,
        utilizationPercentage,
        averageProcessingTime,
        complianceScore
      };

      return { success: true, data: summary };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get dashboard summary' 
      };
    }
  }

  /**
   * Calculate compliance score based on claim quality
   */
  private calculateComplianceScore(claims: ExpenseClaim[]): number {
    if (claims.length === 0) return 100;

    let score = 100;
    let penalties = 0;

    claims.forEach(claim => {
      // Penalty for missing receipts
      if (!claim.receipt_files || claim.receipt_files.length === 0) {
        penalties += 5;
      }

      // Penalty for incomplete descriptions
      if (!claim.description || claim.description.length < 10) {
        penalties += 3;
      }

      // Penalty for late submissions (more than 30 days)
      const expenseDate = new Date(claim.expense_date);
      const submittedDate = new Date(claim.submitted_at);
      const daysDiff = (submittedDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        penalties += 10;
      }

      // Bonus for having all required fields
      if (claim.vendor && claim.category && claim.payment_method) {
        penalties -= 1; // Small bonus
      }
    });

    score = Math.max(0, score - penalties);
    return Math.min(100, score);
  }

  /**
   * Get recent activity with enhanced formatting
   */
  async getRecentActivity(userId: string, limit: number = 5): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      category: string;
      amount: number;
      status: string;
      date: string;
      currency: string;
      formattedAmount: string;
      daysAgo: number;
      statusColor: string;
    }>;
    error?: string;
  }> {
    try {
      const result = await this.getUserClaimsEnhanced(userId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const recentClaims = result.data
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, limit)
        .map(claim => {
          const submittedDate = new Date(claim.submitted_at);
          const now = new Date();
          const daysAgo = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const statusColors = {
            'approved': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'rejected': 'bg-red-100 text-red-800',
            'under_review': 'bg-blue-100 text-blue-800'
          };

          return {
            id: claim.id,
            category: claim.category || 'Unknown',
            amount: claim.amount || 0,
            status: claim.status,
            date: claim.expense_date,
            currency: claim.currency || 'ZAR',
            formattedAmount: `R ${(claim.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            daysAgo,
            statusColor: statusColors[claim.status] || statusColors['pending']
          };
        });

      return { success: true, data: recentClaims };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get recent activity' 
      };
    }
  }
}

// Export singleton instance
export const enhancedClaimsService = new EnhancedClaimsDataService();

// Default export for compatibility
export default enhancedClaimsService;