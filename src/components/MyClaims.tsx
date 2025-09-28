import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { 
  Eye, 
  Search, 
  Filter, 
  Calendar,
  Coins,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';
import { ClaimsViewer, Claim } from './ClaimsViewer';
import { api } from '../utils/api';
import { dataService } from '../utils/supabaseDataService';
import { toast } from 'sonner';
import { enhancedClaimsManager } from '../utils/enhancedClaimsManager';

interface MyClaim {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  receipt_url?: string;
  receipt_filename?: string;
  manager_comments?: string;
  tax_amount?: number;
}

interface MyClaimsProps {
  userId: string;
  title?: string;
}

export function MyClaims({ userId, title = "My Claims" }: MyClaimsProps) {
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<MyClaim[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showClaimsViewer, setShowClaimsViewer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
    
    // Subscribe to real-time updates - employee should see their claims update immediately
    const handleClaimsUpdate = () => {
      console.log('🔄 Employee claims: Received claims update event');
      fetchClaims();
    };

    const handleDataSync = (event: CustomEvent) => {
      console.log('🔄 Employee claims: Received data sync event', event.detail);
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
  }, [userId]);

  useEffect(() => {
    filterClaims();
  }, [claims, activeFilter, searchTerm]);

  const fetchClaims = async () => {
    try {
      setIsLoading(true);
      
      // Timeout-protected initialization and data fetching
      const fetchWithTimeout = Promise.race([
        (async () => {
          // Get claims from Enhanced Claims Data Service (primary source)
          const EnhancedClaimsDataService = (await import('../utils/enhancedClaimsDataService')).default;
          await EnhancedClaimsDataService.initialize();
          
          // Get employee-specific claims
          return EnhancedClaimsDataService.getClaimsByEmployee(userId);
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Claims fetch timeout')), 5000))
      ]);
      
      const userClaims = await fetchWithTimeout as any[];
      console.log(`🔍 Employee MyClaims: Found ${userClaims.length} claims for user ${userId}`, userClaims);
      
      if (userClaims.length > 0) {
        const formattedClaims = userClaims.map(claim => ({
          id: claim.id,
          category: claim.category,
          amount: claim.amount,
          currency: claim.currency,
          description: claim.description,
          date: claim.expenseDate,
          status: claim.status,
          submitted_at: claim.submissionDate,
          receipt_url: claim.receiptUrl || claim.attachments?.[0]?.url,
          receipt_filename: claim.receiptFileName || claim.attachments?.[0]?.fileName,
          manager_comments: claim.comments?.find(c => c.authorRole === 'manager')?.content,
          tax_amount: claim.taxAmount
        }));
        setClaims(formattedClaims);
        return;
      }

      // Fallback to data service if no claims found in primary service
      try {
        const fallbackResult = await dataService.getUserExpenseClaims(userId);
        if (fallbackResult.success && fallbackResult.data) {
          const formattedFallbackClaims = fallbackResult.data.map(claim => ({
            id: claim.id,
            category: claim.category,
            amount: claim.amount,
            currency: claim.currency,
            description: claim.description,
            date: claim.expense_date,
            status: claim.status,
            submitted_at: claim.submitted_at,
            receipt_url: claim.receipt_files?.[0]?.url || claim.receipt_url,
            receipt_filename: claim.receipt_files?.[0]?.name || claim.receipt_filename,
            manager_comments: claim.manager_comments,
            tax_amount: claim.tax_amount
          }));
          setClaims(formattedFallbackClaims);
          console.log(`🔄 Employee MyClaims: Using fallback, found ${formattedFallbackClaims.length} claims`);
        } else {
          setClaims([]);
        }
      } catch (fallbackError) {
        console.log('Fallback claims fetch failed:', fallbackError);
        setClaims([]); // Set empty array if both fail
      }
      
    } catch (error) {
      console.error('Error fetching claims:', error);
      setClaims([]); // Set empty array on error
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
        claim.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClaims(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `R ${amount.toFixed(2)}`;
  };

  const convertToClaimFormat = (myClaim: MyClaim): Claim => ({
    id: myClaim.id,
    employee_id: userId,
    employee_name: 'You',
    amount: myClaim.amount,
    currency: myClaim.currency,
    category: myClaim.category,
    description: myClaim.description,
    date: myClaim.date,
    receipt_url: myClaim.receipt_url,
    receipt_filename: myClaim.receipt_filename,
    status: myClaim.status,
    submitted_at: myClaim.submitted_at,
    manager_comments: myClaim.manager_comments,
    tax_amount: myClaim.tax_amount,
    fraud_score: 15, // Low score for employee's own claims
    fraud_flags: [],
    is_flagged: false
  });

  const handleViewClaim = (claim: MyClaim) => {
    setSelectedClaim(convertToClaimFormat(claim));
    setShowClaimsViewer(true);
  };

  const handleCloseViewer = () => {
    setShowClaimsViewer(false);
    setSelectedClaim(null);
  };

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;
  const totalApproved = claims
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">{title}</h2>
          <p className="text-slate-600">Track your submitted expense claims and their status</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-yellow-700 bg-yellow-50">
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="text-green-700 bg-green-50">
            {approvedCount} Approved
          </Badge>
        </div>
      </div>

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
                <p className="text-sm text-slate-500">Approved Claims</p>
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
                <p className="text-sm text-slate-500">Total Approved</p>
                <p className="text-2xl text-slate-900">R{totalApproved.toLocaleString()}</p>
              </div>
              <Coins className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rejected Claims</p>
                <p className="text-2xl text-slate-900">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by category or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="bg-white">
          <TabsTrigger value="all">All Claims ({claims.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Claims History</CardTitle>
              <CardDescription>
                {activeFilter === 'all' ? 'All your submitted claims' : 
                 activeFilter === 'pending' ? 'Claims awaiting manager review' :
                 activeFilter === 'approved' ? 'Approved and processed claims' :
                 'Claims that were rejected'}
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
                  {filteredClaims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            {getStatusIcon(claim.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-slate-900">{claim.category}</h3>
                              <Badge variant="secondary" className={getStatusColor(claim.status)}>
                                {claim.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-slate-600 mb-2">{claim.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(claim.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
                              </div>
                            </div>
                            {claim.manager_comments && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                <p className="text-slate-600">
                                  <strong>Manager Comment:</strong> {claim.manager_comments}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl text-slate-900 mb-2">
                            {formatCurrency(claim.amount, claim.currency)}
                          </div>
                          {claim.tax_amount && (
                            <div className="text-sm text-slate-500 mb-2">
                              Tax: R{claim.tax_amount.toFixed(2)}
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClaim(claim)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Claims Viewer */}
      <ClaimsViewer
        isOpen={showClaimsViewer}
        onClose={handleCloseViewer}
        claim={selectedClaim}
        canManage={false}
        showFraudDetails={false}
      />
    </div>
  );
}
