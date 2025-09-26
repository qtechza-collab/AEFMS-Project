import { supabase } from './supabase/client';

export interface EmployerSettings {
  userId: string;
  managerPreferences: {
    autoApprovalLimit: number;
    requireReceiptsOver: number;
    notifyOnHighValue: boolean;
    dailyDigest: boolean;
    weeklyReports: boolean;
    escalationThreshold: number;
    approvalTimeout: number;
  };
  departmentSettings: {
    managedDepartments: string[];
    budgetAlerts: boolean;
    budgetThreshold: number;
    employeeLimit: number;
    categoryRestrictions: string[];
  };
  notifications: {
    newClaimSubmissions: boolean;
    overBudgetAlerts: boolean;
    flaggedExpenses: boolean;
    teamUpdates: boolean;
    systemAlerts: boolean;
    escalatedClaims: boolean;
  };
  reportingPreferences: {
    defaultReportPeriod: 'weekly' | 'monthly' | 'quarterly';
    includeCharts: boolean;
    emailReports: boolean;
    exportFormat: 'pdf' | 'excel' | 'csv';
    customMetrics: string[];
  };
}

export interface ApprovalSettings {
  autoApprovalRules: ApprovalRule[];
  escalationRules: EscalationRule[];
  workflowSettings: WorkflowSettings;
}

export interface ApprovalRule {
  id: string;
  name: string;
  conditions: {
    maxAmount: number;
    categories: string[];
    employees: string[];
  };
  actions: {
    autoApprove: boolean;
    requireAdditionalApproval: boolean;
    flagForReview: boolean;
  };
  active: boolean;
}

export interface EscalationRule {
  id: string;
  name: string;
  triggerCondition: 'timeout' | 'amount' | 'category' | 'frequency';
  threshold: number;
  escalateTo: string;
  notifyOriginalApprover: boolean;
  active: boolean;
}

export interface WorkflowSettings {
  parallelApprovals: boolean;
  requireAllApprovers: boolean;
  allowDelegation: boolean;
  vacationMode: boolean;
  delegateToUserId?: string;
}

/**
 * Logan Freights Employer Settings Service
 * Manager and employer-specific settings and preferences
 */
class EmployerSettingsService {
  
