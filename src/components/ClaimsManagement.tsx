import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { ImageViewer } from './ImageViewer';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Banknote,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  User,
  Building,
  Receipt,
  Image as ImageIcon,
  FileImage,
  ExternalLink
} from 'lucide-react';
import { dataStore } from '../utils/dataStore';

interface Claim {
  id: string;
  user_id: string;
  amount: string;
  currency: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  category: {
    name: string;
    icon?: string;
    color?: string;
  };
  description: string;
  receipt_url?: string;
  receipt_filename?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  approved_by?: string;
  rejected_by?: string;
  approval_comments?: string;
  rejection_reason?: string;
  user: {
    name: string;
    employee_id: string;
    department?: string;
  };
  tax_amount?: number;
  total_with_tax?: number;
}

interface AnalyticsData {
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  approvedAmount: number;
  totalAmount: number;
  totalClaims: number;
  tax_amount: number;
  approval_rate: number;
}

export function ClaimsManagement() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  
  // Approval/Rejection form data
  const [approvalForm, setApprovalForm] = useState({
    comments: ''
  });
  
  const [rejectionForm, setRejectionForm] = useState({
    reason: ''
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };

  useEffect(() => {
    fetchClaims();
    fetchAnalytics();
  }, []);

  const fetchClaims = async () => {
    try {
      setIsLoading(true);
      
      // Get claims directly from dataStore
      const claimsData = dataStore.getClaims();
      
      // Transform claims to match the expected format
      const transformedClaims = claimsData.map(claim => ({
        id: claim.id,
        user_id: claim.employee_id,
        amount: claim.amount.toString(),
        currency: claim.currency,
        expense_date: claim.expense_date,
        status: claim.status,
        category: {
          name: claim.category,
          icon: '📄',
          color: '#3b82f6'
        },
        description: claim.description,
        receipt_url: claim.receipt_url,
        receipt_filename: claim.receipt_filename,
        created_at: claim.submitted_at,
        approved_at: claim.approved_at,
        rejected_at: claim.rejected_at,
        approved_by: claim.manager_name,
        rejected_by: claim.manager_name,
        approval_comments: claim.manager_comments,
        rejection_reason: claim.manager_comments,
        user: {
          name: claim.employee_name,
          employee_id: claim.employee_id,
          department: claim.department
        },
        tax_amount: claim.tax_amount || (claim.amount * 0.15),
        total_with_tax: claim.amount + (claim.tax_amount || (claim.amount * 0.15))
      }));
      
      setClaims(transformedClaims);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch claims');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Calculate analytics from claims data
      const claimsData = dataStore.getClaims();
      
      const pendingClaims = claimsData.filter(c => c.status === 'pending').length;
      const approvedClaims = claimsData.filter(c => c.status === 'approved').length;
      const rejectedClaims = claimsData.filter(c => c.status === 'rejected').length;
      const totalClaims = claimsData.length;
      
      const approvedAmount = claimsData
        .filter(c => c.status === 'approved')
        .reduce((total, claim) => total + claim.amount, 0);
      
      const totalAmount = claimsData.reduce((total, claim) => total + claim.amount, 0);
      const tax_amount = totalAmount * 0.15; // 15% tax
      const approval_rate = totalClaims > 0 ? Math.round((approvedClaims / totalClaims) * 100) : 0;
      
      const analyticsData: AnalyticsData = {
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        approvedAmount,
        totalAmount,
        totalClaims,
        tax_amount,
        approval_rate
      };
      
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      setActionLoading(claimId);
      
      // Update claim using dataStore
      const updatedClaim = dataStore.updateClaim(claimId, {
        status: 'approved' as const,
        manager_name: 'Manager',
        manager_comments: approvalForm.comments || 'Approved',
        approved_at: new Date().toISOString()
      });
      
      if (updatedClaim) {
        toast.success('Claim approved successfully!');
        fetchClaims();
        fetchAnalytics();
        setShowClaimDetails(false);
        setApprovalForm({ comments: '' });
      } else {
        toast.error('Failed to approve claim');
      }
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Failed to approve claim');
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectClaim = async (claimId: string, reason: string) => {
    try {
      setActionLoading(claimId);
      
      // Update claim using dataStore
      const updatedClaim = dataStore.updateClaim(claimId, {
        status: 'rejected' as const,
        manager_name: 'Manager',
        manager_comments: reason,
        rejected_at: new Date().toISOString()
      });
      
      if (updatedClaim) {
        toast.success('Claim rejected successfully!');
        fetchClaims();
        fetchAnalytics();
        setShowClaimDetails(false);
        setRejectionForm({ reason: '' });
      } else {
        toast.error('Failed to reject claim');
      }
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Failed to reject claim');
    } finally {
      setActionLoading('');
    }
  };

  const getClaimPriority = (claim: Claim) => {
    const amount = parseFloat(claim.amount);
    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(claim.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (amount > 2000 || daysSinceSubmission > 7) return 'high';
    if (amount > 1000 || daysSinceSubmission > 3) return 'medium';
    return 'low';
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.user.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.category.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || claim.category.name === filterCategory;
    
    let matchesDateRange = true;
    if (filterDateRange !== 'all') {
      const claimDate = new Date(claim.created_at);
      const now = new Date();
      const diffTime = now.getTime() - claimDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (filterDateRange) {
        case 'today':
          matchesDateRange = diffDays <= 1;
          break;
        case 'week':
          matchesDateRange = diffDays <= 7;
          break;
        case 'month':
          matchesDateRange = diffDays <= 30;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  });

  const categories = [...new Set(claims.map(claim => claim.category.name))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">Claims Management</h2>
          <p className="text-slate-600">Review and manage expense claims</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchClaims()}
          >
            <FileText className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Pending Claims</p>
                  <p className="text-2xl text-slate-900">{analytics.pendingClaims}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Approved Claims</p>
                  <p className="text-2xl text-slate-900">{analytics.approvedClaims}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-slate-100">
                  <Banknote className="w-6 h-6 text-slate-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Approved Amount</p>
                  <p className="text-2xl text-slate-900">R {analytics.approvedAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Approval Rate</p>
                  <p className="text-2xl text-slate-900">{analytics.approval_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="claims" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="claims">All Claims ({filteredClaims.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({claims.filter(c => c.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search claims by employee, description, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Claims List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Expense Claims</CardTitle>
              <CardDescription>
                {filteredClaims.length} of {claims.length} claims shown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClaims.map((claim) => {
                  const priority = getClaimPriority(claim);
                  return (
                    <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-slate-900">{claim.user.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {claim.user.employee_id}
                            </Badge>
                            <Badge variant="secondary" className={statusColors[claim.status]}>
                              {claim.status}
                            </Badge>
                            <Badge variant="outline" className={priorityColors[priority]}>
                              {priority} priority
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-slate-500">
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              R {parseFloat(claim.amount).toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {claim.category.name}
                            </div>
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(claim.expense_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(claim.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1 truncate">{claim.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {claim.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowImageViewer(true);
                            }}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setShowClaimDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                        {claim.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveClaim(claim.id)}
                              disabled={actionLoading === claim.id}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setShowClaimDetails(true);
                              }}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {filteredClaims.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-slate-600 mb-2">No claims found</h3>
                    <p className="text-sm text-slate-500">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Pending Claims Requiring Action</CardTitle>
              <CardDescription>Claims waiting for your approval or rejection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claims.filter(claim => claim.status === 'pending').map((claim) => {
                  const priority = getClaimPriority(claim);
                  const daysSinceSubmission = Math.floor(
                    (new Date().getTime() - new Date(claim.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <div key={claim.id} className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <h3 className="text-slate-900">{claim.user.name} - {claim.category.name}</h3>
                          <Badge variant="outline" className={priorityColors[priority]}>
                            {priority} priority
                          </Badge>
                          {daysSinceSubmission > 3 && (
                            <Badge variant="destructive">
                              {daysSinceSubmission} days old
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApproveClaim(claim.id)}
                            disabled={actionLoading === claim.id}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Quick Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowClaimDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review Details
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                        <div>Amount: R {parseFloat(claim.amount).toLocaleString()}</div>
                        <div>Date: {new Date(claim.expense_date).toLocaleDateString()}</div>
                        <div>Submitted: {new Date(claim.created_at).toLocaleDateString()}</div>
                      </div>
                      <p className="text-sm text-slate-700 mt-2">{claim.description}</p>
                    </div>
                  );
                })}
                
                {claims.filter(claim => claim.status === 'pending').length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-slate-600 mb-2">All caught up!</h3>
                    <p className="text-sm text-slate-500">No pending claims requiring your attention</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claims Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Claims</span>
                      <span className="text-slate-900">{analytics.totalClaims}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Amount</span>
                      <span className="text-slate-900">R {analytics.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Tax Amount (15%)</span>
                      <span className="text-slate-900">R {analytics.tax_amount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Approval Rate</span>
                      <span className="text-slate-900">{analytics.approval_rate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Export Claims Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <PieChart className="w-4 h-4 mr-2" />
                      Category Breakdown
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Claim Details Dialog */}
      {selectedClaim && (
        <Dialog open={showClaimDetails} onOpenChange={setShowClaimDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Claim Review - {selectedClaim.user.name}</DialogTitle>
              <DialogDescription>
                Review claim details and take action
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500">Employee</Label>
                    <p className="text-slate-900">{selectedClaim.user.name} ({selectedClaim.user.employee_id})</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Department</Label>
                    <p className="text-slate-900">{selectedClaim.user.department || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Category</Label>
                    <p className="text-slate-900">{selectedClaim.category.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Description</Label>
                    <p className="text-slate-900">{selectedClaim.description}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500">Amount</Label>
                    <p className="text-slate-900">R {parseFloat(selectedClaim.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Tax Amount (15%)</Label>
                    <p className="text-slate-900">R {(selectedClaim.tax_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Expense Date</Label>
                    <p className="text-slate-900">{new Date(selectedClaim.expense_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Submitted Date</Label>
                    <p className="text-slate-900">{new Date(selectedClaim.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {selectedClaim.receipt_url && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">Receipt</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageViewer(true)}
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      View Receipt
                    </Button>
                    <p className="text-sm text-slate-600">{selectedClaim.receipt_filename}</p>
                  </div>
                </div>
              )}

              {selectedClaim.status === 'pending' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Approve with Comments (Optional)</Label>
                      <Textarea
                        placeholder="Add approval comments..."
                        value={approvalForm.comments}
                        onChange={(e) => setApprovalForm(prev => ({ ...prev, comments: e.target.value }))}
                        rows={3}
                      />
                      <Button
                        onClick={() => handleApproveClaim(selectedClaim.id)}
                        disabled={actionLoading === selectedClaim.id}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Claim
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Reject with Reason *</Label>
                      <Textarea
                        placeholder="Provide reason for rejection..."
                        value={rejectionForm.reason}
                        onChange={(e) => setRejectionForm(prev => ({ ...prev, reason: e.target.value }))}
                        rows={3}
                      />
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectClaim(selectedClaim.id, rejectionForm.reason)}
                        disabled={actionLoading === selectedClaim.id || !rejectionForm.reason}
                        className="w-full"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Claim
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedClaim.status === 'approved' && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-green-800 mb-2">Claim Approved</h4>
                  <p className="text-green-700 text-sm">
                    Approved on {new Date(selectedClaim.approved_at!).toLocaleDateString()}
                    {selectedClaim.approval_comments && (
                      <>
                        <br />
                        Comments: {selectedClaim.approval_comments}
                      </>
                    )}
                  </p>
                </div>
              )}

              {selectedClaim.status === 'rejected' && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-red-800 mb-2">Claim Rejected</h4>
                  <p className="text-red-700 text-sm">
                    Rejected on {new Date(selectedClaim.rejected_at!).toLocaleDateString()}
                    <br />
                    Reason: {selectedClaim.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Viewer */}
      {selectedClaim && showImageViewer && selectedClaim.receipt_url && (
        <ImageViewer
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
          imageUrl={selectedClaim.receipt_url}
          filename={selectedClaim.receipt_filename}
          title={`Receipt - ${selectedClaim.category.name}`}
          metadata={{
            claimId: selectedClaim.id,
            amount: selectedClaim.amount,
            expenseDate: selectedClaim.expense_date,
            uploadedBy: selectedClaim.user.name,
            uploadDate: selectedClaim.created_at,
            description: selectedClaim.description
          }}
        />
      )}
    </div>
  );
}