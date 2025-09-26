import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Menu, 
  Bell, 
  Settings, 
  LogOut, 
  Clock, 
  Receipt, 
  CheckCircle,
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Coins,
  Eye,
  ArrowLeft,
  Globe
} from 'lucide-react';
import type { User } from '../App';
import { ReceiptCapture } from './ReceiptCapture';
import { ExpenseCategories } from './ExpenseCategories';
import { EmployeeSettings } from './EmployeeSettings';
import { ProfileManagement } from './ProfileManagement';
import { MyClaims } from './MyClaims';
import { NotificationCenter } from './NotificationCenter';
import { api } from '../utils/api';
import { dataService } from '../utils/supabaseDataService';
import { toast } from 'sonner@2.0.3';

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function EmployeeDashboard({ user, onLogout, setUser }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summaryData, setSummaryData] = useState({
    pendingClaims: 0,
    approvedClaims: 0,
    totalApproved: 0,
    hoursWorked: 42.5,
    overtimeHours: 2,
    receiptsUploaded: 0,
    monthlyLimit: 5000,
    spent: 0
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize dashboard data
    fetchDashboardData();
    
    // Subscribe to real-time updates - same as MyClaims component
    const handleClaimsUpdate = () => {
      console.log('🔄 Employee Dashboard: Received claims update event, refreshing data...');
      fetchDashboardData();
    };

    const handleDataSync = (event: CustomEvent) => {
      console.log('🔄 Employee Dashboard: Received data sync event', event.detail);
      fetchDashboardData();
    };

    // Listen for multiple event types to ensure updates are caught
    window.addEventListener('logan-claims-updated', handleClaimsUpdate);
    window.addEventListener('logan-claims-refresh', handleClaimsUpdate);
    window.addEventListener('logan-notification-update', handleClaimsUpdate);
    window.addEventListener('logan-data-sync', handleDataSync);

    return () => {
      window.removeEventListener('logan-claims-updated', handleClaimsUpdate);
      window.removeEventListener('logan-claims-refresh', handleClaimsUpdate);
      window.removeEventListener('logan-notification-update', handleClaimsUpdate);
      window.removeEventListener('logan-data-sync', handleDataSync);
    };
  }, [user.id]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch claims from data service
      const fetchWithTimeout = Promise.race([
        dataService.getUserExpenseClaims(user.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Dashboard fetch timeout')), 5000))
      ]);
      
      const claimsResult = await fetchWithTimeout as any;
      const userClaims = claimsResult.success ? claimsResult.data : [];
      console.log(`📊 Dashboard: Found ${userClaims.length} claims for user ${user.id}`, userClaims);
      
      if (userClaims.length > 0) {
        // Calculate summary data from claims
        const pendingClaims = userClaims.filter(c => c.status === 'pending').length;
        const approvedClaims = userClaims.filter(c => c.status === 'approved').length;
        const totalApproved = userClaims
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + c.amount, 0);
        const totalAmount = userClaims.reduce((sum, c) => sum + c.amount, 0);
        
        setSummaryData(prev => ({
          ...prev,
          pendingClaims,
          approvedClaims,
          totalApproved,
          spent: totalAmount,
          receiptsUploaded: userClaims.length
        }));
        
        // Format recent expenses from the same data source as MyClaims
        const recentClaims = userClaims
          .sort((a, b) => new Date(b.submissionDate || b.createdAt).getTime() - new Date(a.submissionDate || a.createdAt).getTime())
          .slice(0, 4)
          .map(claim => ({
            id: claim.id || `claim-${Date.now()}`,
            category: claim.category || 'Unknown',
            amount: claim.amount || 0,
            status: claim.status || 'pending',
            date: claim.expenseDate || claim.createdAt,
            currency: claim.currency || 'ZAR',
            submitted_at: claim.submissionDate || claim.createdAt
          }));
        setRecentExpenses(recentClaims);
        console.log(`📊 Dashboard: Formatted ${recentClaims.length} recent expenses`);
      } else {
        // Fallback to API if no claims found in Enhanced Claims Data Service
        try {
          const analyticsResponse = await api.getAnalyticsSummary(user.id);
          if (analyticsResponse.success) {
            const analytics = analyticsResponse.data;
            setSummaryData(prev => ({
              ...prev,
              pendingClaims: analytics.pendingClaims,
              approvedClaims: analytics.approvedClaims,
              totalApproved: analytics.approvedAmount,
              spent: analytics.totalAmount,
              receiptsUploaded: analytics.totalClaims
            }));
          }

          const claimsResponse = await api.getClaims(user.id);
          if (claimsResponse.success) {
            const recentClaims = claimsResponse.data.slice(0, 4).map(claim => ({
              id: claim.id,
              category: claim.category?.name || 'Unknown',
              amount: parseFloat(claim.amount),
              status: claim.status,
              date: claim.expense_date,
              currency: claim.currency || 'ZAR'
            }));
            setRecentExpenses(recentClaims);
          }
        } catch (fallbackError) {
          console.log('Fallback API fetch failed:', fallbackError);
          setRecentExpenses([]); // Set empty array if both fail
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRecentExpenses([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    const symbols = {
      'ZAR': 'R',
      'USD': 'R',
      'EUR': 'R',
      'GBP': 'R',
      'JPY': 'R',
      'AUD': 'R',
      'CAD': 'R'
    };
    return `${symbols[currency as keyof typeof symbols] || 'R'}${amount.toLocaleString()}`;
  };

  const handleExpenseClick = (expense: any) => {
    // Navigate to claims tab and show specific expense
    setActiveTab('claims');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="mr-3"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center mr-3">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Automated Expense and Forecasting Management System</h1>
                <p className="text-sm text-slate-600">Logan Freights Logistics CC</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationCenter userId={user.id} />

              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-700">Welcome, {user.name}</span>
                <Badge variant="outline">Employee</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Capture Receipts
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Claims
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('claims')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-slate-600">Pending Claims</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-slate-900 mb-1">
                    {isLoading ? '...' : summaryData.pendingClaims}
                  </div>
                  <p className="text-xs text-slate-500">Awaiting approval</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('claims')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-slate-600">Approved Claims</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-slate-900 mb-1">
                    {isLoading ? '...' : summaryData.approvedClaims}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isLoading ? '...' : `R${summaryData.totalApproved.toLocaleString()} total`}
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-slate-600">Hours Worked</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-slate-900 mb-1">{summaryData.hoursWorked}h</div>
                  <p className="text-xs text-slate-500">{summaryData.overtimeHours}h overtime this month</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('receipts')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm text-slate-600">Receipts Uploaded</CardTitle>
                  <Receipt className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl text-slate-900 mb-1">
                    {isLoading ? '...' : summaryData.receiptsUploaded}
                  </div>
                  <p className="text-xs text-slate-500">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Expense Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900">Monthly Expense Limit</CardTitle>
                  <CardDescription>Track your spending against your monthly allowance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Spent</span>
                    <span className="text-slate-900">R{summaryData.spent.toLocaleString()} / R{summaryData.monthlyLimit.toLocaleString()}</span>
                  </div>
                  <Progress value={(summaryData.spent / summaryData.monthlyLimit) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{Math.round((summaryData.spent / summaryData.monthlyLimit) * 100)}% used</span>
                    <span>R{(summaryData.monthlyLimit - summaryData.spent).toLocaleString()} remaining</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    Recent Expenses
                    <Badge variant="outline" className="text-xs">
                      From My Claims
                    </Badge>
                  </CardTitle>
                  <CardDescription>Your latest expense submissions (synced with My Claims)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center text-slate-500 py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto mb-2"></div>
                        Loading recent expenses...
                      </div>
                    ) : recentExpenses.length === 0 ? (
                      <div className="text-center text-slate-500 py-4">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        No recent expenses
                        <p className="text-xs mt-1">Submit your first expense claim to see it here</p>
                      </div>
                    ) : (
                      recentExpenses.map((expense) => (
                        <div 
                          key={expense.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                          onClick={() => handleExpenseClick(expense)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center">
                              <Coins className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-slate-900">{expense.category}</p>
                              <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <span>{new Date(expense.date).toLocaleDateString()}</span>
                                {expense.submitted_at && (
                                  <>
                                    <span>•</span>
                                    <span>Submitted {new Date(expense.submitted_at).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-right">
                              <p className="text-slate-900">{formatCurrency(expense.amount, expense.currency)}</p>
                              <Badge variant="secondary" className={`text-xs ${getStatusColor(expense.status)}`}>
                                {expense.status.toUpperCase()}
                              </Badge>
                            </div>
                            <Eye className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {recentExpenses.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-3"
                      onClick={() => setActiveTab('claims')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View All Claims ({recentExpenses.length > 4 ? 'more available' : `${recentExpenses.length} total`})
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseCategories />
          </TabsContent>

          <TabsContent value="receipts">
            <ReceiptCapture 
              userId={user.id} 
              onSubmit={async (expenseData) => {
                try {
                  console.log('🚀 Employee submitting expense claim:', expenseData);
                  
                  // Create a simple claim object and trigger events
                  const claimData = {
                    employeeId: user.id,
                    employeeName: user.name,
                    employeeEmail: user.email,
                    department: user.department || 'Unknown',
                    amount: parseFloat(expenseData.amount),
                    category: expenseData.category,
                    description: expenseData.description,
                    businessPurpose: expenseData.description,
                    expenseDate: expenseData.date,
                    receiptUrl: expenseData.files[0]?.url,
                    receiptFileName: expenseData.files[0]?.name,
                    location: expenseData.vendor,
                    attachments: expenseData.files.map(file => ({
                      id: file.id || `att-${Date.now()}`,
                      fileName: file.name,
                      fileType: file.type,
                      fileSize: file.size,
                      uploadDate: file.uploadedAt,
                      url: file.url,
                      processingStatus: 'processed' as const
                    }))
                  };

                  // Submit via enhanced claims data service with timeout protection
                  const submitPromise = EnhancedClaimsDataService.submitClaim(claimData);
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Submission timeout')), 10000)
                  );
                  
                  const result = await Promise.race([submitPromise, timeoutPromise]) as any;
                  
                  if (result.success) {
                    console.log('✅ Expense submitted successfully:', result.claimId);
                    
                    // Immediate UI feedback
                    toast.success('Expense claim submitted successfully! Managers will be notified.');
                    
                    // Trigger real-time updates with immediate dispatch
                    const triggerUpdates = () => {
                      window.dispatchEvent(new CustomEvent('logan-claims-updated', {
                        detail: { type: 'claim_submitted', claimId: result.claimId }
                      }));
                      window.dispatchEvent(new CustomEvent('logan-claims-refresh'));
                      window.dispatchEvent(new CustomEvent('logan-notification-update'));
                      window.dispatchEvent(new CustomEvent('logan-data-sync', {
                        detail: { type: 'claim_submitted', claimId: result.claimId }
                      }));
                    };
                    
                    // Immediate update
                    triggerUpdates();
                    
                    // Delayed updates for components that might not be ready
                    setTimeout(triggerUpdates, 300);
                    setTimeout(triggerUpdates, 800);
                    
                    // Refresh dashboard data and switch to claims tab
                    try {
                      await Promise.race([
                        fetchDashboardData(),
                        new Promise(resolve => setTimeout(resolve, 3000))
                      ]);
                    } catch (error) {
                      console.log('Dashboard data fetch timed out, continuing...');
                    }
                    setActiveTab('claims');
                  } else {
                    console.error('❌ Failed to submit expense:', result.error);
                    toast.error(result.error || 'Failed to submit expense claim');
                  }
                } catch (error) {
                  console.error('❌ Error submitting expense:', error);
                  toast.error('An error occurred while submitting the expense claim');
                }
              }}
            />
          </TabsContent>

          <TabsContent value="claims">
            <MyClaims userId={user.id} title="My Claims & Receipts" />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileManagement user={user} setUser={setUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}