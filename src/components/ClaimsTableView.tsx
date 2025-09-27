import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, 
  Filter,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '../utils/dataStore';
import { pdfExporter } from '../utils/pdfExport';

interface ClaimsTableViewProps {
  currentUserId: string;
  userRole: 'employer' | 'hr' | 'administrator';
  title?: string;
}

interface TableClaim {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  vendor: string;
  expense_date: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  manager_comments?: string;
  tax_amount?: number;
  is_flagged?: boolean;
}

type SortField = 'submitted_at' | 'amount' | 'employee_name' | 'department' | 'category' | 'status' | 'expense_date';
type SortOrder = 'asc' | 'desc';

export function ClaimsTableView({ currentUserId, userRole, title = "Claims Table View" }: ClaimsTableViewProps) {
  const [claims, setClaims] = useState<TableClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<TableClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isExporting, setIsExporting] = useState(false);

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
  }, [claims, searchTerm, statusFilter, departmentFilter, categoryFilter, sortField, sortOrder]);

  const fetchClaims = () => {
    try {
      setIsLoading(true);
      
      // Get claims from last 3 months
      let claimsData = dataStore.getClaimsLastThreeMonths();
      
      // Filter based on user role
      if (userRole === 'employer') {
        claimsData = dataStore.getClaims({ manager_id: currentUserId });
        // Still filter for last 3 months
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        claimsData = claimsData.filter(claim => 
          new Date(claim.submitted_at) >= threeMonthsAgo
        );
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

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(claim => claim.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'employee_name':
          aValue = a.employee_name.toLowerCase();
          bValue = b.employee_name.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'ZAR' ? 'R' : 
                   currency === 'USD' ? '$' : 
                   currency === 'EUR' ? '€' : 
                   currency === 'GBP' ? '£' : currency;
    return `${symbol} ${amount.toLocaleString()}`;
  };

  const getStatusIcon = (status: string, isHighFraud: boolean = false) => {
    if (isHighFraud) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
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
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      await pdfExporter.exportClaimsReport({
        title: `${title} - Last 3 Months`,
        includeCharts: true,
        includeTables: true,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        filterBy: statusFilter !== 'all' ? statusFilter : undefined
      });
      
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = [
      ['Claim ID', 'Employee', 'Department', 'Category', 'Amount', 'Currency', 'Status', 'Expense Date', 'Submitted Date', 'Description', 'Vendor', 'Manager Comments'].join(','),
      ...filteredClaims.map(claim => [
        claim.id,
        claim.employee_name,
        claim.department,
        claim.category,
        claim.amount.toFixed(2),
        claim.currency,
        claim.status,
        claim.expense_date,
        new Date(claim.submitted_at).toLocaleDateString(),
        `"${claim.description.replace(/"/g, '""')}"`,
        claim.vendor,
        `"${(claim.manager_comments || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claims_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV report exported successfully');
  };

  // Pagination
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClaims = filteredClaims.slice(startIndex, endIndex);

  const uniqueDepartments = [...new Set(claims.map(c => c.department))];
  const uniqueCategories = [...new Set(claims.map(c => c.category))];

  const summaryStats = {
    total: filteredClaims.length,
    approved: filteredClaims.filter(c => c.status === 'approved').length,
    pending: filteredClaims.filter(c => c.status === 'pending').length,
    rejected: filteredClaims.filter(c => c.status === 'rejected').length,
    totalAmount: filteredClaims.reduce((sum, c) => sum + c.amount, 0),
    approvedAmount: filteredClaims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl text-slate-900">{title}</h2>
          <p className="text-slate-600">Comprehensive table view of all claims from the last 3 months</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            variant="outline" 
            size="sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Claims</p>
                <p className="text-2xl text-slate-900">{summaryStats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-2xl text-slate-900">{summaryStats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl text-slate-900">{summaryStats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="text-2xl text-slate-900">{summaryStats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Amount</p>
                <p className="text-xl text-slate-900">R {summaryStats.totalAmount.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Approved Value</p>
                <p className="text-xl text-slate-900">R {summaryStats.approvedAmount.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDepartmentFilter('all');
                setCategoryFilter('all');
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Claims Data</CardTitle>
          <CardDescription>
            Showing {currentClaims.length} of {filteredClaims.length} claims
            {filteredClaims.length !== claims.length && ` (filtered from ${claims.length} total)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading claims...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('id')}
                        className="p-0 h-auto"
                      >
                        Claim ID {getSortIcon('id' as SortField)}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('employee_name')}
                        className="p-0 h-auto"
                      >
                        Employee {getSortIcon('employee_name')}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('department')}
                        className="p-0 h-auto"
                      >
                        Department {getSortIcon('department')}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('category')}
                        className="p-0 h-auto"
                      >
                        Category {getSortIcon('category')}
                      </Button>
                    </th>
                    <th className="text-right py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('amount')}
                        className="p-0 h-auto"
                      >
                        Amount {getSortIcon('amount')}
                      </Button>
                    </th>
                    <th className="text-center py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('status')}
                        className="p-0 h-auto"
                      >
                        Status {getSortIcon('status')}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('expense_date')}
                        className="p-0 h-auto"
                      >
                        Expense Date {getSortIcon('expense_date')}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleSort('submitted_at')}
                        className="p-0 h-auto"
                      >
                        Submitted {getSortIcon('submitted_at')}
                      </Button>
                    </th>
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-left py-3 px-2">Vendor</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClaims.map((claim) => {
                    const isHighFraud = claim.is_flagged;
                    
                    return (
                      <tr key={claim.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-900">{claim.id}</span>
                            {isHighFraud && (
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-900">{claim.employee_name}</td>
                        <td className="py-3 px-2 text-slate-600">{claim.department}</td>
                        <td className="py-3 px-2 text-slate-600">{claim.category}</td>
                        <td className="py-3 px-2 text-right text-slate-900">
                          {formatCurrency(claim.amount, claim.currency)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant="outline" className={`border ${getStatusColor(claim.status, isHighFraud)}`}>
                            {claim.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {new Date(claim.expense_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-slate-600">
                          {new Date(claim.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-slate-600 max-w-xs truncate" title={claim.description}>
                          {claim.description}
                        </td>
                        <td className="py-3 px-2 text-slate-600">{claim.vendor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-slate-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredClaims.length)} of {filteredClaims.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
