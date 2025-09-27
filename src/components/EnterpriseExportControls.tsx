/**
 * Enterprise Export Controls Component
 * Advanced export functionality with PDF/Excel exports and pivoted data
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { DatePicker } from './ui/date-picker';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import {
  Download,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Filter,
  Calendar,
  Users,
  Building,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { enterpriseExportManager, type ExportData } from '../utils/enterpriseExportManager';
import { enhancedClaimsManager } from '../utils/enhancedClaimsManager';
import { format } from 'date-fns';

interface ExportFilters {
  dateRange: {
    start?: Date;
    end?: Date;
  };
  departments: string[];
  categories: string[];
  statuses: string[];
  employees: string[];
  amountRange: {
    min?: number;
    max?: number;
  };
  includeFlags: boolean;
  includeFraud: boolean;
}

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeAnalytics: boolean;
  includePivotTables: boolean;
  includeCharts: boolean;
  includeImages: boolean;
  customTitle?: string;
}

export function EnterpriseExportControls() {
  const [activeTab, setActiveTab] = useState('quick');
  const [filters, setFilters] = useState<ExportFilters>({
    dateRange: {},
    departments: [],
    categories: [],
    statuses: [],
    employees: [],
    amountRange: {},
    includeFlags: false,
    includeFraud: false
  });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeAnalytics: true,
    includePivotTables: true,
    includeCharts: true,
    includeImages: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [availableData, setAvailableData] = useState<{
    departments: string[];
    categories: string[];
    employees: string[];
    totalClaims: number;
    dateRange: { earliest: Date; latest: Date };
  } | null>(null);

  React.useEffect(() => {
    loadAvailableData();
  }, []);

  const loadAvailableData = async () => {
    try {
      // Get all claims for administrators/HR roles (broad access)
      const claims = await enhancedClaimsManager.getClaims({}, {
        id: 'system',
        role: 'administrator'
      });
      
      if (claims.length === 0) {
        setAvailableData({
          departments: [],
          categories: [],
          employees: [],
          totalClaims: 0,
          dateRange: { earliest: new Date(), latest: new Date() }
        });
        return;
      }

      const departments = [...new Set(claims.map(c => c.department))];
      const categories = [...new Set(claims.map(c => c.category))];
      const employees = [...new Set(claims.map(c => c.employee_name))];
      
      const dates = claims.map(c => new Date(c.expense_date)).sort((a, b) => a.getTime() - b.getTime());
      const earliest = dates[0];
      const latest = dates[dates.length - 1];

      setAvailableData({
        departments,
        categories,
        employees,
        totalClaims: claims.length,
        dateRange: { earliest, latest }
      });
    } catch (error) {
      console.error('Error loading available data:', error);
      toast.error('Failed to load available data');
    }
  };

  const handleQuickExport = async (format: 'pdf' | 'excel', preset: 'all' | 'pending' | 'approved' | 'flagged') => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Preparing data...');

    try {
      // Set filters based on preset
      let statusFilter = {};
      switch (preset) {
        case 'pending':
          statusFilter = { status: 'pending' };
          break;
        case 'approved':
          statusFilter = { status: 'approved' };
          break;
        case 'flagged':
          statusFilter = { flagged_only: true };
          break;
        default:
          statusFilter = {};
      }

      setExportProgress(25);
      setExportStatus('Fetching claims data...');

      const claims = await enhancedClaimsManager.getClaims(statusFilter, {
        id: 'system',
        role: 'administrator'
      });
      const exportData: ExportData[] = claims.map(claim => ({
        id: claim.id,
        employee_name: claim.employee_name,
        employee_id: claim.employee_id,
        department: claim.department,
        category: claim.category,
        vendor: claim.vendor,
        amount: claim.amount,
        currency: claim.currency,
        tax_amount: claim.tax_amount,
        expense_date: claim.expense_date,
        submission_date: claim.submission_date || claim.created_at,
        status: claim.status,
        workflow_state: claim.workflow_state,
        description: claim.description,
        payment_method: claim.payment_method,
        manager_comments: claim.manager_comments,
        fraud_score: claim.fraud_score,
        is_flagged: claim.is_flagged,
        approved_by: claim.approved_by,
        approved_at: claim.approved_at,
        rejected_by: claim.rejected_by,
        rejected_at: claim.rejected_at
      }));

      if (exportData.length === 0) {
        toast.error('No data found for the selected criteria');
        return;
      }

      setExportProgress(50);
      setExportStatus(`Generating ${format.toUpperCase()} report...`);

      const title = `Logan Freights - ${preset.charAt(0).toUpperCase() + preset.slice(1)} Expense Report`;
      
      if (format === 'pdf') {
        const pdfBlob = await enterpriseExportManager.exportToPDF(exportData, {
          title,
          includeAnalytics: true,
          filterInfo: `${preset} claims (${exportData.length} records)`
        });
        
        setExportProgress(90);
        setExportStatus('Downloading file...');
        
        const filename = `logan_freights_${preset}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
        enterpriseExportManager.downloadFile(pdfBlob, filename, 'pdf');
      } else {
        const excelBlob = await enterpriseExportManager.exportToExcel(exportData, {
          includeAnalytics: true,
          includePivotTables: true
        });
        
        setExportProgress(90);
        setExportStatus('Downloading file...');
        
        const filename = `logan_freights_${preset}_${format(new Date(), 'yyyy-MM-dd')}`;
        enterpriseExportManager.downloadFile(excelBlob, filename, 'xlsx');
      }

      setExportProgress(100);
      setExportStatus('Export completed!');
      
      toast.success(`${format.toUpperCase()} export completed successfully`);
      
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.');
      setExportStatus('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Applying filters...');

    try {
      // Build filter object
      const filterObj: any = {};
      
      if (filters.statuses.length > 0) {
        filterObj.status = filters.statuses;
      }
      
      if (filters.departments.length > 0) {
        filterObj.departments = filters.departments;
      }
      
      if (filters.includeFlags) {
        filterObj.flagged_only = true;
      }

      setExportProgress(25);
      setExportStatus('Fetching filtered data...');

      let claims = await enhancedClaimsManager.getClaims(filterObj, {
        id: 'system',
        role: 'administrator'
      });

      // Apply additional filters
      if (filters.dateRange.start || filters.dateRange.end) {
        claims = claims.filter(claim => {
          const claimDate = new Date(claim.expense_date);
          const afterStart = !filters.dateRange.start || claimDate >= filters.dateRange.start;
          const beforeEnd = !filters.dateRange.end || claimDate <= filters.dateRange.end;
          return afterStart && beforeEnd;
        });
      }

      if (filters.categories.length > 0) {
        claims = claims.filter(claim => filters.categories.includes(claim.category));
      }

      if (filters.employees.length > 0) {
        claims = claims.filter(claim => filters.employees.includes(claim.employee_name));
      }

      if (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined) {
        claims = claims.filter(claim => {
          const amount = claim.amount;
          const aboveMin = filters.amountRange.min === undefined || amount >= filters.amountRange.min;
          const belowMax = filters.amountRange.max === undefined || amount <= filters.amountRange.max;
          return aboveMin && belowMax;
        });
      }

      if (filters.includeFraud) {
        claims = claims.filter(claim => (claim.fraud_score || 0) > 50);
      }

      setExportProgress(50);
      setExportStatus('Preparing export data...');

      const exportData: ExportData[] = claims.map(claim => ({
        id: claim.id,
        employee_name: claim.employee_name,
        employee_id: claim.employee_id,
        department: claim.department,
        category: claim.category,
        vendor: claim.vendor,
        amount: claim.amount,
        currency: claim.currency,
        tax_amount: claim.tax_amount,
        expense_date: claim.expense_date,
        submission_date: claim.submission_date || claim.created_at,
        status: claim.status,
        workflow_state: claim.workflow_state,
        description: claim.description,
        payment_method: claim.payment_method,
        manager_comments: claim.manager_comments,
        fraud_score: claim.fraud_score,
        is_flagged: claim.is_flagged,
        approved_by: claim.approved_by,
        approved_at: claim.approved_at,
        rejected_by: claim.rejected_by,
        rejected_at: claim.rejected_at
      }));

      if (exportData.length === 0) {
        toast.error('No data found matching the selected criteria');
        return;
      }

      setExportProgress(75);
      setExportStatus(`Generating ${exportOptions.format.toUpperCase()} report...`);

      const filterInfo = [
        filters.dateRange.start && `From: ${format(filters.dateRange.start, 'dd/MM/yyyy')}`,
        filters.dateRange.end && `To: ${format(filters.dateRange.end, 'dd/MM/yyyy')}`,
        filters.departments.length > 0 && `Departments: ${filters.departments.join(', ')}`,
        filters.categories.length > 0 && `Categories: ${filters.categories.join(', ')}`,
        filters.statuses.length > 0 && `Status: ${filters.statuses.join(', ')}`,
        filters.employees.length > 0 && `Employees: ${filters.employees.slice(0, 3).join(', ')}${filters.employees.length > 3 ? '...' : ''}`,
        filters.amountRange.min && `Min Amount: R${filters.amountRange.min}`,
        filters.amountRange.max && `Max Amount: R${filters.amountRange.max}`,
        filters.includeFlags && 'Flagged Claims Only',
        filters.includeFraud && 'High Fraud Risk Only'
      ].filter(Boolean).join(' | ');

      const title = exportOptions.customTitle || 'Logan Freights - Custom Expense Report';

      if (exportOptions.format === 'pdf') {
        const pdfBlob = await enterpriseExportManager.exportToPDF(exportData, {
          title,
          includeAnalytics: exportOptions.includeAnalytics,
          filterInfo
        });
        
        setExportProgress(95);
        setExportStatus('Downloading PDF...');
        
        const filename = `logan_freights_custom_${format(new Date(), 'yyyy-MM-dd_HH-mm')}`;
        enterpriseExportManager.downloadFile(pdfBlob, filename, 'pdf');
      } else {
        const excelBlob = await enterpriseExportManager.exportToExcel(exportData, {
          includeAnalytics: exportOptions.includeAnalytics,
          includePivotTables: exportOptions.includePivotTables
        });
        
        setExportProgress(95);
        setExportStatus('Downloading Excel...');
        
        const filename = `logan_freights_custom_${format(new Date(), 'yyyy-MM-dd')}`;
        enterpriseExportManager.downloadFile(excelBlob, filename, 'xlsx');
      }

      setExportProgress(100);
      setExportStatus('Export completed!');
      
      toast.success(`Advanced ${exportOptions.format.toUpperCase()} export completed successfully`);
      
      setTimeout(() => {
        setExportProgress(0);
        setExportStatus('');
      }, 2000);

    } catch (error) {
      console.error('Advanced export error:', error);
      toast.error('Advanced export failed. Please try again.');
      setExportStatus('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const renderQuickExports = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Quick Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-red-600" />
              <span>PDF Reports</span>
            </CardTitle>
            <CardDescription>
              Generate formatted PDF reports with analytics and pivot summaries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleQuickExport('pdf', 'all')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              All Claims Report
            </Button>
            <Button
              onClick={() => handleQuickExport('pdf', 'pending')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending Approvals
            </Button>
            <Button
              onClick={() => handleQuickExport('pdf', 'approved')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approved Claims
            </Button>
            <Button
              onClick={() => handleQuickExport('pdf', 'flagged')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Flagged Claims
            </Button>
          </CardContent>
        </Card>

        {/* Excel Quick Exports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <span>Excel Workbooks</span>
            </CardTitle>
            <CardDescription>
              Generate Excel files with multiple sheets and pivot tables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleQuickExport('excel', 'all')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Complete Dataset
            </Button>
            <Button
              onClick={() => handleQuickExport('excel', 'pending')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending Analysis
            </Button>
            <Button
              onClick={() => handleQuickExport('excel', 'approved')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Financial Summary
            </Button>
            <Button
              onClick={() => handleQuickExport('excel', 'flagged')}
              disabled={isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Risk Assessment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Data Overview */}
      {availableData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Available Data Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl text-slate-900">{availableData.totalClaims}</div>
                <div className="text-sm text-slate-500">Total Claims</div>
              </div>
              <div className="text-center">
                <div className="text-2xl text-slate-900">{availableData.departments.length}</div>
                <div className="text-sm text-slate-500">Departments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl text-slate-900">{availableData.categories.length}</div>
                <div className="text-sm text-slate-500">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl text-slate-900">{availableData.employees.length}</div>
                <div className="text-sm text-slate-500">Employees</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600 text-center">
              Data Range: {format(availableData.dateRange.earliest, 'dd/MM/yyyy')} - {format(availableData.dateRange.latest, 'dd/MM/yyyy')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAdvancedFilters = () => (
    <div className="space-y-6">
      {/* Export Format & Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format & Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select value={exportOptions.format} onValueChange={(value: 'pdf' | 'excel') => 
              setExportOptions(prev => ({ ...prev, format: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="excel">Excel Workbook (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAnalytics"
                checked={exportOptions.includeAnalytics}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeAnalytics: checked as boolean }))
                }
              />
              <Label htmlFor="includeAnalytics">Include Analytics</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePivotTables"
                checked={exportOptions.includePivotTables}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includePivotTables: checked as boolean }))
                }
              />
              <Label htmlFor="includePivotTables">Include Pivot Tables</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={exportOptions.includeCharts}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeCharts: checked as boolean }))
                }
              />
              <Label htmlFor="includeCharts">Include Charts</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeImages"
                checked={exportOptions.includeImages}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeImages: checked as boolean }))
                }
              />
              <Label htmlFor="includeImages">Include Receipt Images</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Date Range</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <DatePicker
                selected={filters.dateRange.start}
                onSelect={(date) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: date || undefined }
                }))}
                placeholder="Select start date"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <DatePicker
                selected={filters.dateRange.end}
                onSelect={(date) => setFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: date || undefined }
                }))}
                placeholder="Select end date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category & Department Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Departments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableData?.departments.map(dept => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={filters.departments.includes(dept)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          departments: [...prev.departments, dept]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          departments: prev.departments.filter(d => d !== dept)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableData?.categories.map(cat => (
                <div key={cat} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cat-${cat}`}
                    checked={filters.categories.includes(cat)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          categories: [...prev.categories, cat]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          categories: prev.categories.filter(c => c !== cat)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={`cat-${cat}`} className="text-sm">{cat}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Advanced Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleAdvancedExport}
          disabled={isExporting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Generate Advanced Export
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span>Enterprise Export Manager</span>
          </CardTitle>
          <CardDescription>
            Generate comprehensive PDF and Excel reports with advanced analytics and pivoted data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Export Progress */}
          {isExporting && (
            <Alert className="mb-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{exportStatus}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Exports</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Filters</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="mt-6">
              {renderQuickExports()}
            </TabsContent>

            <TabsContent value="advanced" className="mt-6">
              {renderAdvancedFilters()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
