import { dataService } from './supabaseDataService';
import { enhancedClaimsDataService } from './enhancedClaimsDataService';
import type { ExpenseClaim } from './supabaseDataService';

export interface ExportData {
  claims: ExpenseClaim[];
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  categories: Record<string, number>;
  departments: Record<string, number>;
  timeline: Array<{ date: string; amount: number; count: number }>;
}

export interface ExportFilters {
  dateRange?: { start: Date; end: Date };
  departments?: string[];
  categories?: string[];
  statuses?: string[];
  employeeIds?: string[];
  amountRange?: { min: number; max: number };
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeDetails: boolean;
  includeSummary: boolean;
  pivotBy?: 'department' | 'category' | 'employee' | 'month';
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  filename?: string;
  url?: string;
  error?: string;
}

/**
 * Logan Freights Enterprise Export Manager
 * Advanced export functionality with PDF/Excel exports and pivoted data
 */
class EnterpriseExportManager {
  
  /**
   * Export expense data with advanced filtering and formatting
   */
  async exportExpenseData(
    filters: ExportFilters,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log('📊 Starting enterprise export with filters:', filters);

      // Get filtered data
      const exportData = await this.getFilteredData(filters);
      
      if (!exportData.claims.length) {
        return {
          success: false,
          error: 'No data found matching the selected filters'
        };
      }

      // Generate export based on format
      switch (options.format) {
        case 'pdf':
          return await this.generatePDFExport(exportData, options);
        case 'excel':
          return await this.generateExcelExport(exportData, options);
        case 'csv':
          return await this.generateCSVExport(exportData, options);
        case 'json':
          return await this.generateJSONExport(exportData, options);
        default:
          return {
            success: false,
            error: `Unsupported export format: ${options.format}`
          };
      }

    } catch (error) {
      console.error('❌ Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Generate comprehensive financial report
   */
  async generateFinancialReport(
    filters: ExportFilters,
    includeCharts: boolean = true
  ): Promise<ExportResult> {
    try {
      const exportData = await this.getFilteredData(filters);
      
      // Generate comprehensive report data
      const reportData = {
        summary: {
          totalExpenses: exportData.totalAmount,
          totalClaims: exportData.totalCount,
          averageClaim: exportData.averageAmount,
          periodStart: filters.dateRange?.start?.toISOString(),
          periodEnd: filters.dateRange?.end?.toISOString(),
          generatedAt: new Date().toISOString()
        },
        breakdowns: {
          byCategory: exportData.categories,
          byDepartment: exportData.departments,
          timeline: exportData.timeline
        },
        details: exportData.claims.map(claim => ({
          id: claim.id,
          employee: claim.employee_name,
          department: claim.department,
          category: claim.category,
          amount: claim.amount,
          currency: claim.currency,
          date: claim.expense_date,
          status: claim.status,
          description: claim.description
        }))
      };

      // Convert to JSON string for now (can be enhanced for PDF/Excel)
      const jsonData = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });

      return {
        success: true,
        data: blob,
        filename: `logan-freights-financial-report-${new Date().toISOString().split('T')[0]}.json`,
        url: URL.createObjectURL(blob)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  /**
   * Export data for IFRS compliance
   */
  async exportIFRSCompliantData(
    filters: ExportFilters
  ): Promise<ExportResult> {
    try {
      const exportData = await this.getFilteredData(filters);
      
      // Format for IFRS compliance
      const ifrsData = {
        metadata: {
          company: 'Logan Freights Logistics CC',
          reportType: 'Expense Claims Report',
          standard: 'IFRS 15 - Revenue from Contracts with Customers',
          currency: 'ZAR',
          generatedAt: new Date().toISOString(),
          periodStart: filters.dateRange?.start?.toISOString(),
          periodEnd: filters.dateRange?.end?.toISOString()
        },
        summary: {
          totalOperatingExpenses: exportData.totalAmount,
          claimsCount: exportData.totalCount,
          currencyBreakdown: this.getCurrencyBreakdown(exportData.claims)
        },
        categories: Object.entries(exportData.categories).map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / exportData.totalAmount) * 100
        })),
        transactions: exportData.claims.map(claim => ({
          transactionId: claim.id,
          date: claim.expense_date,
          description: claim.description,
          amount: claim.amount,
          currency: claim.currency,
          category: claim.category,
          department: claim.department,
          employee: claim.employee_name,
          status: claim.status,
          approvedBy: claim.approved_by,
          approvedAt: claim.approved_at
        }))
      };

      const csvData = this.convertToCSV(ifrsData.transactions);
      const blob = new Blob([csvData], { type: 'text/csv' });

      return {
        success: true,
        data: blob,
        filename: `logan-freights-ifrs-expenses-${new Date().toISOString().split('T')[0]}.csv`,
        url: URL.createObjectURL(blob)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'IFRS export failed'
      };
    }
  }

  /**
   * Get filtered and aggregated data
   */
  private async getFilteredData(filters: ExportFilters): Promise<ExportData> {
    // Get all claims (in a real implementation, this would be filtered server-side)
    const allClaims = await dataService.getAllClaims();
    
    // Apply filters
    let filteredClaims = allClaims;

    if (filters.dateRange) {
      filteredClaims = filteredClaims.filter(claim => {
        const claimDate = new Date(claim.expense_date);
        return claimDate >= filters.dateRange!.start && claimDate <= filters.dateRange!.end;
      });
    }

    if (filters.departments?.length) {
      filteredClaims = filteredClaims.filter(claim => 
        filters.departments!.includes(claim.department)
      );
    }

    if (filters.categories?.length) {
      filteredClaims = filteredClaims.filter(claim => 
        filters.categories!.includes(claim.category)
      );
    }

    if (filters.statuses?.length) {
      filteredClaims = filteredClaims.filter(claim => 
        filters.statuses!.includes(claim.status)
      );
    }

    if (filters.employeeIds?.length) {
      filteredClaims = filteredClaims.filter(claim => 
        filters.employeeIds!.includes(claim.employee_id)
      );
    }

    if (filters.amountRange) {
      filteredClaims = filteredClaims.filter(claim => 
        claim.amount >= filters.amountRange!.min && 
        claim.amount <= filters.amountRange!.max
      );
    }

    // Calculate aggregates
    const totalAmount = filteredClaims.reduce((sum, claim) => sum + claim.amount, 0);
    const totalCount = filteredClaims.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // Group by category
    const categories: Record<string, number> = {};
    filteredClaims.forEach(claim => {
      categories[claim.category] = (categories[claim.category] || 0) + claim.amount;
    });

    // Group by department
    const departments: Record<string, number> = {};
    filteredClaims.forEach(claim => {
      departments[claim.department] = (departments[claim.department] || 0) + claim.amount;
    });

    // Generate timeline
    const timeline = this.generateTimeline(filteredClaims);

    return {
      claims: filteredClaims,
      totalAmount,
      totalCount,
      averageAmount,
      categories,
      departments,
      timeline
    };
  }

  /**
   * Generate PDF export (simplified)
   */
  private async generatePDFExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    // In a real implementation, this would use a PDF library like jsPDF
    // For now, return HTML that can be printed as PDF
    const htmlContent = this.generateHTMLReport(data, options);
    const blob = new Blob([htmlContent], { type: 'text/html' });

    return {
      success: true,
      data: blob,
      filename: `logan-freights-expenses-${new Date().toISOString().split('T')[0]}.html`,
      url: URL.createObjectURL(blob)
    };
  }

  /**
   * Generate Excel export (simplified)
   */
  private async generateExcelExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Convert to CSV format (can be opened in Excel)
    const csvData = this.convertClaimsToCSV(data.claims, options);
    const blob = new Blob([csvData], { type: 'text/csv' });

    return {
      success: true,
      data: blob,
      filename: `logan-freights-expenses-${new Date().toISOString().split('T')[0]}.csv`,
      url: URL.createObjectURL(blob)
    };
  }

  /**
   * Generate CSV export
   */
  private async generateCSVExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const csvData = this.convertClaimsToCSV(data.claims, options);
    const blob = new Blob([csvData], { type: 'text/csv' });

    return {
      success: true,
      data: blob,
      filename: `logan-freights-expenses-${new Date().toISOString().split('T')[0]}.csv`,
      url: URL.createObjectURL(blob)
    };
  }

  /**
   * Generate JSON export
   */
  private async generateJSONExport(
    data: ExportData,
    options: ExportOptions
  ): Promise<ExportResult> {
    const exportObject = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalClaims: data.totalCount,
        totalAmount: data.totalAmount,
        options
      },
      summary: options.includeSummary ? {
        totalAmount: data.totalAmount,
        totalCount: data.totalCount,
        averageAmount: data.averageAmount,
        categories: data.categories,
        departments: data.departments
      } : undefined,
      timeline: options.includeCharts ? data.timeline : undefined,
      claims: options.includeDetails ? data.claims : undefined
    };

    const jsonData = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });

    return {
      success: true,
      data: blob,
      filename: `logan-freights-expenses-${new Date().toISOString().split('T')[0]}.json`,
      url: URL.createObjectURL(blob)
    };
  }

  /**
   * Convert claims to CSV format
   */
  private convertClaimsToCSV(claims: ExpenseClaim[], options: ExportOptions): string {
    const headers = [
      'ID', 'Employee', 'Department', 'Category', 'Amount', 'Currency',
      'Description', 'Expense Date', 'Status', 'Submitted At', 'Approved By', 'Approved At'
    ];

    const rows = claims.map(claim => [
      claim.id,
      claim.employee_name,
      claim.department,
      claim.category,
      claim.amount.toString(),
      claim.currency,
      `"${claim.description.replace(/"/g, '""')}"`, // Escape quotes in CSV
      claim.expense_date,
      claim.status,
      claim.submitted_at,
      claim.approved_by || '',
      claim.approved_at || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Convert object to CSV
   */
  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(data: ExportData, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Logan Freights Expense Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .summary-item { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .amount { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Logan Freights Logistics CC</h1>
        <h2>Expense Claims Report</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    ${options.includeSummary ? `
    <div class="summary">
        <div class="summary-item">
            <h3>R${data.totalAmount.toLocaleString()}</h3>
            <p>Total Amount</p>
        </div>
        <div class="summary-item">
            <h3>${data.totalCount}</h3>
            <p>Total Claims</p>
        </div>
        <div class="summary-item">
            <h3>R${data.averageAmount.toLocaleString()}</h3>
            <p>Average Claim</p>
        </div>
    </div>
    ` : ''}
    
    ${options.includeDetails ? `
    <table>
        <thead>
            <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Category</th>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${data.claims.map(claim => `
            <tr>
                <td>${claim.employee_name}</td>
                <td>${claim.department}</td>
                <td>${claim.category}</td>
                <td>${claim.description}</td>
                <td>${new Date(claim.expense_date).toLocaleDateString()}</td>
                <td class="amount">R${claim.amount.toLocaleString()}</td>
                <td>${claim.status}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : ''}
</body>
</html>`;
  }

  /**
   * Generate timeline data
   */
  private generateTimeline(claims: ExpenseClaim[]): Array<{ date: string; amount: number; count: number }> {
    const timeline: Record<string, { amount: number; count: number }> = {};

    claims.forEach(claim => {
      const date = new Date(claim.expense_date).toISOString().split('T')[0];
      if (!timeline[date]) {
        timeline[date] = { amount: 0, count: 0 };
      }
      timeline[date].amount += claim.amount;
      timeline[date].count += 1;
    });

    return Object.entries(timeline)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get currency breakdown
   */
  private getCurrencyBreakdown(claims: ExpenseClaim[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    claims.forEach(claim => {
      breakdown[claim.currency] = (breakdown[claim.currency] || 0) + claim.amount;
    });
    return breakdown;
  }
}

// Export singleton instance
export const enterpriseExportManager = new EnterpriseExportManager();

// Export utility functions
export const exportExpenseData = (filters: ExportFilters, options: ExportOptions) =>
  enterpriseExportManager.exportExpenseData(filters, options);

export const generateFinancialReport = (filters: ExportFilters, includeCharts?: boolean) =>
  enterpriseExportManager.generateFinancialReport(filters, includeCharts);

export const exportIFRSCompliantData = (filters: ExportFilters) =>
  enterpriseExportManager.exportIFRSCompliantData(filters);