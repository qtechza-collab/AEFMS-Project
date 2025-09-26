import { supabase } from './supabase/client';

export interface EmployeeSettings {
  userId: string;
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
    reminderFrequency: 'daily' | 'weekly' | 'monthly';
    defaultCurrency: string;
    autoSubmitReceipts: boolean;
    receiptQuality: 'low' | 'medium' | 'high';
  };
  profile: {
    displayName: string;
    department: string;
    position: string;
    phoneNumber?: string;
    profilePhoto?: string;
    emergencyContact?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    passwordLastChanged: string;
  };
}

export interface NotificationSettings {
  claimApproved: boolean;
  claimRejected: boolean;
  claimRequiresInfo: boolean;
  budgetAlerts: boolean;
  systemUpdates: boolean;
  reminderNotifications: boolean;
}

/**
 * Logan Freights Employee Settings Service
 * Personal settings and preferences management
 */
class EmployeeSettingsService {
  
  /**
   * Get employee settings
   */
  async getEmployeeSettings(userId: string): Promise<{ success: boolean; data?: EmployeeSettings; error?: string }> {
    try {
      // Get user profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get user preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get security settings
      const { data: security, error: securityError } = await supabase
        .from('user_security')
        .select('*')
        .eq('user_id', userId)
        .single();

      const settings: EmployeeSettings = {
        userId,
        preferences: {
          emailNotifications: preferences?.email_notifications ?? true,
          pushNotifications: preferences?.push_notifications ?? true,
          weeklyReports: preferences?.weekly_reports ?? false,
          reminderFrequency: preferences?.reminder_frequency ?? 'weekly',
          defaultCurrency: preferences?.default_currency ?? 'ZAR',
          autoSubmitReceipts: preferences?.auto_submit_receipts ?? false,
          receiptQuality: preferences?.receipt_quality ?? 'medium'
        },
        profile: {
          displayName: user.name || user.email,
          department: user.department,
          position: user.position || 'Employee',
          phoneNumber: user.phone_number,
          profilePhoto: user.profile_photo,
          emergencyContact: user.emergency_contact
        },
        security: {
          twoFactorEnabled: security?.two_factor_enabled ?? false,
          sessionTimeout: security?.session_timeout ?? 3600,
          loginAlerts: security?.login_alerts ?? true,
          passwordLastChanged: security?.password_last_changed ?? user.created_at
        }
      };

      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employee settings'
      };
    }
  }

  /**
   * Update employee preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<EmployeeSettings['preferences']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          email_notifications: preferences.emailNotifications,
          push_notifications: preferences.pushNotifications,
          weekly_reports: preferences.weeklyReports,
          reminder_frequency: preferences.reminderFrequency,
          default_currency: preferences.defaultCurrency,
          auto_submit_receipts: preferences.autoSubmitReceipts,
          receipt_quality: preferences.receiptQuality,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      };
    }
  }

  /**
   * Update employee profile
   */
  async updateProfile(
    userId: string,
    profile: Partial<EmployeeSettings['profile']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (profile.displayName) updateData.name = profile.displayName;
      if (profile.phoneNumber) updateData.phone_number = profile.phoneNumber;
      if (profile.emergencyContact) updateData.emergency_contact = profile.emergencyContact;
      if (profile.profilePhoto) updateData.profile_photo = profile.profilePhoto;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile'
      };
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    userId: string,
    security: Partial<EmployeeSettings['security']>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: userId,
          two_factor_enabled: security.twoFactorEnabled,
          session_timeout: security.sessionTimeout,
          login_alerts: security.loginAlerts,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update security settings'
      };
    }
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(userId: string): Promise<{ success: boolean; data?: NotificationSettings; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const settings: NotificationSettings = {
        claimApproved: data?.claim_approved ?? true,
        claimRejected: data?.claim_rejected ?? true,
        claimRequiresInfo: data?.claim_requires_info ?? true,
        budgetAlerts: data?.budget_alerts ?? true,
        systemUpdates: data?.system_updates ?? false,
        reminderNotifications: data?.reminder_notifications ?? true
      };

      return { success: true, data: settings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification settings'
      };
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    settings: Partial<NotificationSettings>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          claim_approved: settings.claimApproved,
          claim_rejected: settings.claimRejected,
          claim_requires_info: settings.claimRequiresInfo,
          budget_alerts: settings.budgetAlerts,
          system_updates: settings.systemUpdates,
          reminder_notifications: settings.reminderNotifications,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notification settings'
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update password change timestamp
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase
          .from('user_security')
          .upsert({
            user_id: user.user.id,
            password_last_changed: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password'
      };
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string): Promise<{ success: boolean; qrCode?: string; backupCodes?: string[]; error?: string }> {
    try {
      // In a real implementation, this would generate TOTP secrets and QR codes
      // For now, simulate the process
      const mockQrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==`;
      const mockBackupCodes = [
        '12345678', '87654321', '11111111', '22222222', '33333333',
        '44444444', '55555555', '66666666', '77777777', '88888888'
      ];

      // Update security settings
      await supabase
        .from('user_security')
        .upsert({
          user_id: userId,
          two_factor_enabled: true,
          two_factor_secret: 'mock_secret',
          backup_codes: mockBackupCodes,
          updated_at: new Date().toISOString()
        });

      return {
        success: true,
        qrCode: mockQrCode,
        backupCodes: mockBackupCodes
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable two-factor authentication'
      };
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_security')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable two-factor authentication'
      };
    }
  }

  /**
   * Export user data
   */
  async exportUserData(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const settingsResult = await this.getEmployeeSettings(userId);
      const notificationResult = await this.getNotificationSettings(userId);

      if (!settingsResult.success) {
        throw new Error(settingsResult.error);
      }

      // Get expense claims
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('employee_id', userId);

      if (claimsError) throw claimsError;

      const exportData = {
        exportedAt: new Date().toISOString(),
        settings: settingsResult.data,
        notifications: notificationResult.data,
        expenseClaims: claims || [],
        totalClaims: claims?.length || 0,
        totalAmount: claims?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
      };

      return { success: true, data: exportData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export user data'
      };
    }
  }
}

// Export singleton instance
export const employeeSettingsService = new EmployeeSettingsService();

// Export utility functions
export const getEmployeeSettings = (userId: string) => 
  employeeSettingsService.getEmployeeSettings(userId);
export const updatePreferences = (userId: string, preferences: any) => 
  employeeSettingsService.updatePreferences(userId, preferences);
export const updateProfile = (userId: string, profile: any) => 
  employeeSettingsService.updateProfile(userId, profile);
export const updateSecuritySettings = (userId: string, security: any) => 
  employeeSettingsService.updateSecuritySettings(userId, security);
export const getNotificationSettings = (userId: string) => 
  employeeSettingsService.getNotificationSettings(userId);
export const updateNotificationSettings = (userId: string, settings: any) => 
  employeeSettingsService.updateNotificationSettings(userId, settings);
export const changePassword = (currentPassword: string, newPassword: string) => 
  employeeSettingsService.changePassword(currentPassword, newPassword);
export const enableTwoFactor = (userId: string) => 
  employeeSettingsService.enableTwoFactor(userId);
export const disableTwoFactor = (userId: string) => 
  employeeSettingsService.disableTwoFactor(userId);
export const exportUserData = (userId: string) => 
  employeeSettingsService.exportUserData(userId);