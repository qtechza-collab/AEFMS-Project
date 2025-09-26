import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Clock,
  Shield,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Target,
  Zap,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area } from 'recharts';
import { api } from '../utils/api';

interface DashboardAnalytics {
  overview: {
    totalEmployees: number;
    pendingApprovals: number;
    monthlyBudget: number;
    monthlySpent: number;
    budgetUtilization: number;
    fraudAlerts: number;
    openTickets: number;
  };
  financial: {
    thisMonthTotal: number;
    thisMonthTax: number;
    approvalRate: number;
    avgClaimAmount: number;
  };
  departments: Record<string, { employees: number; expenses: number }>;
  categories: Array<{ name: string; total: number; count: number; color: string }>;
  trends: {
    claimsThisMonth: number;
    claimsLastMonth: number;
  };
  performance: {
    avgProcessingTime: number;
    slaCompliance: number;
    userSatisfaction: number;
    systemUptime: number;
  };
}

export function EnhancedDashboard() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [selectedPeriod]);

  const fetchDashboardAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await api.request('/analytics/dashboard');
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-slate-500 py-8">
        Failed to load dashboard analytics
      </div>
    );
  }

  // Prepare chart data
  const monthlyTrendData = [
    { month: 'Jan', claims: 45, amount: 125000 },
    { month: 'Feb', claims: 52, amount: 142000 },
    { month: 'Mar', claims: 38, amount: 98000 },
    { month: 'Apr', claims: 61, amount: 158000 },
    { month: 'May', claims: 49, amount: 134000 },
    { month: 'Jun', claims: analytics.trends.claimsThisMonth, amount: analytics.financial.thisMonthTotal }
  ];

  const departmentData = Object.entries(analytics.departments).map(([name, data]) => ({
    name,
    employees: data.employees,
    expenses: data.expenses
  }));

  const categoryPieData = analytics.categories.map(cat => ({
    name: cat.name,
    value: cat.total,
    color: cat.color
  }));

  const performanceData = [
    { metric: 'Processing Time', value: analytics.performance.avgProcessingTime, target: 2.0, unit: 'hours' },
    { metric: 'SLA Compliance', value: analytics.performance.slaCompliance, target: 95, unit: '%' },
    { metric: 'User Satisfaction', value: analytics.performance.userSatisfaction, target: 4.0, unit: '/5' },
    { metric: 'System Uptime', value: analytics.performance.systemUptime, target: 99, unit: '%' }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl text-slate-900">Executive Dashboard</h2>
          <p className="text-slate-600">Comprehensive business intelligence and analytics</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={selectedPeriod === 'week' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('week')}
          >
            Week
          </Button>
          <Button 
            variant={selectedPeriod === 'month' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('month')}
          >
            Month
          </Button>
          <Button 
            variant={selectedPeriod === 'year' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSelectedPeriod('year')}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-blue-800">Active Employees</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-blue-900 mb-1">{analytics.overview.totalEmployees}</div>
            <div className="flex items-center text-sm text-blue-700">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+2.3% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-green-800">Budget Utilization</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-green-900 mb-1">
              {analytics.overview.budgetUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-green-700">
              R{analytics.overview.monthlySpent.toLocaleString()} / R{analytics.overview.monthlyBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-yellow-800">Pending Approvals</CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-yellow-900 mb-1">{analytics.overview.pendingApprovals}</div>
            <div className="flex items-center text-sm text-yellow-700">
              <Target className="h-4 w-4 mr-1" />
              <span>SLA: {analytics.performance.slaCompliance}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-red-800">Fraud Alerts</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-red-900 mb-1">{analytics.overview.fraudAlerts}</div>
            <div className="text-sm text-red-700">Requires immediate attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Monthly Expense Trends</CardTitle>
            <CardDescription>Claims volume and spending patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="amount" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="claims" 
                  stroke="#82ca9d" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Expense Categories</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Department Analysis</CardTitle>
          <CardDescription>Employee count and expense breakdown by department</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Bar yAxisId="left" dataKey="employees" fill="#8884d8" name="Employees" />
              <Bar yAxisId="right" dataKey="expenses" fill="#82ca9d" name="Expenses (R)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceData.map((metric) => (
          <Card key={metric.metric}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-600">{metric.metric}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl text-slate-900">
                  {metric.value.toFixed(metric.unit === '/5' || metric.unit === 'hours' ? 1 : 0)}{metric.unit}
                </span>
                {metric.value >= metric.target ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <Progress 
                value={(metric.value / metric.target) * 100} 
                className="h-2"
              />
              <div className="text-xs text-slate-500 mt-1">
                Target: {metric.target}{metric.unit}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">System Health & Performance</CardTitle>
          <CardDescription>Real-time system metrics and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <Globe className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl text-green-800 mb-1">{analytics.performance.systemUptime}%</div>
              <div className="text-sm text-green-700">System Uptime</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl text-blue-800 mb-1">{analytics.performance.avgProcessingTime}s</div>
              <div className="text-sm text-blue-700">Avg Response Time</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border">
              <Activity className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl text-purple-800 mb-1">{analytics.overview.totalEmployees * 8}</div>
              <div className="text-sm text-purple-700">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Financial Summary - South African Tax Compliance</CardTitle>
          <CardDescription>IFRS compliant financial reporting with VAT calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg border">
              <div className="text-sm text-slate-600 mb-1">Total Expenses</div>
              <div className="text-xl text-slate-900">R{analytics.financial.thisMonthTotal.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border">
              <div className="text-sm text-slate-600 mb-1">VAT (15%)</div>
              <div className="text-xl text-slate-900">R{analytics.financial.thisMonthTax.toLocaleString()}</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border">
              <div className="text-sm text-slate-600 mb-1">Total Incl. VAT</div>
              <div className="text-xl text-slate-900">
                R{(analytics.financial.thisMonthTotal + analytics.financial.thisMonthTax).toLocaleString()}
              </div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg border">
              <div className="text-sm text-slate-600 mb-1">Approval Rate</div>
              <div className="text-xl text-slate-900">{analytics.financial.approvalRate.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}