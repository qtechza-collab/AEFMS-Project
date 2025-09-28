import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  AlertTriangle,
  Calendar,
  User,
  Receipt,
  DollarSign,
  MessageSquare,
  Building,
  Tag,
  CreditCard,
  FileText,
  Lock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { enhancedClaimsManager, type ExpenseClaim } from '../utils/enhancedClaimsManager';
import { enhancedCloudStorage } from '../utils/enhancedCloudStorage';
import { ImageViewer } from './ImageViewer';

interface ExpenseApprovalsProps {
  managerId: string;
  managerName: string;
  managerRole: 'employer' | 'hr' | 'administrator';
}

export function ExpenseApprovals({ managerId, managerName, managerRole }: ExpenseApprovalsProps) {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ExpenseClaim[]>([]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [managerComments, setManagerComments] = useState('');
  const [selectedImage, setSelectedImage] = useState<{url: string, filename: string, metadata?: any} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClaims();
    
    // Subscribe to real-time updates - listen to multiple events
    const handleClaimsUpdate = () => {
      console.log('🔄 Manager dashboard: Received claims update event');
      fetchClaims();
    };

    const handleDataSync = (event: CustomEvent) => {
      console.log('🔄 Manager dashboard: Received data sync event', event.detail);
      fetchClaims();
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
  }, [managerId, managerRole]);

  useEffect(() => {
    filterClaims();
  }, [claims, activeFilter, searchTerm]);

  const fetchClaims = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Manager dashboard: Starting to fetch claims...', { managerId, managerName, managerRole });
      
      // Validate required parameters
      if (!managerId || !managerName || !managerRole) {
        console.error('Missing required manager parameters:', { managerId, managerName, managerRole });
        toast.error('User information not available. Please refresh the page.');
        return;
      }
      
      // Get claims from Enhanced Claims Data Service (primary source) with timeout protection
      const fetchWithTimeout = Promise.race([
        (async () => {
          const EnhancedClaimsDataService = (await import('../utils/enhancedClaimsDataService')).default;
          await EnhancedClaimsDataService.initialize();
          return EnhancedClaimsDataService.getAllClaims();
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Claims service timeout')), 5000))
      ]);
      
      let allClaims = await fetchWithTimeout as any[];
      console.log(`🔍 Manager dashboard: Found ${allClaims.length} total claims in primary service`);
      
      // Convert to expected format for manager dashboard
      let convertedClaims = allClaims.map(claim => ({
        id: claim.id,
        employee_id: claim.employeeId,
        employee_name: claim.employeeName,
        amount: claim.amount,
        currency: claim.currency,
        category: claim.category,
        description: claim.description,
        expense_date: claim.expenseDate,
        submitted_at: claim.submissionDate,
        status: claim.status,
        priority: claim.priority,
        receipt_url: claim.receiptUrl,
        receipt_filename: claim.receiptFileName,
        receipt_files: claim.attachments?.map(att => ({
          id: att.id,
          name: att.fileName,
          url: att.url
        })) || [],
        tax_amount: claim.taxAmount,
        manager_comments: claim.comments?.find(c => c.authorRole === 'manager')?.content,
        vendor: claim.location || 'Unknown Vendor',
        payment_method: 'Card',
        notes: claim.businessPurpose,
        fraud_score: claim.riskFlags?.length > 0 ? 75 : 15,
        fraud_flags: claim.riskFlags?.map(f => f.description) || [],
        is_flagged: claim.status === 'flagged' || claim.riskFlags?.length > 0,
        workflow_state: claim.status === 'pending' ? 
          (managerRole === 'hr' ? 'hr_review' : 'manager_review') : 
          claim.status,
        locked_by: null
      }));

      // Filter based on role and workflow state
      if (managerRole === 'administrator') {
        convertedClaims = convertedClaims.filter(claim => claim.is_flagged || claim.status === 'escalated');
      } else if (managerRole === 'hr') {
        convertedClaims = convertedClaims.filter(claim => 
          claim.status === 'escalated' || 
          claim.workflow_state === 'hr_review' ||
          claim.fraud_score > 50
        );
      } else {
        // Manager role - show pending claims
        convertedClaims = convertedClaims.filter(claim => 
          claim.status === 'pending' || 
          claim.workflow_state === 'manager_review'
        );
      }
      
      console.log(`🔍 Manager dashboard: After filtering, ${convertedClaims.length} claims for ${managerRole}`, convertedClaims);
      setClaims(convertedClaims);

      // If no claims found in primary service, try fallback
      if (allClaims.length === 0) {
        try {
          console.log('🔄 Manager dashboard: Using fallback claims service...');
          const claimsFilter = managerRole === 'administrator' 
            ? { flagged_only: true } 
            : { workflow_state: managerRole === 'hr' ? 'hr_review' : 'manager_review' };
          
          const userContext = {
            id: managerId,
            role: managerRole as 'employee' | 'employer' | 'hr' | 'administrator'
          };
          
          const fetchedClaims = await enhancedClaimsManager.getClaims(claimsFilter, userContext);
          console.log(`🔄 Manager dashboard: Fallback found ${fetchedClaims.length} claims`);
          setClaims(fetchedClaims);
        } catch (fallbackError) {
          console.error('Fallback claims fetch failed:', fallbackError);
        }
      }
      
      console.log(`📋 Loaded ${convertedClaims.length} claims for ${managerRole}`);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to load expense claims');
    } finally {
      setIsLoading(false);
    }
  };

  const filterClaims = () => {
    let filtered = [...claims];

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(claim => claim.status === activeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClaims(filtered);
  };

  const handleApproval = async (claimId: string, action: 'approve' | 'reject', comments?: string) => {
    // Prevent duplicate processing
    if (processingClaims.has(claimId)) {
      toast.error('This claim is already being processed');
      return;
    }

    try {
      setProcessingClaims(prev => new Set(prev).add(claimId));
      
      // Process via Enhanced Claims Data Service first
      const EnhancedClaimsDataService = (await import('../utils/enhancedClaimsDataService')).default;
      await EnhancedClaimsDataService.initialize();
      
      const actionResult = await EnhancedClaimsDataService.handleClaimAction({
        claimId,
        action: action === 'approve' ? 'approved' : 'rejected',
        performedBy: managerId,
        comment: comments
      });

      let result = { success: false, error: 'Unknown error' };
      
      if (actionResult.success) {
        result = { success: true };
        
        // Also update in enhanced claims manager for compatibility
        try {
          await enhancedClaimsManager.processClaim(claimId, action, {
            id: managerId,
            name: managerName,
            role: managerRole
          }, comments);
        } catch (managerError) {
          console.log('Enhanced claims manager update failed, continuing...');
        }
        
        // Create notification for the employee
        try {
          const notificationSystem = await import('../utils/enhancedNotificationSystemFixed').then(m => m.default);
          const system = new notificationSystem();
          const claim = EnhancedClaimsDataService.getClaimById(claimId);
          
          if (claim) {
            await system.createNotification({
              from_user_id: managerId,
              from_user_name: managerName,
              from_user_role: managerRole,
              type: action === 'approve' ? 'claim_approved' : 'claim_rejected',
              metadata: {
                employee_id: claim.employeeId,
                employee_name: claim.employeeName,
                expense_amount: claim.amount,
                currency: claim.currency,
                category: claim.category,
                claim_id: claimId,
                manager_comments: comments
              }
            });
            console.log(`✅ Notification created for ${action}d claim`);
          }
        } catch (notificationError) {
          console.log('Notification system failed, continuing without notifications');
        }
        
      } else {
        // Try fallback to enhanced claims manager
        const fallbackResult = await enhancedClaimsManager.processClaim(claimId, action, {
          id: managerId,
          name: managerName,
          role: managerRole
        }, comments);
        result = fallbackResult;
      }

      if (result.success) {
        toast.success(`Expense claim ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowApprovalDialog(false);
        setSelectedClaim(null);
        setManagerComments('');
        
        // Refresh claims list
        await fetchClaims();
        
        // Trigger real-time update for other users
        window.dispatchEvent(new CustomEvent('logan-claims-updated', {
          detail: { type: 'claim_processed', claimId, action }
        }));
        window.dispatchEvent(new CustomEvent('logan-notification-update'));
        
        // Additional events with delay to ensure propagation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('logan-claims-refresh'));
          window.dispatchEvent(new CustomEvent('logan-data-sync', {
            detail: { type: 'claim_processed', claimId, action }
          }));
        }, 200);
        
      } else {
        toast.error(result.error || `Failed to ${action} claim`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process expense approval');
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const openApprovalDialog = (claim: ExpenseClaim, action: 'approve' | 'reject') => {
    // Check if claim is locked or being processed
    if (processingClaims.has(claim.id) || claim.locked_by) {
      toast.error('This claim is currently being processed by another user');
      return;
    }

    setSelectedClaim(claim);
    setApprovalAction(action);
    setManagerComments('');
    setShowApprovalDialog(true);
  };

  const viewImage = async (url: string, filename: string, receiptId?: string) => {
    try {
      let finalUrl = url;
      let metadata = {};

      // If we have a receipt ID, get enhanced metadata from cloud storage
      if (receiptId) {
        const result = await enhancedCloudStorage.getReceiptFromCloud(receiptId);
        if (result.success && result.metadata) {
          finalUrl = result.url || url;
          metadata = {
            uploadDate: result.metadata.uploadedAt,
            fileSize: result.metadata.size,
            uploadedBy: result.metadata.uploadedBy,
            claimId: result.metadata.claimId
          };
        }
      }

      setSelectedImage({ url: finalUrl, filename, metadata });
    } catch (error) {
      console.error('Error loading receipt details:', error);
      setSelectedImage({ url, filename });
    }
  };

  const getStatusIcon = (claim: ExpenseClaim) => {
    const isHighFraud = (claim.fraud_score || 0) > 70 || claim.is_flagged;
    const isLocked = claim.locked_by || processingClaims.has(claim.id);
    
    if (isLocked) return <Lock className="h-4 w-4 text-blue-600" />;
    if (isHighFraud) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    
    switch (claim.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'escalated':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'under_review':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (claim: ExpenseClaim) => {
    const isHighFraud = (claim.fraud_score || 0) > 70 || claim.is_flagged;
    const isLocked = claim.locked_by || processingClaims.has(claim.id);
    
    if (isLocked) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (isHighFraud) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (claim.status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'escalated':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'ZAR' ? 'R' : 
                   currency === 'USD' ? '$' : 
                   currency === 'EUR' ? '€' : 
                   currency === 'GBP' ? '£' : currency;
    return `${symbol} ${amount.toFixed(2)}`;
  };

  const pendingCount = claims.filter(c => c.status === 'pending' || c.workflow_state === `${managerRole === 'hr' ? 'hr' : managerRole === 'administrator' ? 'admin' : 'manager'}_review`).length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;
  const flaggedCount = claims.filter(c => c.is_flagged).length;
  const escalatedCount = claims.filter(c => c.status === 'escalated').length;

  const totalPendingAmount = claims
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-slate-900">
            {managerRole === 'administrator' ? 'Fraud & Escalated Claims' : 
             managerRole === 'hr' ? 'HR Expense Review' : 
             'Expense Approvals'}
          </h2>
          <p className="text-slate-600">
            {managerRole === 'administrator' ? 'Review flagged and escalated expense claims' :
             managerRole === 'hr' ? 'Review escalated expense claims requiring HR approval' :
             'Review and approve expense claims from your team'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
            {pendingCount} Pending Review
          </Badge>
          {flaggedCount > 0 && (
            <Badge variant="outline" className="text-red-700 bg-red-50">
              {flaggedCount} Flagged
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-yellow-50 border-yellow-200"
          onClick={() => setActiveFilter('pending')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Review</p>
                <p className="text-2xl text-slate-900">{pendingCount}</p>
                <p className="text-xs text-slate-500">R{totalPendingAmount.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-green-50 border-green-200"
          onClick={() => setActiveFilter('approved')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved Today</p>
                <p className="text-2xl text-slate-900">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-red-50 border-red-200"
          onClick={() => setActiveFilter('rejected')}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow bg-orange-50 border-orange-200"
          onClick={() => setActiveFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Flagged</p>
                <p className="text-2xl text-slate-900">{flaggedCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by employee, category, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="bg-white">
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="all">All Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">
                {activeFilter === 'pending' ? 'Claims Awaiting Your Review' :
                 activeFilter === 'approved' ? 'Recently Approved Claims' :
                 activeFilter === 'rejected' ? 'Rejected Claims' :
                 'All Expense Claims'}
              </CardTitle>
              <CardDescription>
                {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''} found
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
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClaims.map((claim) => {
                    const isHighFraud = (claim.fraud_score || 0) > 70 || claim.is_flagged;
                    
                    return (
                      <div 
                        key={claim.id} 
                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                          isHighFraud ? 'border-red-200 bg-red-50' : 
                          (claim.locked_by || processingClaims.has(claim.id)) ? 'border-blue-200 bg-blue-50' :
                          'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              {getStatusIcon(claim)}
                            </div>
                            
                            <div className="flex-1 space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <h3 className="text-slate-900">{claim.employee_name}</h3>
                                  <Badge variant="secondary" className={`border ${getStatusColor(claim)}`}>
                                    {claim.status.toUpperCase()}
                                  </Badge>
                                  {isHighFraud && (
                                    <Badge variant="destructive" className="text-xs">
                                      FLAGGED
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xl text-slate-900">
                                    {formatCurrency(claim.amount, claim.currency)}
                                  </div>
                                  {claim.tax_amount && (
                                    <div className="text-sm text-slate-500">
                                      VAT: {formatCurrency(claim.tax_amount, claim.currency)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Tag className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">Category:</span>
                                  <span className="text-slate-900">{claim.category}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Building className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">Vendor:</span>
                                  <span className="text-slate-900">{claim.vendor}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">Date:</span>
                                  <span className="text-slate-900">{new Date(claim.expense_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">Payment:</span>
                                  <span className="text-slate-900">{claim.payment_method}</span>
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <p className="text-slate-700">{claim.description}</p>
                                {claim.notes && (
                                  <p className="text-sm text-slate-500 mt-1">Note: {claim.notes}</p>
                                )}
                              </div>

                              {/* Fraud Indicators */}
                              {isHighFraud && (
                                <Alert variant="destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>Fraud Alert:</strong> This claim has been flagged for review.
                                    {claim.fraud_flags && claim.fraud_flags.length > 0 && (
                                      <span className="ml-1">
                                        Flags: {claim.fraud_flags.join(', ')}
                                      </span>
                                    )}
                                    {claim.fraud_score && (
                                      <span className="ml-1">
                                        Risk Score: {claim.fraud_score}
                                      </span>
                                    )}
                                  </AlertDescription>
                                </Alert>
                              )}

                              {/* Receipt Files */}
                              {claim.receipt_files && claim.receipt_files.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <Receipt className="w-4 h-4 text-slate-400" />
                                  <span className="text-sm text-slate-600">Attachments:</span>
                                  <div className="flex space-x-2">
                                    {claim.receipt_files.map((file) => (
                                      <Button
                                        key={file.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => viewImage(file.url, file.name)}
                                        className="text-xs"
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        {file.name}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              {(claim.status === 'pending' || claim.workflow_state.includes('review')) && (
                                <div className="flex space-x-2 pt-2 border-t">
                                  {(claim.locked_by || processingClaims.has(claim.id)) ? (
                                    <div className="flex items-center space-x-2 text-blue-600">
                                      <Lock className="w-4 h-4" />
                                      <span className="text-sm">
                                        {processingClaims.has(claim.id) ? 'Processing...' : 'Locked by another user'}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => openApprovalDialog(claim, 'approve')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                        disabled={processingClaims.has(claim.id)}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => openApprovalDialog(claim, 'reject')}
                                        variant="destructive"
                                        size="sm"
                                        disabled={processingClaims.has(claim.id)}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Manager Comments (if approved/rejected) */}
                              {claim.manager_comments && (
                                <div className="bg-slate-50 rounded p-3 mt-2">
                                  <div className="flex items-start space-x-2">
                                    <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
                                    <div>
                                      <p className="text-sm text-slate-600">
                                        <strong>Manager Comment:</strong>
                                      </p>
                                      <p className="text-sm text-slate-700">{claim.manager_comments}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Expense Claim
            </DialogTitle>
            <DialogDescription>
              {selectedClaim && (
                <>
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'} expense claim from{' '}
                  <strong>{selectedClaim.employee_name}</strong> for{' '}
                  <strong>{formatCurrency(selectedClaim.amount, selectedClaim.currency)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">
                {approvalAction === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Add any comments about this approval...' 
                    : 'Please explain why this claim is being rejected...'
                }
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedClaim && handleApproval(selectedClaim.id, approvalAction, managerComments)}
                className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                disabled={approvalAction === 'reject' && !managerComments.trim()}
              >
                {approvalAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
              </Button>
            </div>
          </div>
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
