import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
  TrendingUp,
  DollarSign,
  Building,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingDown,
  Eye,
  Filter
} from 'lucide-react';
import { dataStore } from '../utils/dataStore';
import { ImageViewer } from './ImageViewer';

interface DepartmentSummary {
  department: string;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  employeeCount: number;
  claimCount: number;
  averageClaimAmount: number;
  flaggedClaims: number;
}

interface CategorySummary {
  category: string;
  totalAmount: number;
  claimCount: number;
  averageAmount: number;
  topEmployee: string;
  topAmount: number;
}

interface EmployeeExpenseSummary {
  employee_id: string;
  employee_name: string;
  department: string;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  claimCount: number;
  averageClaimAmount: number;
  flaggedClaims: number;
  lastClaimDate: string;
}

export function HRExpenseAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [departmentData, setDepartmentData] = useState<DepartmentSummary[]>([]);
  const [categoryData, setCategoryData] = useState<CategorySummary[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeExpenseSummary[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<{url: string, filename: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    
    // Subscribe to real-time updates
    const unsubscribe = dataStore.subscribe('claims:updated', () => {
      fetchAnalytics();
    });

    return unsubscribe;
  }, [selectedTimeframe, selectedDepartment]);

  const fetchAnalytics = () => {
    setIsLoading(true);
    try {
      const analyticsData = dataStore.getAnalytics();
      const allClaims = dataStore.getClaims();
      const allEmployees = dataStore.getEmployees();
      
      setAnalytics(analyticsData);

      // Process department data
      const deptData: DepartmentSummary[] = Object.entries(analyticsData.byDepartment).map(([dept, data]: [string, any]) => {
        const deptEmployees = allEmployees.filter(emp => emp.department === dept);
        return {
          department: dept,
          totalAmount: data.total,
          approvedAmount: data.approved,
          pendingAmount: data.pending,
          rejectedAmount: data.rejected,
          employeeCount: deptEmployees.length,
          claimCount: data.count,
          averageClaimAmount: data.total / data.count,
          flaggedClaims: allClaims.filter(c => c.department === dept && c.is_flagged).length
        };
      });
      setDepartmentData(deptData.sort((a, b) => b.totalAmount - a.totalAmount));

      // Process category data
      const catData: CategorySummary[] = Object.entries(analyticsData.byCategory).map(([category, data]: [string, any]) => {
        const categoryClaims = allClaims.filter(c => c.category === category);
        const topClaim = categoryClaims.reduce((max, claim) => 
          claim.amount > max.amount ? claim : max, categoryClaims[0] || { amount: 0, employee_name: 'N/A' }
        );
        
        return {
          category,
          totalAmount: data.total,
          claimCount: data.count,
          averageAmount: data.total / data.count,
          topEmployee: topClaim.employee_name,
          topAmount: topClaim.amount
        };
      });
      setCategoryData(catData.sort((a, b) => b.totalAmount - a.totalAmount));

      // Process employee data
      const empData: EmployeeExpenseSummary[] = allEmployees.map(employee => {
        const empClaims = allClaims.filter(c => c.employee_id === employee.id);
        const approvedClaims = empClaims.filter(c => c.status === 'approved');
        const pendingClaims = empClaims.filter(c => c.status === 'pending');
        const flaggedClaims = empClaims.filter(c => c.is_flagged);
        const totalAmount = empClaims.reduce((sum, c) => sum + c.amount, 0);
        const approvedAmount = approvedClaims.reduce((sum, c) => sum + c.amount, 0);
        const pendingAmount = pendingClaims.reduce((sum, c) => sum + c.amount, 0);
        const lastClaim = empClaims.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];

        return {
          employee_id: employee.id,
          employee_name: employee.name,
          department: employee.department,
          totalAmount,
          approvedAmount,
          pendingAmount,
          claimCount: empClaims.length,
          averageClaimAmount: empClaims.length > 0 ? totalAmount / empClaims.length : 0,
          flaggedClaims: flaggedClaims.length,
          lastClaimDate: lastClaim ? lastClaim.submitted_at : 'Never'
        };
      }).filter(emp => emp.claimCount > 0);
      setEmployeeData(empData.sort((a, b) => b.totalAmount - a.totalAmount));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString()}`;
  };

  const exportToCSV = () => {
    // Create CSV data based on current view
    let csvData: string = '';
    let filename: string = '';

    if (activeView === 'departments') {
      csvData = [
        ['Department', 'Total Amount', 'Approved', 'Pending', 'Rejected', 'Employees', 'Claims', 'Avg Claim', 'Flagged'].join(','),
        ...departmentData.map(dept => [
          dept.department,
          dept.totalAmount.toFixed(2),
          dept.approvedAmount.toFixed(2),
          dept.pendingAmount.toFixed(2),
          dept.rejectedAmount.toFixed(2),
          dept.employeeCount,
          dept.claimCount,
          dept.averageClaimAmount.toFixed(2),
          dept.flaggedClaims
        ].join(','))
      ].join('\n');
      filename = 'department_expense_analysis.csv';
    } else if (activeView === 'employees') {
      csvData = [
        ['Employee', 'Department', 'Total Amount', 'Approved', 'Pending', 'Claims', 'Avg Claim', 'Flagged', 'Last Claim'].join(','),
        ...employeeData.map(emp => [
          emp.employee_name,
          emp.department,
          emp.totalAmount.toFixed(2),
          emp.approvedAmount.toFixed(2),
          emp.pendingAmount.toFixed(2),
          emp.claimCount,
          emp.averageClaimAmount.toFixed(2),
          emp.flaggedClaims,
          emp.lastClaimDate === 'Never' ? 'Never' : new Date(emp.lastClaimDate).toLocaleDateString()
        ].join(','))
      ].join('\n');
      filename = 'employee_expense_analysis.csv';
    } else {
      csvData = [
        ['Category', 'Total Amount', 'Claims', 'Average', 'Top Employee', 'Top Amount'].join(','),
        ...categoryData.map(cat => [
          cat.category,
          cat.totalAmount.toFixed(2),
          cat.claimCount,
          cat.averageAmount.toFixed(2),
          cat.topEmployee,
          cat.topAmount.toFixed(2)
        ].join(','))
      ].join('\n');
      filename = 'category_expense_analysis.csv';
    }

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewClaimDetails = (employeeId: string) => {
    const claims = dataStore.getClaims({ employee_id: employeeId });
    if (claims.length > 0) {
      setSelectedClaim(claims[0]);
    }
  };

  const viewImage = (url: string, filename: string) => {
    setSelectedImage({ url, filename });
  };

  if (isLoading || !analytics) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
        <p className="text-slate-600 mt-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-slate-900">Expense Analytics & Organization Overview</h2>
          <p className="text-slate-600">Comprehensive expense analysis and organizational financial responsibilities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Expenses</p>
                <p className="text-2xl text-slate-900">{formatCurrency(analytics.summary.totalAmount)}</p>
                <p className="text-xs text-slate-500">{analytics.summary.totalClaims} claims</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved Amount</p>
                <p className="text-2xl text-slate-900">{formatCurrency(analytics.summary.approvedAmount)}</p>
                <p className="text-xs text-slate-500">{analytics.summary.approvedClaims} approved</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl text-slate-900">{formatCurrency(analytics.summary.pendingAmount)}</p>
                <p className="text-xs text-slate-500">{analytics.summary.pendingClaims} pending</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rejection Rate</p>
                <p className="text-2xl text-slate-900">
                  {analytics.summary.totalClaims > 0 
                    ? Math.round((analytics.summary.rejectedClaims / analytics.summary.totalClaims) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-slate-500">{analytics.summary.rejectedClaims} rejected</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-white">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="employees">By Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Department Expense Breakdown</CardTitle>
                <CardDescription>Total expenses by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentData.slice(0, 5).map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{dept.department}</span>
                        <Badge variant="secondary" className="text-xs">
                          {dept.employeeCount} emp
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-900">{formatCurrency(dept.totalAmount)}</p>
                        <p className="text-xs text-slate-500">{dept.claimCount} claims</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Expense Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Top Expense Categories</CardTitle>
                <CardDescription>Highest spending categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.slice(0, 5).map((category) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <PieChart className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-900">{formatCurrency(category.totalAmount)}</p>
                        <p className="text-xs text-slate-500">{category.claimCount} claims</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Financial Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Organization Financial Risk Assessment
              </CardTitle>
              <CardDescription>Key financial indicators and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>High Priority:</strong><br />
                    {formatCurrency(analytics.summary.pendingAmount)} in pending approvals requires immediate attention
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Budget Impact:</strong><br />
                    Total organizational liability: {formatCurrency(analytics.summary.totalAmount)}
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Process Efficiency:</strong><br />
                    {Math.round((analytics.summary.approvedClaims / analytics.summary.totalClaims) * 100)}% approval rate indicates healthy process
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Department Financial Analysis</CardTitle>
              <CardDescription>Detailed breakdown of expenses by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-slate-600">Department</th>
                      <th className="text-right py-2 text-slate-600">Total Amount</th>
                      <th className="text-right py-2 text-slate-600">Approved</th>
                      <th className="text-right py-2 text-slate-600">Pending</th>
                      <th className="text-right py-2 text-slate-600">Employees</th>
                      <th className="text-right py-2 text-slate-600">Claims</th>
                      <th className="text-right py-2 text-slate-600">Avg/Claim</th>
                      <th className="text-center py-2 text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentData.map((dept) => (
                      <tr key={dept.department} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900">{dept.department}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 text-slate-900">
                          {formatCurrency(dept.totalAmount)}
                        </td>
                        <td className="text-right py-3 text-green-600">
                          {formatCurrency(dept.approvedAmount)}
                        </td>
                        <td className="text-right py-3 text-yellow-600">
                          {formatCurrency(dept.pendingAmount)}
                        </td>
                        <td className="text-right py-3 text-slate-600">
                          {dept.employeeCount}
                        </td>
                        <td className="text-right py-3 text-slate-600">
                          {dept.claimCount}
                        </td>
                        <td className="text-right py-3 text-slate-600">
                          {formatCurrency(dept.averageClaimAmount)}
                        </td>
                        <td className="text-center py-3">
                          {dept.flaggedClaims > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {dept.flaggedClaims} Flagged
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Clean
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Expense Category Analysis</CardTitle>
              <CardDescription>Spending patterns by expense category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryData.map((category) => (
                  <Card key={category.category} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-slate-900">{category.category}</h3>
                        <Badge variant="outline" className="text-xs">
                          {category.claimCount} claims
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Total Amount:</span>
                          <span className="text-slate-900">{formatCurrency(category.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Average/Claim:</span>
                          <span className="text-slate-900">{formatCurrency(category.averageAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Top Spender:</span>
                          <span className="text-slate-900">{category.topEmployee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Highest Claim:</span>
                          <span className="text-slate-900">{formatCurrency(category.topAmount)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Employee Expense Analysis</CardTitle>
              <CardDescription>Individual employee spending and claim patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-slate-600">Employee</th>
                      <th className="text-left py-2 text-slate-600">Department</th>
                      <th className="text-right py-2 text-slate-600">Total</th>
                      <th className="text-right py-2 text-slate-600">Approved</th>
                      <th className="text-right py-2 text-slate-600">Pending</th>
                      <th className="text-right py-2 text-slate-600">Claims</th>
                      <th className="text-right py-2 text-slate-600">Avg/Claim</th>
                      <th className="text-center py-2 text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeData
                      .filter(emp => 
                        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.department.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((emp) => (
                        <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-slate-900">{emp.employee_name}</p>
                                {emp.lastClaimDate !== 'Never' && (
                                  <p className="text-xs text-slate-500">
                                    Last: {new Date(emp.lastClaimDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-slate-600">{emp.department}</td>
                          <td className="text-right py-3 text-slate-900">
                            {formatCurrency(emp.totalAmount)}
                          </td>
                          <td className="text-right py-3 text-green-600">
                            {formatCurrency(emp.approvedAmount)}
                          </td>
                          <td className="text-right py-3 text-yellow-600">
                            {formatCurrency(emp.pendingAmount)}
                          </td>
                          <td className="text-right py-3 text-slate-600">{emp.claimCount}</td>
                          <td className="text-right py-3 text-slate-600">
                            {formatCurrency(emp.averageClaimAmount)}
                          </td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              {emp.flaggedClaims > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {emp.flaggedClaims} Flagged
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewClaimDetails(emp.employee_id)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          filename={selectedImage.filename}
          title={`Receipt - ${selectedImage.filename}`}
        />
      )}
    </div>
  );
}