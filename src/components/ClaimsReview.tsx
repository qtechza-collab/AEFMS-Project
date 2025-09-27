import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search, 
  Filter,
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  User,
  DollarSign,
  Building,
  Tag,
  MessageSquare,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
  Edit,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '../utils/dataStore';
import { ImageViewer } from './ImageViewer';
import { ClaimApprovalTester } from './ClaimApprovalTester';

interface ClaimsReviewProps {
  currentUserId: string;
  userRole: 'employer' | 'hr' | 'administrator';
  title?: string;
  showUserInfo?: boolean;
  allowActions?: boolean;
}

interface ExpenseClaim {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  vendor: string;
  payment_method: string;
  expense_date: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'under_review';
  receipt_url?: string;
  receipt_filename?: string;
  receipt_files?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  tax_amount?: number;
  notes?: string;
  manager_id?: string;
  manager_name?: string;
  manager_comments?: string;
  approved_at?: string;
  rejected_at?: string;
  fraud_score?: number;
  fraud_flags?: string[];
  is_flagged?: boolean;
}

export function ClaimsReview({ 
  currentUserId, 
  userRole, 
  title = "Claims Review", 
  showUserInfo = true, 
  allowActions = true 
}: ClaimsReviewProps) {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ExpenseClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'review'>('approve');
  const [managerComments, setManagerComments] = useState('');
  const [selectedImage, setSelectedImage] = useState<{url: string, filename: string} | null>(null);

  useEffect(() => {
    fetchClaims();
    
    // Subscribe to real-time updates
    const unsubscribe = dataStore.subscribe('claims:updated', () => {
      fetchClaims();
    });

    return unsubscribe;
  }, [currentUserId, userRole]);

  useEffect(() => {
    filterAndSortClaims();
  }, [claims, searchTerm, statusFilter, departmentFilter, sortBy, sortOrder]);

  const fetchClaims = () => {
    try {
      setIsLoading(true);
      
      let claimsData: ExpenseClaim[] = [];
      
      if (userRole === 'employer') {
        // Managers see claims from their team members
        claimsData = dataStore.getClaims({ manager_id: currentUserId });
      } else if (userRole === 'hr' || userRole === 'administrator') {
        // HR and Admin see all claims
        claimsData = dataStore.getClaims();
      }
      
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortClaims = () => {
    let filtered = [...claims];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(claim => claim.department === departmentFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'employee_name':
          aValue = a.employee_name;
          bValue = b.employee_name;
          break;
        case 'department':
          aValue = a.department;
          bValue = b.department;
          break;
        case 'expense_date':
          aValue = new Date(a.expense_date);
          bValue = new Date(b.expense_date);
          break;
        default:
          aValue = new Date(a.submitted_at);
          bValue = new Date(b.submitted_at);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredClaims(filtered);
  };

  const handleRealtimeApproval = async (claimId: string, action: 'approve' | 'reject' | 'review', comments?: string) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} claim...`);
      
      const updates = {
        status: action === 'approve' ? 'approved' as const : 
                action === 'reject' ? 'rejected' as const : 
                'under_review' as const,
        manager_id: currentUserId,
        manager_name: userRole === 'employer' ? 'Sarah Manager' : 
                     userRole === 'hr' ? 'HR Manager' : 'System Administrator',
        manager_comments: comments || ''
      };

      const updatedClaim = dataStore.updateClaim(claimId, updates);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (updatedClaim) {
        // Show success with claim details
        const actionText = action === 'approve' ? 'approved' : 
                          action === 'reject' ? 'rejected' : 
                          'sent for review';
        toast.success(
          `Claim ${actionText} successfully`,
          {
            description: `${updatedClaim.employee_name} - ${formatCurrency(updatedClaim.amount, updatedClaim.currency)}`,
            duration: 4000
          }
        );
        
        setShowApprovalDialog(false);
        setSelectedClaim(null);
        setManagerComments('');
        
        // Force refresh to show updated data
        setTimeout(() => {
          fetchClaims();
        }, 100);
      } else {
        toast.error('Failed to update claim - please try again');
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process claim approval - system error');
    }
  };

  const openApprovalDialog = (claim: ExpenseClaim, action: 'approve' | 'reject' | 'review') => {
    setSelectedClaim(claim);
    setApprovalAction(action);
    setManagerComments('');
    setShowApprovalDialog(true);
  };

  const viewImage = (url: string, filename: string) => {
    setSelectedImage({ url, filename });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `R ${amount.toLocaleString()}`;
  };

  const getStatusIcon = (status: string, isHighFraud: boolean = false) => {
    if (isHighFraud) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'under_review':
        return <MessageSquare className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string, isHighFraud: boolean = false) => {
    if (isHighFraud) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const uniqueDepartments = [...new Set(claims.map(c => c.department))];
  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;
  const flaggedCount = claims.filter(c => c.is_flagged).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
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
            <h2 className="text-2xl text-slate-900">{title}</h2>
            <p className="text-slate-600">
              {userRole === 'employer' ? 'Review and approve expense claims from your team' :
               userRole === 'hr' ? 'Monitor all employee expense claims across the organization' :
               'Administrative overview of all expense claims'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
            {pendingCount} Pending
          </Badge>
          {flaggedCount > 0 && (
            <Badge variant="outline" className="text-red-700 bg-red-50">
              {flaggedCount} Flagged
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Approval System Tester - Development Tool */}
      <ClaimApprovalTester 
        currentUserId={currentUserId} 
        userRole={userRole} 
      />

      {/* Quick Actions for Pending Claims - Managers Only */}
      {userRole === 'employer' && pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Quick Actions - {pendingCount} Claims Awaiting Your approval
            </CardTitle>
            <CardDescription>
              Review and approve pending expense claims from your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredClaims.filter(c => c.status === 'pending').slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center space-x-2 bg-white rounded-lg p-3 border">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{claim.employee_name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(claim.amount, claim.currency)} - {claim.category}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRealtimeApproval(claim.id, 'approve')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRealtimeApproval(claim.id, 'reject')}
                  >
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {pendingCount > 3 && (
                <div className="flex items-center justify-center bg-white rounded-lg p-3 border text-slate-600">
                  <span className="text-sm">+{pendingCount - 3} more pending</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl text-slate-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-2xl text-slate-900">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="text-2xl text-slate-900">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Claims</p>
                <p className="text-2xl text-slate-900">{claims.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search claims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted_at">Submission Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="employee_name">Employee</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="expense_date">Expense Date</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2"
            >
              {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Claims ({filteredClaims.length})</CardTitle>
          <CardDescription>
            {filteredClaims.length === 0 ? 'No claims found matching your criteria' : 
             `Showing ${filteredClaims.length} of ${claims.length} claims`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading claims...</p>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-slate-600">No claims found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const isHighFraud = (claim.fraud_score || 0) > 70 || claim.is_flagged;
                const isExpanded = expandedClaim === claim.id;
                
                return (
                  <div 
                    key={claim.id} 
                    className={`border rounded-lg transition-all duration-200 ${
                      isHighFraud ? 'border-red-200 bg-red-50' : 
                      isExpanded ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Main claim row */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            {getStatusIcon(claim.status, isHighFraud)}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div>
                              <p className="text-slate-900">{claim.employee_name}</p>
                              <p className="text-xs text-slate-500">ID: {claim.id}</p>
                            </div>
                            
                            <div>
                              <p className="text-slate-900">{formatCurrency(claim.amount, claim.currency)}</p>
                              <p className="text-xs text-slate-500">{claim.category}</p>
                            </div>
                            
                            <div>
                              <p className="text-slate-900">{claim.department}</p>
                              <p className="text-xs text-slate-500">{new Date(claim.expense_date).toLocaleDateString()}</p>
                            </div>
                            
                            {/* Receipt Preview Column */}
                            <div>
                              {claim.receipt_url ? (
                                <div className="flex items-center space-x-2">
                                  <img
                                    src={claim.receipt_url}
                                    alt="Receipt thumbnail"
                                    className="w-12 h-12 object-cover border rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => viewImage(claim.receipt_url!, claim.receipt_filename || 'Receipt')}
                                  />
                                  <div>
                                    <p className="text-xs text-slate-500 truncate max-w-20">
                                      {claim.receipt_filename || 'Receipt'}
                                    </p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewImage(claim.receipt_url!, claim.receipt_filename || 'Receipt')}
                                      className="text-xs p-0 h-auto text-blue-600 hover:text-blue-800"
                                    >
                                      View Receipt
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 border rounded">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <Badge variant="outline" className={`border ${getStatusColor(claim.status, isHighFraud)}`}>
                                {claim.status.toUpperCase()}
                              </Badge>
                              {isHighFraud && (
                                <Badge variant="destructive" className="ml-1 text-xs">
                                  FLAGGED
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedClaim(isExpanded ? null : claim.id)}
                                className="text-slate-600 hover:text-slate-900"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {isExpanded ? 'Hide' : 'View'}
                              </Button>
                              
                              {allowActions && claim.status === 'pending' && userRole === 'employer' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRealtimeApproval(claim.id, 'approve')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 shadow-sm text-xs"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRealtimeApproval(claim.id, 'review')}
                                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 shadow-sm text-xs"
                                  >
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Review
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRealtimeApproval(claim.id, 'reject')}
                                    className="px-3 py-2 shadow-sm text-xs"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              
                              {allowActions && (claim.status === 'pending' || claim.status === 'under_review') && (userRole === 'hr' || userRole === 'administrator') && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRealtimeApproval(claim.id, 'approve')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 shadow-sm text-xs"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Override Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRealtimeApproval(claim.id, 'reject')}
                                    className="px-3 py-2 shadow-sm text-xs"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Override Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200">
                        <div className="pt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm text-slate-500">Description</Label>
                                <p className="text-slate-900">{claim.description}</p>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-slate-500">Vendor</Label>
                                <p className="text-slate-900">{claim.vendor}</p>
                              </div>
                              
                              <div>
                                <Label className="text-sm text-slate-500">Payment Method</Label>
                                <p className="text-slate-900">{claim.payment_method}</p>
                              </div>
                              
                              {claim.tax_amount && (
                                <div>
                                  <Label className="text-sm text-slate-500">Tax Amount</Label>
                                  <p className="text-slate-900">{formatCurrency(claim.tax_amount, claim.currency)}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              {claim.notes && (
                                <div>
                                  <Label className="text-sm text-slate-500">Notes</Label>
                                  <p className="text-slate-900">{claim.notes}</p>
                                </div>
                              )}
                              
                              <div>
                                <Label className="text-sm text-slate-500">Submitted</Label>
                                <p className="text-slate-900">{new Date(claim.submitted_at).toLocaleString()}</p>
                              </div>
                              
                              {claim.manager_comments && (
                                <div>
                                  <Label className="text-sm text-slate-500">Manager Comments</Label>
                                  <p className="text-slate-900">{claim.manager_comments}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Receipt files */}
                          {claim.receipt_files && claim.receipt_files.length > 0 && (
                            <div>
                              <Label className="text-sm text-slate-500 mb-2 block">Receipts</Label>
                              <div className="flex flex-wrap gap-2">
                                {claim.receipt_files.map((file) => (
                                  <Button
                                    key={file.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => viewImage(file.url, file.name)}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="w-3 h-3" />
                                    {file.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Fraud indicators */}
                          {isHighFraud && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Fraud Alert:</strong> This claim has been flagged for review.
                                {claim.fraud_flags && claim.fraud_flags.length > 0 && (
                                  <span className="ml-1">
                                    Issues: {claim.fraud_flags.join(', ')}
                                  </span>
                                )}
                                {claim.fraud_score && (
                                  <span className="ml-1">
                                    Risk Score: {claim.fraud_score}%
                                  </span>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {approvalAction === 'approve' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense Claim
            </DialogTitle>
            <DialogDescription>
              {selectedClaim && (
                <div className="space-y-2">
                  <p>
                    {approvalAction === 'approve' ? 'Approve' : 'Reject'} expense claim from{' '}
                    <strong>{selectedClaim.employee_name}</strong> for{' '}
                    <strong>{formatCurrency(selectedClaim.amount, selectedClaim.currency)}</strong>
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span><strong>Category:</strong> {selectedClaim.category}</span>
                    <span><strong>Date:</strong> {new Date(selectedClaim.expense_date).toLocaleDateString()}</span>
                    <span><strong>Department:</strong> {selectedClaim.department}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogBody>
            {selectedClaim && (
              <div className="space-y-6">
                {/* Claim summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Claim Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Description:</span>
                      <p className="text-slate-900 mt-1">{selectedClaim.description}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Vendor:</span>
                      <p className="text-slate-900 mt-1">{selectedClaim.vendor}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Payment Method:</span>
                      <p className="text-slate-900 mt-1">{selectedClaim.payment_method}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tax Amount:</span>
                      <p className="text-slate-900 mt-1">
                        {selectedClaim.tax_amount ? formatCurrency(selectedClaim.tax_amount, selectedClaim.currency) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comments section */}
                <div>
                  <Label htmlFor="comments" className="text-base">
                    {approvalAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
                  </Label>
                  <p className="text-sm text-slate-500 mb-3">
                    {approvalAction === 'approve' 
                      ? 'Add any additional comments or instructions for this approval.' 
                      : 'Please provide a clear reason for rejecting this claim. This will be sent to the employee.'}
                  </p>
                  <Textarea
                    id="comments"
                    placeholder={
                      approvalAction === 'approve' 
                        ? 'e.g., Approved for business travel expenses as per company policy...' 
                        : 'e.g., Receipt is unclear, please resubmit with a clearer image...'
                    }
                    value={managerComments}
                    onChange={(e) => setManagerComments(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  {approvalAction === 'reject' && !managerComments.trim() && (
                    <p className="text-sm text-red-600 mt-2">Rejection reason is required</p>
                  )}
                </div>
              </div>
            )}
          </DialogBody>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedClaim && handleRealtimeApproval(selectedClaim.id, approvalAction, managerComments)}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={approvalAction === 'reject' && !managerComments.trim()}
            >
              {approvalAction === 'approve' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Claim
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Claim
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