  /**
   * Get employer settings
   */
  async getEmployerSettings(userId: string): Promise<{ success: boolean; data?: EmployerSettings; error?: string }> {
    try {
      // Get user role and department info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, department, managed_departments')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get manager preferences
      const { data: managerPrefs, error: managerError } = await supabase
        .from('manager_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get notification preferences  
      const { data: notifications, error: notifError } = await supabase
        .from('manager_notifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get reporting preferences
      const { data: reporting, error: reportError } = await supabase
        .from('manager_reporting')
        .select('*')
        .eq('user_id', userId)
        .single();

      const settings: EmployerSettings = {
        userId,
        managerPreferences: {
          autoApprovalLimit: managerPrefs?.auto_approval_limit ?? 1000,
          requireReceiptsOver: managerPrefs?.require_receipts_over ?? 100,
          notifyOnHighValue: managerPrefs?.notify_on_high_value ?? true,
          dailyDigest: managerPrefs?.daily_digest ?? true,
          weeklyReports: managerPrefs?.weekly_reports ?? true,
          escalationThreshold: managerPrefs?.escalation_threshold ?? 5000,
          approvalTimeout: managerPrefs?.approval_timeout ?? 72
        },
        departmentSettings: {
          managedDepartments: user.managed_departments || [user.department],
          budgetAlerts: managerPrefs?.budget_alerts ?? true,
          budgetThreshold: managerPrefs?.budget_threshold ?? 80,
          employeeLimit: managerPrefs?.employee_limit ?? 50,
          categoryRestrictions: managerPrefs?.category_restrictions || []
        },
        notifications: {
          newClaimSubmissions: notifications?.new_claim_submissions ?? true,
          overBudgetAlerts: notifications?.over_budget_alerts ?? true,
          flaggedExpenses: notifications?.flagged_expenses ?? true,
          teamUpdates: notifications?.team_updates ?? true,
          systemAlerts: notifications?.system_alerts ?? false,
          escalatedClaims: notifications?.escalated_claims ?? true
        },
        reportingPreferences: {
          defaultReportPeriod: reporting?.default_report_period ?? 'monthly',
          includeCharts: reporting?.include_charts ?? true,
          emailReports: reporting?.email_reports ?? false,
          exportFormat: reporting?.export_format ?? 'pdf',
          customMetrics: reporting?.custom_metrics || []
        }
      };

      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employer settings'
      };
    }
  }

  /**
   * Update manager preferences
   */
  async updateManagerPreferences(
    userId: string,
    preferences: Partial<EmployerSettings['managerPreferences']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('manager_preferences')
        .upsert({
          user_id: userId,
          auto_approval_limit: preferences.autoApprovalLimit,
          require_receipts_over: preferences.requireReceiptsOver,
          notify_on_high_value: preferences.notifyOnHighValue,
          daily_digest: preferences.dailyDigest,
          weekly_reports: preferences.weeklyReports,
          escalation_threshold: preferences.escalationThreshold,
          approval_timeout: preferences.approvalTimeout,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update manager preferences'
      };
    }
  }

  /**
   * Update department settings
   */
  async updateDepartmentSettings(
    userId: string,
    settings: Partial<EmployerSettings['departmentSettings']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Update user's managed departments
      if (settings.managedDepartments) {
        await supabase
          .from('users')
          .update({
            managed_departments: settings.managedDepartments,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      // Update manager preferences for department-specific settings
      const { error } = await supabase
        .from('manager_preferences')
        .upsert({
          user_id: userId,
          budget_alerts: settings.budgetAlerts,
          budget_threshold: settings.budgetThreshold,
          employee_limit: settings.employeeLimit,
          category_restrictions: settings.categoryRestrictions,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update department settings'
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    notifications: Partial<EmployerSettings['notifications']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('manager_notifications')
        .upsert({
          user_id: userId,
          new_claim_submissions: notifications.newClaimSubmissions,
          over_budget_alerts: notifications.overBudgetAlerts,
          flagged_expenses: notifications.flaggedExpenses,
          team_updates: notifications.teamUpdates,
          system_alerts: notifications.systemAlerts,
          escalated_claims: notifications.escalatedClaims,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification preferences'
      };
    }
  }

  /**
   * Update reporting preferences
   */
  async updateReportingPreferences(
    userId: string,
    reporting: Partial<EmployerSettings['reportingPreferences']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('manager_reporting')
        .upsert({
          user_id: userId,
          default_report_period: reporting.defaultReportPeriod,
          include_charts: reporting.includeCharts,
          email_reports: reporting.emailReports,
          export_format: reporting.exportFormat,
          custom_metrics: reporting.customMetrics,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update reporting preferences'
      };
    }
  }

  /**
   * Get approval settings
   */
  async getApprovalSettings(userId: string): Promise<{ success: boolean; data?: ApprovalSettings; error?: string }> {
    try {
      // Get approval rules
      const { data: approvalRules, error: rulesError } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('created_by', userId);

      // Get escalation rules
      const { data: escalationRules, error: escalationError } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('created_by', userId);

      // Get workflow settings
      const { data: workflow, error: workflowError } = await supabase
        .from('workflow_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      const settings: ApprovalSettings = {
        autoApprovalRules: (approvalRules || []).map(rule => ({
          id: rule.id,
          name: rule.name,
          conditions: {
            maxAmount: rule.max_amount,
            categories: rule.categories || [],
            employees: rule.employees || []
          },
          actions: {
            autoApprove: rule.auto_approve,
            requireAdditionalApproval: rule.require_additional_approval,
            flagForReview: rule.flag_for_review
          },
          active: rule.active
        })),
        escalationRules: (escalationRules || []).map(rule => ({
          id: rule.id,
          name: rule.name,
          triggerCondition: rule.trigger_condition,
          threshold: rule.threshold,
          escalateTo: rule.escalate_to,
          notifyOriginalApprover: rule.notify_original_approver,
          active: rule.active
        })),
        workflowSettings: {
          parallelApprovals: workflow?.parallel_approvals ?? false,
          requireAllApprovers: workflow?.require_all_approvers ?? true,
          allowDelegation: workflow?.allow_delegation ?? true,
          vacationMode: workflow?.vacation_mode ?? false,
          delegateToUserId: workflow?.delegate_to_user_id
        }
      };

      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get approval settings'
      };
    }
  }

  /**
   * Create approval rule
   */
  async createApprovalRule(userId: string, rule: Omit<ApprovalRule, 'id'>): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('approval_rules')
        .insert({
          name: rule.name,
          max_amount: rule.conditions.maxAmount,
          categories: rule.conditions.categories,
          employees: rule.conditions.employees,
          auto_approve: rule.actions.autoApprove,
          require_additional_approval: rule.actions.requireAdditionalApproval,
          flag_for_review: rule.actions.flagForReview,
          active: rule.active,
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
        error: error instanceof Error ? error.message : 'Failed to create approval rule'
      };
    }
  }

  /**
   * Update approval rule
   */
  async updateApprovalRule(ruleId: string, updates: Partial<ApprovalRule>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.conditions) {
        if (updates.conditions.maxAmount) updateData.max_amount = updates.conditions.maxAmount;
        if (updates.conditions.categories) updateData.categories = updates.conditions.categories;
        if (updates.conditions.employees) updateData.employees = updates.conditions.employees;
      }
      if (updates.actions) {
        if (updates.actions.autoApprove !== undefined) updateData.auto_approve = updates.actions.autoApprove;
        if (updates.actions.requireAdditionalApproval !== undefined) updateData.require_additional_approval = updates.actions.requireAdditionalApproval;
        if (updates.actions.flagForReview !== undefined) updateData.flag_for_review = updates.actions.flagForReview;
      }
      if (updates.active !== undefined) updateData.active = updates.active;

      const { error } = await supabase
        .from('approval_rules')
        .update(updateData)
        .eq('id', ruleId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update approval rule'
      };
    }
  }

  /**
   * Delete approval rule
   */
  async deleteApprovalRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('approval_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete approval rule'
      };
    }
  }

