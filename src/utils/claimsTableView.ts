import { supabase } from './supabase/client';
import { dataService, type ExpenseClaim } from './supabaseDataService';

export interface TableViewConfig {
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: TableFilters;
  columns: TableColumn[];
}

export interface TableFilters {
  status?: string[];
  department?: string[];
  category?: string[];
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
  search?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  visible: boolean;
  width?: number;
  format?: 'currency' | 'date' | 'text' | 'status';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Logan Freights Claims Table View Service
 * Advanced data table management with sorting, filtering, and pagination
 */
class ClaimsTableViewService {
  
  private readonly defaultColumns: TableColumn[] = [
    { key: 'id', label: 'Claim ID', sortable: true, visible: true, width: 120 },
    { key: 'employee_name', label: 'Employee', sortable: true, visible: true, width: 150 },
    { key: 'department', label: 'Department', sortable: true, visible: true, width: 120 },
    { key: 'category', label: 'Category', sortable: true, visible: true, width: 120 },
    { key: 'amount', label: 'Amount', sortable: true, visible: true, width: 100, format: 'currency' },
    { key: 'expense_date', label: 'Date', sortable: true, visible: true, width: 100, format: 'date' },
    { key: 'status', label: 'Status', sortable: true, visible: true, width: 100, format: 'status' },
    { key: 'submitted_at', label: 'Submitted', sortable: true, visible: true, width: 120, format: 'date' }
  ];

