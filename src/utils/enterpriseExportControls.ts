import { supabase } from './supabase/client';

export interface ExportConfiguration {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dataSource: 'claims' | 'users' | 'analytics' | 'audit' | 'financial';
  filters: ExportFilters;
  columns: ExportColumn[];
  schedule?: ExportSchedule;
  permissions: ExportPermissions;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
}

export interface ExportFilters {
  dateRange?: { start: string; end: string };
  departments?: string[];
  categories?: string[];
  statuses?: string[];
  amountRange?: { min: number; max: number };
  employees?: string[];
  customFilters?: Array<{ field: string; operator: string; value: any }>;
}

export interface ExportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  included: boolean;
  order: number;
}

export interface ExportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  recipients: string[];
  lastRun?: string;
  nextRun?: string;
}

export interface ExportPermissions {
  roles: string[];
  users: string[];
  departments: string[];
  public: boolean;
}

export interface ExportJob {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: string;
  completedAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
  requestedBy: string;
}

/**
 * Logan Freights Enterprise Export Controls Service
 * Advanced data export management and automation
 */
class EnterpriseExportControlsService {
  
  /**
   * Get available export configurations
   */
  async getExportConfigurations(userId: string): Promise<{ success: boolean; data?: ExportConfiguration[]; error?: string }> {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, department')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const { data: configs, error } = await supabase
        .from('export_configurations')
        .select('*')
        .or(`created_by.eq.${userId},permissions->>public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter configurations based on permissions
      const filteredConfigs = (configs || []).filter(config => {
        if (config.created_by === userId) return true;
        if (config.permissions?.public) return true;
        if (config.permissions?.roles?.includes(user.role)) return true;
        if (config.permissions?.users?.includes(userId)) return true;
        if (config.permissions?.departments?.includes(user.department)) return true;
        return false;
      });

      const configurations: ExportConfiguration[] = filteredConfigs.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        format: config.format,
        dataSource: config.data_source,
        filters: config.filters || {},
        columns: config.columns || [],
        schedule: config.schedule,
        permissions: config.permissions || { roles: [], users: [], departments: [], public: false },
        createdBy: config.created_by,
        createdAt: config.created_at,
        lastRun: config.last_run
      }));

      return { success: true, data: configurations };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export configurations'
      };
    }
  }

  /**
   * Create export configuration
   */
  async createExportConfiguration(
    userId: string,
    config: Omit<ExportConfiguration, 'id' | 'createdBy' | 'createdAt'>
  ): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('export_configurations')
        .insert({
          name: config.name,
          description: config.description,
          format: config.format,
          data_source: config.dataSource,
          filters: config.filters,
          columns: config.columns,
          schedule: config.schedule,
          permissions: config.permissions,
          created_by: userId,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create export configuration'
      };
    }
  }

  /**
   * Update export configuration
   */
  async updateExportConfiguration(
    configId: string,
    userId: string,
    updates: Partial<ExportConfiguration>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership or permissions
      const { data: config, error: configError } = await supabase
        .from('export_configurations')
        .select('created_by')
        .eq('id', configId)
        .single();

      if (configError || !config) {
        throw new Error('Export configuration not found');
      }

      if (config.created_by !== userId) {
        throw new Error('Not authorized to update this configuration');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.format) updateData.format = updates.format;
      if (updates.dataSource) updateData.data_source = updates.dataSource;
      if (updates.filters) updateData.filters = updates.filters;
      if (updates.columns) updateData.columns = updates.columns;
      if (updates.schedule) updateData.schedule = updates.schedule;
      if (updates.permissions) updateData.permissions = updates.permissions;

      const { error } = await supabase
        .from('export_configurations')
        .update(updateData)
        .eq('id', configId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update export configuration'
      };
    }
  }

  /**
   * Delete export configuration
   */
  async deleteExportConfiguration(configId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: config, error: configError } = await supabase
        .from('export_configurations')
        .select('created_by')
        .eq('id', configId)
        .single();

      if (configError || !config) {
        throw new Error('Export configuration not found');
      }

      if (config.created_by !== userId) {
        throw new Error('Not authorized to delete this configuration');
      }

      // Delete related jobs first
      await supabase
        .from('export_jobs')
        .delete()
        .eq('config_id', configId);

      // Delete configuration
      const { error } = await supabase
        .from('export_configurations')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete export configuration'
      };
    }
  }

  /**
   * Execute export job
   */
  async executeExport(configId: string, userId: string): Promise<{ success: boolean; data?: { jobId: string }; error?: string }> {
    try {
      // Get configuration
      const { data: config, error: configError } = await supabase
        .from('export_configurations')
        .select('*')
        .eq('id', configId)
        .single();

      if (configError || !config) {
        throw new Error('Export configuration not found');
      }

      // Check permissions
      const hasPermission = await this.checkExportPermission(config, userId);
      if (!hasPermission) {
        throw new Error('Not authorized to execute this export');
      }

      // Create export job
      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .insert({
          config_id: configId,
          status: 'pending',
          progress: 0,
          started_at: new Date().toISOString(),
          requested_by: userId
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // Start export process (would be handled by background worker)
      this.processExportJob(job.id, config);

      return { success: true, data: { jobId: job.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute export'
      };
    }
  }

  /**
   * Get export jobs
   */
  async getExportJobs(userId: string): Promise<{ success: boolean; data?: ExportJob[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('export_jobs')
        .select(`
          *,
          export_configurations!export_jobs_config_id_fkey(name, format)
        `)
        .eq('requested_by', userId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const jobs: ExportJob[] = (data || []).map(job => ({
        id: job.id,
        configId: job.config_id,
        status: job.status,
        progress: job.progress,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        fileUrl: job.file_url,
        fileName: job.file_name,
        fileSize: job.file_size,
        recordCount: job.record_count,
        error: job.error,
        requestedBy: job.requested_by
      }));

      return { success: true, data: jobs };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export jobs'
      };
    }
  }

  /**
   * Cancel export job
   */
  async cancelExportJob(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: job, error: jobError } = await supabase
        .from('export_jobs')
        .select('requested_by, status')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Export job not found');
      }

      if (job.requested_by !== userId) {
        throw new Error('Not authorized to cancel this job');
      }

      if (job.status === 'completed' || job.status === 'cancelled') {
        throw new Error('Cannot cancel completed or already cancelled job');
      }

      const { error } = await supabase
        .from('export_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel export job'
      };
    }
  }

  /**
   * Get available data sources and fields
   */
  async getDataSourceSchema(dataSource: string): Promise<{ success: boolean; data?: ExportColumn[]; error?: string }> {
    const schemas: { [key: string]: ExportColumn[] } = {
      claims: [
        { field: 'id', label: 'Claim ID', type: 'string', included: true, order: 1 },
        { field: 'employee_name', label: 'Employee', type: 'string', included: true, order: 2 },
        { field: 'department', label: 'Department', type: 'string', included: true, order: 3 },
        { field: 'amount', label: 'Amount', type: 'number', format: 'currency', included: true, order: 4 },
        { field: 'category', label: 'Category', type: 'string', included: true, order: 5 },
        { field: 'description', label: 'Description', type: 'string', included: true, order: 6 },
        { field: 'expense_date', label: 'Expense Date', type: 'date', format: 'YYYY-MM-DD', included: true, order: 7 },
        { field: 'submitted_at', label: 'Submitted Date', type: 'date', format: 'YYYY-MM-DD HH:mm:ss', included: true, order: 8 },
        { field: 'status', label: 'Status', type: 'string', included: true, order: 9 },
        { field: 'approved_by', label: 'Approved By', type: 'string', included: false, order: 10 },
        { field: 'approved_at', label: 'Approved Date', type: 'date', format: 'YYYY-MM-DD HH:mm:ss', included: false, order: 11 }
      ],
      users: [
        { field: 'id', label: 'User ID', type: 'string', included: true, order: 1 },
        { field: 'name', label: 'Name', type: 'string', included: true, order: 2 },
        { field: 'email', label: 'Email', type: 'string', included: true, order: 3 },
        { field: 'department', label: 'Department', type: 'string', included: true, order: 4 },
        { field: 'role', label: 'Role', type: 'string', included: true, order: 5 },
        { field: 'created_at', label: 'Created Date', type: 'date', format: 'YYYY-MM-DD', included: true, order: 6 },
        { field: 'last_login', label: 'Last Login', type: 'date', format: 'YYYY-MM-DD HH:mm:ss', included: false, order: 7 }
      ],
      analytics: [
        { field: 'period', label: 'Period', type: 'string', included: true, order: 1 },
        { field: 'department', label: 'Department', type: 'string', included: true, order: 2 },
        { field: 'total_amount', label: 'Total Amount', type: 'number', format: 'currency', aggregate: 'sum', included: true, order: 3 },
        { field: 'claim_count', label: 'Claim Count', type: 'number', aggregate: 'count', included: true, order: 4 },
        { field: 'average_amount', label: 'Average Amount', type: 'number', format: 'currency', aggregate: 'avg', included: true, order: 5 },
        { field: 'approval_rate', label: 'Approval Rate', type: 'number', format: 'percentage', included: true, order: 6 }
      ],
      audit: [
        { field: 'id', label: 'Log ID', type: 'string', included: true, order: 1 },
        { field: 'action_type', label: 'Action', type: 'string', included: true, order: 2 },
        { field: 'user_name', label: 'User', type: 'string', included: true, order: 3 },
        { field: 'description', label: 'Description', type: 'string', included: true, order: 4 },
        { field: 'created_at', label: 'Timestamp', type: 'date', format: 'YYYY-MM-DD HH:mm:ss', included: true, order: 5 },
        { field: 'metadata', label: 'Metadata', type: 'string', included: false, order: 6 }
      ],
      financial: [
        { field: 'period', label: 'Period', type: 'string', included: true, order: 1 },
        { field: 'revenue', label: 'Revenue', type: 'number', format: 'currency', included: true, order: 2 },
        { field: 'expenses', label: 'Expenses', type: 'number', format: 'currency', included: true, order: 3 },
        { field: 'net_profit', label: 'Net Profit', type: 'number', format: 'currency', included: true, order: 4 },
        { field: 'budget_utilization', label: 'Budget Utilization', type: 'number', format: 'percentage', included: true, order: 5 }
      ]
    };

    const schema = schemas[dataSource];
    if (!schema) {
      return {
        success: false,
        error: `Unknown data source: ${dataSource}`
      };
    }

    return { success: true, data: schema };
  }

  /**
   * Check export permission
   */
  private async checkExportPermission(config: any, userId: string): Promise<boolean> {
    try {
      if (config.created_by === userId) return true;
      if (config.permissions?.public) return true;
      if (config.permissions?.users?.includes(userId)) return true;

      // Check role and department
      const { data: user, error } = await supabase
        .from('users')
        .select('role, department')
        .eq('id', userId)
        .single();

      if (error) return false;

      if (config.permissions?.roles?.includes(user.role)) return true;
      if (config.permissions?.departments?.includes(user.department)) return true;

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process export job (simplified - would be handled by background worker)
   */
  private async processExportJob(jobId: string, config: any): Promise<void> {
    try {
      // Update job status
      await supabase
        .from('export_jobs')
        .update({ status: 'running', progress: 10 })
        .eq('id', jobId);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get data based on configuration
      const data = await this.fetchExportData(config);

      // Update progress
      await supabase
        .from('export_jobs')
        .update({ progress: 80 })
        .eq('id', jobId);

      // Generate file (simplified)
      const fileName = `export_${config.name}_${Date.now()}.${config.format}`;
      const fileUrl = `https://example.com/exports/${fileName}`; // Would be actual file URL

      // Complete job
      await supabase
        .from('export_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString(),
          file_url: fileUrl,
          file_name: fileName,
          file_size: data.length * 100, // Rough estimate
          record_count: data.length
        })
        .eq('id', jobId);

    } catch (error) {
      await supabase
        .from('export_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Export failed'
        })
        .eq('id', jobId);
    }
  }

  /**
   * Fetch data for export based on configuration
   */
  private async fetchExportData(config: any): Promise<any[]> {
    // Simplified data fetching - would be more complex in real implementation
    const { data, error } = await supabase
      .from(config.data_source === 'claims' ? 'expense_claims' : 'users')
      .select('*')
      .limit(1000);

    return data || [];
  }
}

// Export singleton instance
export const enterpriseExportControlsService = new EnterpriseExportControlsService();

// Export utility functions
export const getExportConfigurations = (userId: string) => 
  enterpriseExportControlsService.getExportConfigurations(userId);
export const createExportConfiguration = (userId: string, config: any) => 
  enterpriseExportControlsService.createExportConfiguration(userId, config);
export const updateExportConfiguration = (configId: string, userId: string, updates: any) => 
  enterpriseExportControlsService.updateExportConfiguration(configId, userId, updates);
export const deleteExportConfiguration = (configId: string, userId: string) => 
  enterpriseExportControlsService.deleteExportConfiguration(configId, userId);
export const executeExport = (configId: string, userId: string) => 
  enterpriseExportControlsService.executeExport(configId, userId);
export const getExportJobs = (userId: string) => 
  enterpriseExportControlsService.getExportJobs(userId);
export const cancelExportJob = (jobId: string, userId: string) => 
  enterpriseExportControlsService.cancelExportJob(jobId, userId);
export const getDataSourceSchema = (dataSource: string) => 
  enterpriseExportControlsService.getDataSourceSchema(dataSource);