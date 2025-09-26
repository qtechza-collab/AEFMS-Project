import { supabase } from './supabase/client';

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  department: string;
  position?: string;
  role: 'employee' | 'manager' | 'hr' | 'administrator';
}

export interface RegistrationResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresVerification?: boolean;
}

/**
 * Logan Freights User Registration Service
 */
class UserRegistrationService {
  
  async registerUser(data: RegistrationData): Promise<RegistrationResult> {
    try {
      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            department: data.department,
            position: data.position,
            role: data.role
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email,
            name: data.name,
            department: data.department,
            position: data.position,
            role: data.role,
            created_at: new Date().toISOString()
          });

        if (profileError) throw profileError;
      }

      return {
        success: true,
        user: authData.user,
        requiresVerification: !authData.session
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  validateRegistrationData(data: RegistrationData): { valid: boolean; errors: string[] } {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address is required');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!data.department) {
      errors.push('Department is required');
    }

    if (!data.role) {
      errors.push('Role is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const userRegistrationService = new UserRegistrationService();