  /**
   * Set vacation mode (delegate approvals)
   */
  async setVacationMode(
    userId: string, 
    enabled: boolean, 
    delegateToUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('workflow_settings')
        .upsert({
          user_id: userId,
          vacation_mode: enabled,
          delegate_to_user_id: delegateToUserId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Create notification about vacation mode
      if (enabled && delegateToUserId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: delegateToUserId,
            type: 'delegation_assigned',
            title: 'Approval Delegation',
            message: 'You have been assigned to handle approvals while a manager is on vacation',
            priority: 'medium',
            created_at: new Date().toISOString()
          });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set vacation mode'
      };
    }
  }
}

// Export singleton instance
export const employerSettingsService = new EmployerSettingsService();

// Export utility functions
export const getEmployerSettings = (userId: string) => 
  employerSettingsService.getEmployerSettings(userId);
export const updateManagerPreferences = (userId: string, preferences: any) => 
  employerSettingsService.updateManagerPreferences(userId, preferences);
export const updateDepartmentSettings = (userId: string, settings: any) => 
  employerSettingsService.updateDepartmentSettings(userId, settings);
export const updateNotificationPreferences = (userId: string, notifications: any) => 
  employerSettingsService.updateNotificationPreferences(userId, notifications);
export const updateReportingPreferences = (userId: string, reporting: any) => 
  employerSettingsService.updateReportingPreferences(userId, reporting);
export const getApprovalSettings = (userId: string) => 
  employerSettingsService.getApprovalSettings(userId);
export const createApprovalRule = (userId: string, rule: any) => 
  employerSettingsService.createApprovalRule(userId, rule);
export const updateApprovalRule = (ruleId: string, updates: any) => 
  employerSettingsService.updateApprovalRule(ruleId, updates);
export const deleteApprovalRule = (ruleId: string) => 
  employerSettingsService.deleteApprovalRule(ruleId);
export const setVacationMode = (userId: string, enabled: boolean, delegateToUserId?: string) => 
  employerSettingsService.setVacationMode(userId, enabled, delegateToUserId);