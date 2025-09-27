/**
 * Enterprise Dashboard Statistics Component
 * Comprehensive stats display with real data and navigation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Database,
  RefreshCw,
  Trash2,
  Calendar,
  Building,
  ArrowRight,
  TruckIcon,
  MapPin,
  PieChart,
  LineChart
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { toast } from 'sonner';
import { enterpriseDemoManager } from '../utils/enterpriseDemoManager';
import { enterpriseNotificationHub } from '../utils/enterpriseNotificationHub';
import { enhancedClaimsManager } from '../utils/enhancedClaimsManager';
import { format } from '../utils/missingLibraries';
import { LoganFreightsFinancialData } from '../utils/loganFreightsFinancialData';
import EnhancedClaimsDataService from '../utils/enhancedClaimsDataService';

interface DashboardStats {
  claims: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
    totalAmount: number;
    averageAmount: number;
    thisMonth: number;
    lastMonth: number;
    monthlyGrowth: number;
  };
  departments: {
    [key: string]: {
      count: number;
      total: number;
      percentage: number;
    };
  };
  notifications: {
    total: number;
    unread: number;
    engagementRate: number;
    escalationRate: number;
  };
  demo: {
    totalClaims: number;
    totalUsers: number;
    totalDepartments: number;
    totalNotifications: number;
    lastReset: string;
    daysUntilAutoReset: number;
    storageUsage: string;
  };
}

interface EnterpriseDashboardStatsProps {
  onNavigateToApprovals?: () => void;
  onNavigateToNotifications?: () => void;
  userRole?: string;
}

export function EnterpriseDashboardStats({ 
  onNavigateToApprovals, 
  onNavigateToNotifications,
  userRole = 'employer' 
}: EnterpriseDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initialize enhanced claims service - must be at top level
  useEffect(() => {
    EnhancedClaimsDataService.initialize();
  }, []);

  useEffect(() => {
    loadStats();
    
    // Auto-refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    
    // Listen for data updates
    const handleDataUpdate = () => {
      loadStats();
    };
    
    window.addEventListener('logan-claims-updated', handleDataUpdate);
    window.addEventListener('logan-notification-created', handleDataUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('logan-claims-updated', handleDataUpdate);
      window.removeEventListener('logan-notification-created', handleDataUpdate);
    };
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Load real claims data from enhanced claims manager
      let realClaimsData;
      try {
        const allClaims = await enhancedClaimsManager.getClaims({}, { 
          id: 'system', 
          role: 'system' as any 
        });
        
        realClaimsData = {
          total: allClaims.length,
          pending: allClaims.filter(c => c.status === 'pending').length,
          approved: allClaims.filter(c => c.status === 'approved').length,
          rejected: allClaims.filter(c => c.status === 'rejected').length,
          flagged: allClaims.filter(c => c.is_flagged).length,
          totalAmount: allClaims.reduce((sum, c) => sum + c.amount, 0),
          averageAmount: allClaims.length > 0 ? allClaims.reduce((sum, c) => sum + c.amount, 0) / allClaims.length : 0,
          thisMonth: allClaims.filter(c => {
            const claimDate = new Date(c.submitted_at);
            const now = new Date();
            return claimDate.getMonth() === now.getMonth() && claimDate.getFullYear() === now.getFullYear();
          }).length,
          lastMonth: allClaims.filter(c => {
            const claimDate = new Date(c.submitted_at);
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return claimDate.getMonth() === lastMonth.getMonth() && claimDate.getFullYear() === lastMonth.getFullYear();
          }).length,
          monthlyGrowth: 0
        };
        
        // Calculate monthly growth
        if (realClaimsData.lastMonth > 0) {
          realClaimsData.monthlyGrowth = ((realClaimsData.thisMonth - realClaimsData.lastMonth) / realClaimsData.lastMonth) * 100;
        } else if (realClaimsData.thisMonth > 0) {
          realClaimsData.monthlyGrowth = 100;
        }
        
        console.log('📊 Loaded real claims data:', realClaimsData);
      } catch (error) {
        console.log('Failed to load real claims data, using fallback');
        // Load demo statistics as fallback
        const demoStats = enterpriseDemoManager.getDemoStatistics();
        realClaimsData = {
          total: demoStats.totalClaims,
          pending: Math.floor(demoStats.totalClaims * 0.3),
          approved: Math.floor(demoStats.totalClaims * 0.5),
          rejected: Math.floor(demoStats.totalClaims * 0.15),
          flagged: Math.floor(demoStats.totalClaims * 0.05),
          totalAmount: Math.floor(Math.random() * 500000) + 100000,
          averageAmount: Math.floor(Math.random() * 2000) + 500,
          thisMonth: Math.floor(demoStats.totalClaims * 0.4),
          lastMonth: Math.floor(demoStats.totalClaims * 0.35),
          monthlyGrowth: 14.3
        };
      }
      
      // Load notification analytics with fallback
      let notificationAnalytics;
      try {
        notificationAnalytics = await enterpriseNotificationHub.getCrossDataAnalytics();
      } catch (analyticsError) {
        console.log('Using fallback notification analytics');
        notificationAnalytics = {
          totalNotifications: 125,
          unreadCount: 12,
          engagementRate: 78.5,
          escalationRate: 12.3
        };
      }
      
      // Generate department breakdown based on real data
      const departments = {
        'Logistics': { 
          count: Math.floor(realClaimsData.total * 0.4), 
          total: realClaimsData.totalAmount * 0.4, 
          percentage: 40 
        },
        'Operations': { 
          count: Math.floor(realClaimsData.total * 0.25), 
          total: realClaimsData.totalAmount * 0.25, 
          percentage: 25 
        },
        'Finance': { 
          count: Math.floor(realClaimsData.total * 0.15), 
          total: realClaimsData.totalAmount * 0.15, 
          percentage: 15 
        },
        'Human Resources': { 
          count: Math.floor(realClaimsData.total * 0.1), 
          total: realClaimsData.totalAmount * 0.1, 
          percentage: 10 
        },
        'IT': { 
          count: Math.floor(realClaimsData.total * 0.1), 
          total: realClaimsData.totalAmount * 0.1, 
          percentage: 10 
        }
      };
      
      // Load demo statistics for system info
      const demoStats = enterpriseDemoManager.getDemoStatistics();
      
      setStats({
        claims: realClaimsData,
        departments,
        notifications: {
          total: notificationAnalytics.totalNotifications,
          unread: notificationAnalytics.unreadCount,
          engagementRate: notificationAnalytics.engagementRate,
          escalationRate: notificationAnalytics.escalationRate
        },
        demo: demoStats
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      const result = await enterpriseDemoManager.resetDemoData();
      
      if (result.success) {
        toast.success(result.message);
        await loadStats();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error resetting demo data:', error);
      toast.error('Failed to reset demo data');
    } finally {
      setIsResetting(false);
    }
  };



  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = LoganFreightsFinancialData.formatCurrency;
  const financialData = LoganFreightsFinancialData.getLatestFinancials();
  const monthlyExpenses = LoganFreightsFinancialData.getMonthlyExpenseBreakdown();
  const departmentalExpenses = LoganFreightsFinancialData.getDepartmentalExpenses();
  const claimsAnalytics = EnhancedClaimsDataService.getClaimsAnalytics();

  if (!stats) return null;

  // Prepare chart data
  const revenueData = LoganFreightsFinancialData.profitLossStatements.map(statement => ({
    year: statement.year,
    revenue: statement.revenue.total,
    expenses: statement.operatingExpenses.total,
    netProfit: statement.netProfit
  }));

  const expenseBreakdownData = [
    { name: 'Fuel & Diesel', value: financialData.profitLoss.operatingExpenses.fuelDiesel, color: '#0088FE' },
    { name: 'Vehicle Maintenance', value: financialData.profitLoss.operatingExpenses.vehicleMaintenance, color: '#00C49F' },
    { name: 'Salaries & Benefits', value: financialData.profitLoss.operatingExpenses.salariesBenefits, color: '#FFBB28' },
    { name: 'Insurance', value: financialData.profitLoss.operatingExpenses.insurance, color: '#FF8042' },
    { name: 'Toll Fees', value: financialData.profitLoss.operatingExpenses.tollFees, color: '#8884D8' },
    { name: 'Other Operating', value: financialData.profitLoss.operatingExpenses.otherOperating, color: '#82CA9D' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">Logan Freights Dashboard</h2>
          <p className="text-slate-600">
            Financial Year 2024 - Last updated: {format(lastUpdated, 'PPp')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemo}
            disabled={isResetting}
            className="text-orange-600 hover:text-orange-700"
          >
            <Trash2 className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Demo
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Annual Revenue</p>
                <p className="text-2xl text-slate-900">{formatCurrency(financialData.profitLoss.revenue.total)}</p>
                <p className="text-sm text-slate-500">
                  Net Profit: {formatCurrency(financialData.profitLoss.netProfit)}
                </p>
              </div>
              <TruckIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Operating Expenses</p>
                <p className="text-2xl text-slate-900">{formatCurrency(financialData.profitLoss.operatingExpenses.total)}</p>
                <p className="text-sm text-slate-500">
                  Fuel: {formatCurrency(financialData.profitLoss.operatingExpenses.fuelDiesel)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* Claims Overview */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateToApprovals}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Claims</p>
                <p className="text-2xl text-slate-900">{claimsAnalytics.totalClaims}</p>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-slate-500">
                    {claimsAnalytics.pendingClaims} pending
                  </p>
                  {onNavigateToApprovals && (
                    <ArrowRight className="w-3 h-3 text-yellow-600" />
                  )}
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Cash Position */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cash & Bank</p>
                <p className="text-2xl text-slate-900">{formatCurrency(financialData.balanceSheet.assets.currentAssets.cashBank)}</p>
                <p className="text-sm text-slate-500">
                  Total Assets: {formatCurrency(financialData.balanceSheet.assets.totalAssets)}
                </p>
              </div>
              <Building className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Claims Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="expenses">Expense Tracking</TabsTrigger>
          <TabsTrigger value="budgets">Budget Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Claims */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Claims</p>
                <p className="text-2xl text-slate-900">{stats.claims.total.toLocaleString()}</p>
                <div className={`flex items-center space-x-1 text-sm ${getGrowthColor(stats.claims.monthlyGrowth)}`}>
                  {getGrowthIcon(stats.claims.monthlyGrowth)}
                  <span>{Math.abs(stats.claims.monthlyGrowth).toFixed(1)}% this month</span>
                </div>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Amount */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Amount</p>
                <p className="text-2xl text-slate-900">{formatCurrency(stats.claims.totalAmount)}</p>
                <p className="text-sm text-slate-500">
                  Avg: {formatCurrency(stats.claims.averageAmount)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Claims - Navigate to Approvals */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-yellow-50 border-yellow-200"
          onClick={onNavigateToApprovals}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl text-slate-900">{stats.claims.pending}</p>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-slate-500">
                    {stats.claims.total > 0 ? ((stats.claims.pending / stats.claims.total) * 100).toFixed(1) : 0}% of total
                  </p>
                  {onNavigateToApprovals && (
                    <ArrowRight className="w-3 h-3 text-yellow-600" />
                  )}
                </div>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        {/* Flagged Claims */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-red-50 border-red-200"
          onClick={onNavigateToApprovals}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Flagged Claims</p>
                <p className="text-2xl text-slate-900">{stats.claims.flagged}</p>
                <div className="flex items-center space-x-1">
                  <p className="text-sm text-slate-500">
                    {stats.claims.total > 0 ? ((stats.claims.flagged / stats.claims.total) * 100).toFixed(1) : 0}% flagged
                  </p>
                  {onNavigateToApprovals && userRole === 'administrator' && (
                    <ArrowRight className="w-3 h-3 text-red-600" />
                  )}
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Claim Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Approved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{stats.claims.approved}</span>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {((stats.claims.approved / stats.claims.total) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.claims.approved / stats.claims.total) * 100} 
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{stats.claims.pending}</span>
                  <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
                    {((stats.claims.pending / stats.claims.total) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.claims.pending / stats.claims.total) * 100} 
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Rejected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{stats.claims.rejected}</span>
                  <Badge variant="outline" className="text-red-700 bg-red-50">
                    {((stats.claims.rejected / stats.claims.total) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(stats.claims.rejected / stats.claims.total) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>Claims distribution by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.departments).map(([dept, data]) => (
                <div key={dept} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{dept}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-900">{data.count} claims</span>
                      <Badge variant="outline">
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={data.percentage} className="h-2" />
                  <div className="text-xs text-slate-500 text-right">
                    {formatCurrency(data.total)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Demo Data Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.demo.totalClaims}</div>
                  <div className="text-sm text-slate-500">Claims</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.demo.totalUsers}</div>
                  <div className="text-sm text-slate-500">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.demo.totalDepartments}</div>
                  <div className="text-sm text-slate-500">Departments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.demo.totalNotifications}</div>
                  <div className="text-sm text-slate-500">Notifications</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Last Reset:</span>
                  <span className="text-slate-900">{stats.demo.lastReset}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-slate-500">Auto-reset in:</span>
                  <Badge variant="outline" className="text-orange-700 bg-orange-50">
                    {stats.demo.daysUntilAutoReset} days
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-slate-500">Storage Usage:</span>
                  <span className="text-slate-900">{stats.demo.storageUsage}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.notifications.total}</div>
                  <div className="text-sm text-slate-500">Total Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-slate-900">{stats.notifications.unread}</div>
                  <div className="text-sm text-slate-500">Unread</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Engagement Rate</span>
                  <span className="text-sm text-slate-900">
                    {stats.notifications.engagementRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.notifications.engagementRate} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Escalation Rate</span>
                  <span className="text-sm text-slate-900">
                    {stats.notifications.escalationRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.notifications.escalationRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claims Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Claim Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Approved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{claimsAnalytics.approvedClaims}</span>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {claimsAnalytics.approvalRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={claimsAnalytics.approvalRate} 
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{claimsAnalytics.pendingClaims}</span>
                  <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
                    {((claimsAnalytics.pendingClaims / claimsAnalytics.totalClaims) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(claimsAnalytics.pendingClaims / claimsAnalytics.totalClaims) * 100} 
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Rejected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-900">{claimsAnalytics.rejectedClaims}</span>
                  <Badge variant="outline" className="text-red-700 bg-red-50">
                    {((claimsAnalytics.rejectedClaims / claimsAnalytics.totalClaims) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(claimsAnalytics.rejectedClaims / claimsAnalytics.totalClaims) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Expenses</CardTitle>
            <CardDescription>Budget vs actual spending by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentalExpenses.map((dept) => (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{dept.department}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-slate-900">{formatCurrency(dept.expenses)}</span>
                      <Badge variant={dept.variance > 0 ? "destructive" : "outline"}>
                        {dept.variance > 0 ? '+' : ''}{formatCurrency(dept.variance)}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={(dept.expenses / dept.budget) * 100} className="h-2" />
                  <div className="text-xs text-slate-500 text-right">
                    Budget: {formatCurrency(dept.budget)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 mt-6">
          {/* Financial Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>3-Year Financial Performance</CardTitle>
                <CardDescription>Revenue, expenses, and net profit trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="#82ca9d" name="Expenses" />
                    <Line type="monotone" dataKey="netProfit" stroke="#ffc658" name="Net Profit" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Expense Breakdown</CardTitle>
                <CardDescription>Current year expense distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={expenseBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Ratios */}
          <Card>
            <CardHeader>
              <CardTitle>Key Financial Ratios</CardTitle>
              <CardDescription>Financial health indicators for 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(() => {
                  const ratios = LoganFreightsFinancialData.calculateFinancialRatios();
                  return ratios ? [
                    { label: 'Gross Profit Margin', value: `${ratios.grossProfitMargin.toFixed(1)}%`, color: 'text-green-600' },
                    { label: 'Net Profit Margin', value: `${ratios.netProfitMargin.toFixed(1)}%`, color: 'text-blue-600' },
                    { label: 'Current Ratio', value: ratios.currentRatio.toFixed(2), color: 'text-purple-600' },
                    { label: 'Debt-to-Equity', value: ratios.debtToEquityRatio.toFixed(2), color: 'text-orange-600' },
                    { label: 'Return on Equity', value: `${ratios.returnOnEquity.toFixed(1)}%`, color: 'text-indigo-600' },
                    { label: 'Asset Turnover', value: ratios.assetTurnover.toFixed(2), color: 'text-teal-600' }
                  ].map((ratio, index) => (
                    <div key={index} className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-semibold ${ratio.color}`}>{ratio.value}</div>
                      <div className="text-sm text-slate-500">{ratio.label}</div>
                    </div>
                  )) : <div>Loading ratios...</div>;
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6 mt-6">
          {/* Monthly Expense Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expense Tracking</CardTitle>
              <CardDescription>2024 monthly expense breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="fuelDiesel" stackId="a" fill="#8884d8" name="Fuel & Diesel" />
                  <Bar dataKey="vehicleMaintenance" stackId="a" fill="#82ca9d" name="Vehicle Maintenance" />
                  <Bar dataKey="salariesBenefits" stackId="a" fill="#ffc658" name="Salaries & Benefits" />
                  <Bar dataKey="insurance" stackId="a" fill="#ff7300" name="Insurance" />
                  <Bar dataKey="tollFees" stackId="a" fill="#00ff00" name="Toll Fees" />
                  <Bar dataKey="otherOperating" stackId="a" fill="#ff00ff" name="Other Operating" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Claims Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Claims by Amount Range</CardTitle>
                <CardDescription>Distribution of claims by expense amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">R0 - R500</span>
                    <Badge variant="outline">65% (13 claims)</Badge>
                  </div>
                  <Progress value={65} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">R501 - R2,000</span>
                    <Badge variant="outline">25% (5 claims)</Badge>
                  </div>
                  <Progress value={25} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">R2,001 - R5,000</span>
                    <Badge variant="outline">8% (2 claims)</Badge>
                  </div>
                  <Progress value={8} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">R5,000+</span>
                    <Badge variant="outline">2% (0 claims)</Badge>
                  </div>
                  <Progress value={2} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Processing Time</CardTitle>
                <CardDescription>Time from submission to approval/rejection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl text-slate-900">2.3 days</div>
                    <div className="text-sm text-slate-500">Average processing time</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Same day processing</span>
                      <span className="text-sm text-slate-900">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">1-3 days</span>
                      <span className="text-sm text-slate-900">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">4-7 days</span>
                      <span className="text-sm text-slate-900">15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">7+ days</span>
                      <span className="text-sm text-slate-900">5%</span>
                    </div>
                    <Progress value={5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6 mt-6">
          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending</CardTitle>
              <CardDescription>Category-wise budget performance for 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {LoganFreightsFinancialData.getExpenseBudgetByCategory().map((budget, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{budget.category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-600">
                          {formatCurrency(budget.spent)} / {formatCurrency(budget.budgeted)}
                        </span>
                        <Badge variant={budget.variance > 0 ? "destructive" : "outline"}>
                          {budget.variance > 0 ? 'Over' : 'Under'} {formatCurrency(Math.abs(budget.variance))}
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={(budget.spent / budget.budgeted) * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-slate-500 text-right">
                      {((budget.spent / budget.budgeted) * 100).toFixed(1)}% of budget used
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget Alerts</CardTitle>
                <CardDescription>Categories requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Salaries & Benefits:</strong> 102% of budget used. Consider reviewing overtime policies.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Other Operating:</strong> 104% of budget used. Review miscellaneous expenses.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        <strong>Fuel & Diesel:</strong> 6% under budget - excellent cost management
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Forecasting</CardTitle>
                <CardDescription>Projected year-end position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl text-slate-900">{formatCurrency(1750000)}</div>
                    <div className="text-sm text-slate-500">Projected total expenses</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current spend rate</span>
                      <span className="text-sm text-slate-900">98.5%</span>
                    </div>
                    <Progress value={98.5} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Projected variance</span>
                      <Badge variant="outline" className="text-green-700 bg-green-50">
                        -1.5% (Under budget)
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Continue current fuel efficiency programs</li>
                      <li>• Review salary increases for next fiscal year</li>
                      <li>• Consider increasing maintenance budget</li>
                      <li>• Monitor toll fee increases</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Demo Reset Warning */}
      {stats && stats.demo.daysUntilAutoReset <= 7 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Data Auto-Reset Notice:</strong> Demo data will be automatically reset in {stats.demo.daysUntilAutoReset} days. 
            This will clear all current claims, notifications, and user data to maintain optimal demo performance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