  /**
   * Get paginated claims with filters and sorting
   */
  async getPaginatedClaims(
    config: Partial<TableViewConfig>,
    userRole?: string,
    userId?: string
  ): Promise<{ success: boolean; result?: PaginatedResult<ExpenseClaim>; error?: string }> {
    try {
      const finalConfig = this.mergeConfig(config);
      
      let query = supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, department, email)
        `, { count: 'exact' });

      // Apply role-based filtering
      if (userRole && userRole !== 'administrator') {
        if (userRole === 'employee' && userId) {
          query = query.eq('employee_id', userId);
        } else if (userRole === 'manager' && userId) {
          // Managers see their department's claims
          const { data: user } = await supabase
            .from('users')
            .select('department')
            .eq('id', userId)
            .single();
          
          if (user?.department) {
            query = query.eq('department', user.department);
          }
        }
      }

      // Apply filters
      query = this.applyFilters(query, finalConfig.filters);

      // Apply sorting
      const sortColumn = finalConfig.sortBy || 'submitted_at';
      const sortOrder = finalConfig.sortOrder || 'desc';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const page = Math.max(1, config.pageSize ? Math.floor((config.pageSize - 1) / finalConfig.pageSize) + 1 : 1);
      const offset = (page - 1) * finalConfig.pageSize;
      query = query.range(offset, offset + finalConfig.pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const result: PaginatedResult<ExpenseClaim> = {
        data: data || [],
        total: count || 0,
        page,
        pageSize: finalConfig.pageSize,
        totalPages: Math.ceil((count || 0) / finalConfig.pageSize)
      };

      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get paginated claims'
      };
    }
  }

  /**
   * Apply filters to query
   */
  private applyFilters(query: any, filters: TableFilters): any {
    if (filters.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters.department?.length) {
      query = query.in('department', filters.department);
    }

    if (filters.category?.length) {
      query = query.in('category', filters.category);
    }

    if (filters.dateRange) {
      query = query
        .gte('expense_date', filters.dateRange.start.toISOString())
        .lte('expense_date', filters.dateRange.end.toISOString());
    }

    if (filters.amountRange) {
      query = query
        .gte('amount', filters.amountRange.min)
        .lte('amount', filters.amountRange.max);
    }

    if (filters.search) {
      // Search across multiple fields
      const searchTerm = `%${filters.search}%`;
      query = query.or(`description.ilike.${searchTerm},employee_name.ilike.${searchTerm},category.ilike.${searchTerm}`);
    }

    return query;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: Partial<TableViewConfig>): TableViewConfig {
    return {
      pageSize: config.pageSize || 25,
      sortBy: config.sortBy || 'submitted_at',
      sortOrder: config.sortOrder || 'desc',
      filters: config.filters || {},
      columns: config.columns || this.defaultColumns
    };
  }

  /**
   * Export table data
   */
  async exportTableData(
    config: Partial<TableViewConfig>,
    format: 'csv' | 'excel' | 'pdf' = 'csv',
    userRole?: string,
    userId?: string
  ): Promise<{ success: boolean; data?: Blob; filename?: string; error?: string }> {
    try {
      // Get all data (not paginated for export)
      const exportConfig = { ...config, pageSize: 10000 }; // Large page size for export
      const result = await this.getPaginatedClaims(exportConfig, userRole, userId);

      if (!result.success || !result.result) {
        throw new Error(result.error || 'Failed to get data for export');
      }

      const data = result.result.data;
      
      switch (format) {
        case 'csv':
          return this.exportAsCSV(data, config.columns || this.defaultColumns);
        case 'excel':
          return this.exportAsExcel(data, config.columns || this.defaultColumns);
        case 'pdf':
          return this.exportAsPDF(data, config.columns || this.defaultColumns);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(data: ExpenseClaim[], columns: TableColumn[]): { success: boolean; data: Blob; filename: string } {
    const visibleColumns = columns.filter(col => col.visible);
    const headers = visibleColumns.map(col => col.label);
    
    const rows = data.map(claim => 
      visibleColumns.map(col => {
        const value = this.formatCellValue(claim, col);
        // Escape CSV values
        return typeof value === 'string' && value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    return {
      success: true,
      data: blob,
      filename: `logan-freights-claims-${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  /**
   * Export as Excel (CSV format for now)
   */
  private exportAsExcel(data: ExpenseClaim[], columns: TableColumn[]): { success: boolean; data: Blob; filename: string } {
    // For simplicity, export as CSV with Excel-compatible format
    const result = this.exportAsCSV(data, columns);
    return {
      ...result,
      filename: result.filename.replace('.csv', '.xlsx')
    };
  }

  /**
   * Export as PDF (HTML for now)
   */
  private exportAsPDF(data: ExpenseClaim[], columns: TableColumn[]): { success: boolean; data: Blob; filename: string } {
    const visibleColumns = columns.filter(col => col.visible);
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Logan Freights Claims Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .amount { text-align: right; }
        .status { text-transform: capitalize; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Logan Freights Logistics CC</h1>
        <h2>Expense Claims Report</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <table>
        <thead>
            <tr>
                ${visibleColumns.map(col => `<th>${col.label}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${data.map(claim => `
            <tr>
                ${visibleColumns.map(col => {
                  const value = this.formatCellValue(claim, col);
                  const className = col.format === 'currency' ? 'amount' : col.format === 'status' ? 'status' : '';
                  return `<td class="${className}">${value}</td>`;
                }).join('')}
            </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    return {
      success: true,
      data: blob,
      filename: `logan-freights-claims-${new Date().toISOString().split('T')[0]}.html`
    };
  }

  /**
   * Format cell value based on column format
   */
  private formatCellValue(claim: any, column: TableColumn): string {
    const value = claim[column.key];
    
    if (value === null || value === undefined) return '';
    
    switch (column.format) {
      case 'currency':
        return `R${Number(value).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
      case 'date':
        return new Date(value).toLocaleDateString('en-ZA');
      case 'status':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1);
      default:
        return String(value);
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(): Promise<{ success: boolean; options?: any; error?: string }> {
    try {
      // Get unique values for filter dropdowns
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('status, department, category')
        .limit(1000);

      if (error) throw error;

      const uniqueStatuses = [...new Set((claims || []).map(c => c.status))];
      const uniqueDepartments = [...new Set((claims || []).map(c => c.department))];
      const uniqueCategories = [...new Set((claims || []).map(c => c.category))];

      const options = {
        statuses: uniqueStatuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
        departments: uniqueDepartments.map(d => ({ value: d, label: d })),
        categories: uniqueCategories.map(c => ({ value: c, label: c }))
      };

      return { success: true, options };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get filter options'
      };
    }
  }

  /**
   * Save table view configuration
   */
  async saveTableConfig(userId: string, config: TableViewConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_table_configs')
        .upsert({
          user_id: userId,
          table_name: 'claims_table',
          config: config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save table configuration'
      };
    }
  }

  /**
   * Load table view configuration
   */
  async loadTableConfig(userId: string): Promise<{ success: boolean; config?: TableViewConfig; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_table_configs')
        .select('config')
        .eq('user_id', userId)
        .eq('table_name', 'claims_table')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const config = data?.config || this.getDefaultConfig();

      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load table configuration'
      };
    }
  }

  /**
   * Get default table configuration
   */
  private getDefaultConfig(): TableViewConfig {
    return {
      pageSize: 25,
      sortBy: 'submitted_at',
      sortOrder: 'desc',
      filters: {},
      columns: this.defaultColumns
    };
  }
}

// Export singleton instance
export const claimsTableViewService = new ClaimsTableViewService();

// Export utility functions
export const getPaginatedClaims = (config: Partial<TableViewConfig>, userRole?: string, userId?: string) =>
  claimsTableViewService.getPaginatedClaims(config, userRole, userId);
export const exportTableData = (config: Partial<TableViewConfig>, format?: 'csv' | 'excel' | 'pdf', userRole?: string, userId?: string) =>
  claimsTableViewService.exportTableData(config, format, userRole, userId);
export const getFilterOptions = () => claimsTableViewService.getFilterOptions();
export const saveTableConfig = (userId: string, config: TableViewConfig) =>
  claimsTableViewService.saveTableConfig(userId, config);
export const loadTableConfig = (userId: string) =>
  claimsTableViewService.loadTableConfig(userId);