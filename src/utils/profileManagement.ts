import { supabase } from './supabase/client';
import { enterpriseProfileManager } from './enterpriseProfileManager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: string;
  profilePhoto?: string;
  phoneNumber?: string;
  preferences: UserPreferences;
  lastLogin?: string;
  createdAt: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  currency: string;
  dateFormat: string;
}

/**
 * Logan Freights Profile Management Service
 */
class ProfileManagementService {
  
  async getUserProfile(userId: string): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Profile not found');
      }

      const profile: UserProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        department: data.department,
        position: data.position || 'Employee',
        role: data.role,
        profilePhoto: data.profile_photo,
        phoneNumber: data.phone_number,
        preferences: {
          emailNotifications: data.email_notifications ?? true,
          pushNotifications: data.push_notifications ?? true,
          language: data.language || 'en',
          theme: data.theme || 'light',
          currency: data.currency || 'ZAR',
          dateFormat: data.date_format || 'DD/MM/YYYY'
        },
        lastLogin: data.last_login,
        createdAt: data.created_at
      };

      return { success: true, profile };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile'
      };
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map profile fields to database fields
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.department) updateData.department = updates.department;
      if (updates.position) updateData.position = updates.position;
      if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;

      // Handle preferences
      if (updates.preferences) {
        if (updates.preferences.emailNotifications !== undefined) {
          updateData.email_notifications = updates.preferences.emailNotifications;
        }
        if (updates.preferences.pushNotifications !== undefined) {
          updateData.push_notifications = updates.preferences.pushNotifications;
        }
        if (updates.preferences.language) {
          updateData.language = updates.preferences.language;
        }
        if (updates.preferences.theme) {
          updateData.theme = updates.preferences.theme;
        }
        if (updates.preferences.currency) {
          updateData.currency = updates.preferences.currency;
        }
        if (updates.preferences.dateFormat) {
          updateData.date_format = updates.preferences.dateFormat;
        }
      }

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

  async updateProfilePhoto(userId: string, file: File): Promise<{ success: boolean; photoUrl?: string; error?: string }> {
    try {
      // Get user data for enterprise profile manager
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('name, email, department, role')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Use enterprise profile manager to upload photo
      const result = await enterpriseProfileManager.uploadProfileImage(file, {
        id: userId,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        photoUrl: result.url
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile photo'
      };
    }
  }

  async deleteProfilePhoto(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await enterpriseProfileManager.deleteProfileImage(userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile photo'
      };
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use Supabase auth to change password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Log password change
      await supabase
        .from('audit_log')
        .insert({
          action_type: 'password_change',
          description: 'User changed password',
          user_id: userId,
          created_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password'
      };
    }
  }

  async validateProfileData(profile: Partial<UserProfile>): Promise<{ valid: boolean; errors: string[] }> {
    const errors = [];

    if (profile.name && profile.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.push('Valid email address is required');
    }

    if (profile.phoneNumber && profile.phoneNumber.length > 0 && !/^[\d\s\+\-\(\)]+$/.test(profile.phoneNumber)) {
      errors.push('Valid phone number format required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getProfileCompleteness(userId: string): Promise<{ success: boolean; completeness?: number; missingFields?: string[]; error?: string }> {
    try {
      const profileResult = await this.getUserProfile(userId);
      
      if (!profileResult.success || !profileResult.profile) {
        throw new Error('Could not get profile');
      }

      const profile = profileResult.profile;
      const requiredFields = ['name', 'email', 'department', 'position'];
      const optionalFields = ['profilePhoto', 'phoneNumber'];
      
      const completedRequired = requiredFields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return value && value.toString().trim().length > 0;
      }).length;

      const completedOptional = optionalFields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return value && value.toString().trim().length > 0;
      }).length;

      const totalFields = requiredFields.length + optionalFields.length;
      const completedFields = completedRequired + completedOptional;
      const completeness = (completedFields / totalFields) * 100;

      const missingFields = requiredFields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return !value || value.toString().trim().length === 0;
      });

      return {
        success: true,
        completeness: Math.round(completeness),
        missingFields
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check profile completeness'
      };
    }
  }
}

export const profileManagementService = new ProfileManagementService();