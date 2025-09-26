import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Globe,
  PieChart,
  FileText,
  Calendar,
  TrendingDown,
  AlertCircle,
  Eye,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendsAnalysis } from './TrendsAnalysis';
import { api } from '../utils/api';

export function FinancialAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewReport, setPreviewReport] = useState<any>(null);

  // Mock data for charts
  const monthlyExpenseData = [
    { month: 'Jan', fuel: 12000, meals: 4500, accommodation: 8200, repairs: 3500, tolls: 2100 },
    { month: 'Feb', fuel: 13500, meals: 4800, accommodation: 7800, repairs: 4200, tolls: 2300 },
    { month: 'Mar', fuel: 11800, meals: 5200, accommodation: 9100, repairs: 2800, tolls: 2000 },
    { month: 'Apr', fuel: 14200, meals: 4900, accommodation: 8500, repairs: 5100, tolls: 2400 },
    { month: 'May', fuel: 13800, meals: 5100, accommodation: 7600, repairs: 3800, tolls: 2200 },
    { month: 'Jun', fuel: 15200, meals: 5400, accommodation: 8900, repairs: 4500, tolls: 2600 }
  ];

  const categoryDistribution = [
    { name: 'Fuel', value: 45, amount: 89400, color: '#dc2626' },
    { name: 'Accommodation', value: 25, amount: 49700, color: '#7c3aed' },
    { name: 'Meals', value: 15, amount: 29800, color: '#059669' },
    { name: 'Repairs', value: 10, amount: 19900, color: '#2563eb' },
    { name: 'Toll Gates', value: 5, amount: 9950, color: '#ea580c' }
  ];

  const budgetVsActual = [
    { category: 'Fuel', budget: 95000, actual: 89400, variance: -5600 },
    { category: 'Accommodation', budget: 45000, actual: 49700, variance: 4700 },
    { category: 'Meals', budget: 32000, actual: 29800, variance: -2200 },
    { category: 'Repairs', budget: 25000, actual: 19900, variance: -5100 },
    { category: 'Toll Gates', budget: 12000, actual: 9950, variance: -2050 }
  ];

  // Mock report data
  const reportTemplates = {
    'SOPLOCI': {
      name: 'Statement of Profit or Loss and OCI (SOPLOCI)',
      description: 'Comprehensive income statement following IFRS standards',
      data: {
        revenue: 2456000,
        operatingExpenses: 1987400,
        grossProfit: 468600,
        netIncome: 298750,
        eps: 4.82
      }
    },
    'SOFP': {
      name: 'Statement of Financial Position (SOFP)',
      description: 'Balance sheet showing assets, liabilities, and equity',
      data: {
        totalAssets: 3450000,
        currentAssets: 1567000,
        totalLiabilities: 1890000,
        equity: 1560000
      }
    },
    'SOCE': {
      name: 'Statement of Changes in Equity (SOCE)',
      description: 'Changes in ownership equity during the reporting period',
      data: {
        openingEquity: 1345000,
        netIncome: 298750,
        dividends: 83750,
        closingEquity: 1560000
      }
    },
    'SOCF': {
      name: 'Statement of Cash Flows (SOCF)',
      description: 'Cash receipts and cash payments during the reporting period',
      data: {
        operatingCashFlow: 456780,
        investingCashFlow: -123450,
        financingCashFlow: -89340,
        netCashFlow: 243990
      }
    }
  };

  const handleDownloadReport = async (reportType: string, format: 'excel' | 'pdf' | 'csv' = 'excel') => {
    setIsDownloading(true);
    
    try {
      if (format === 'excel' || format === 'pdf') {
        // Use API for Excel/PDF generation
        const blob = await api.downloadFinancialReport(reportType, format);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`${reportType} ${format.toUpperCase()} downloaded successfully!`);
      } else {
        // Generate CSV locally
        const reportData = reportTemplates[reportType as keyof typeof reportTemplates];
        if (reportData) {
          let csvContent = `${reportData.name}\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
          
          Object.entries(reportData.data).forEach(([key, value]) => {
            csvContent += `${key.charAt(0).toUpperCase() + key.slice(1)},${typeof value === 'number' ? `R${value.toLocaleString()}` : value}\n`;
          });
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success(`${reportData.name} downloaded successfully!`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewReport = (reportType: string) => {
    const reportData = reportTemplates[reportType as keyof typeof reportTemplates];
    if (reportData) {
      setPreviewReport({ type: reportType, ...reportData });
    } else {
      toast.info('Report preview not available for this type.');
    }
  };

  const totalBudget = budgetVsActual.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = budgetVsActual.reduce((sum, item) => sum + item.actual, 0);
  const totalVariance = totalBudget - totalActual;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="mr-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl text-slate-900">Financial Analytics</h2>
            <p className="text-slate-600">Comprehensive financial insights and reporting</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleDownloadReport('monthly')}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Exporting...' : 'Export Reports'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Budget</p>
                <p className="text-2xl text-slate-900">R{totalBudget.toLocaleString()}</p>
              </div>
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Actual Spent</p>
                <p className="text-2xl text-slate-900">R{totalActual.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Variance</p>
                <p className={`text-2xl ${totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R{Math.abs(totalVariance).toLocaleString()}
                </p>
              </div>
              {totalVariance >= 0 ? 
                <TrendingUp className="w-8 h-8 text-green-500" /> :
                <TrendingDown className="w-8 h-8 text-red-500" />
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Budget Utilization</p>
                <p className="text-2xl text-slate-900">{Math.round((totalActual / totalBudget) * 100)}%</p>
              </div>
              <PieChart className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="budget">Budget Analysis</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <TrendsAnalysis />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Monthly Expense Breakdown</CardTitle>
                <CardDescription>Expenses by category over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`R${Number(value).toLocaleString()}`, '']} />
                    <Bar dataKey="fuel" stackId="a" fill="#dc2626" />
                    <Bar dataKey="accommodation" stackId="a" fill="#7c3aed" />
                    <Bar dataKey="meals" stackId="a" fill="#059669" />
                    <Bar dataKey="repairs" stackId="a" fill="#2563eb" />
                    <Bar dataKey="tolls" stackId="a" fill="#ea580c" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Expense Distribution</CardTitle>
                <CardDescription>Current month category breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {categoryDistribution.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded mr-2" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-slate-900">R{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Budget vs Actual Analysis</CardTitle>
              <CardDescription>Compare budgeted amounts against actual spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {budgetVsActual.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-slate-700">{item.category}</h4>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-slate-500">
                          Budget: R{item.budget.toLocaleString()}
                        </span>
                        <span className={`text-sm ${item.actual < item.budget ? 'text-green-600' : 'text-red-600'}`}>
                          Actual: R{item.actual.toLocaleString()}
                        </span>
                        <Badge 
                          variant={item.actual < item.budget ? "secondary" : "destructive"}
                          className={item.actual < item.budget ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {item.variance >= 0 ? '+' : ''}R{item.variance.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={(item.actual / item.budget) * 100} className="h-4" />
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-white">
                        {Math.round((item.actual / item.budget) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IFRS Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">IFRS Financial Statements</CardTitle>
                <CardDescription>Download official financial reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(reportTemplates).map(([key, report]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm text-slate-900">{report.name}</h4>
                        <p className="text-xs text-slate-500">{report.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewReport(key)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{report.name}</DialogTitle>
                              <DialogDescription>{report.description}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm text-slate-700 mb-2">Key Figures (As of {new Date().toLocaleDateString()})</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {Object.entries(report.data).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-sm text-slate-600">
                                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                                      </span>
                                      <span className="text-sm text-slate-900">
                                        {typeof value === 'number' ? `R${value.toLocaleString()}` : value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDownloadReport(key, 'excel')}
                                  disabled={isDownloading}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Excel
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDownloadReport(key, 'pdf')}
                                  disabled={isDownloading}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => handleDownloadReport(key, 'csv')}
                                  disabled={isDownloading}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  CSV
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReport(key, 'excel')}
                            disabled={isDownloading}
                            title="Download Excel"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReport(key, 'pdf')}
                            disabled={isDownloading}
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Management Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Management Reports</CardTitle>
                <CardDescription>Internal analysis and operational reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: 'expense-summary', name: 'Monthly Expense Summary', icon: BarChart3 },
                    { key: 'employee-analysis', name: 'Employee Expense Analysis', icon: TrendingUp },
                    { key: 'budget-variance', name: 'Budget Variance Report', icon: AlertCircle },
                    { key: 'fraud-summary', name: 'Fraud Detection Summary', icon: AlertCircle }
                  ].map((report) => (
                    <div key={report.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <report.icon className="w-4 h-4 text-slate-600" />
                        <span className="text-sm text-slate-900">{report.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toast.info('Report preview will be available in full version')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReport(report.key, 'excel')}
                            disabled={isDownloading}
                            title="Download Excel"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReport(report.key, 'pdf')}
                            disabled={isDownloading}
                            title="Download PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Company Overview</CardTitle>
              <CardDescription>Logan Freights Logistics CC - Key Information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h4 className="text-slate-700">Registration Details</h4>
                  <p className="text-sm text-slate-600">Registration: 2015/123456/23</p>
                  <p className="text-sm text-slate-600">VAT Number: 4567891234</p>
                  <p className="text-sm text-slate-600">Location: Durban, KZN</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-700">Fleet Information</h4>
                  <p className="text-sm text-slate-600">Total Vehicles: 23</p>
                  <p className="text-sm text-slate-600">Active Routes: 15</p>
                  <p className="text-sm text-slate-600">Coverage: National</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-700">Financial Period</h4>
                  <p className="text-sm text-slate-600">Year End: 28 February</p>
                  <p className="text-sm text-slate-600">Current Period: 2025</p>
                  <p className="text-sm text-slate-600">Currency: ZAR</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-700">Performance Metrics</h4>
                  <p className="text-sm text-slate-600">On-time Delivery: 98.5%</p>
                  <p className="text-sm text-slate-600">Cost Efficiency: 92%</p>
                  <p className="text-sm text-slate-600">Customer Satisfaction: 4.8/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}