import { supabaseAuth } from './supabaseAuth';
import { supabase } from './supabase/client';

export interface LoginCredentials {
  email: string;
  password: string;
  role?: string;
}

export interface LoginResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresVerification?: boolean;
}

export interface DemoCredentials {
  role: string;
  email: string;
  password: string;
  description: string;
}

/**
 * Logan Freights Login Service
 * Authentication and demo mode management
 */
class LoginPageService {
  
  private readonly demoCredentials: DemoCredentials[] = [
    {
      role: 'employee',
      email: 'employee@loganfreights.co.za',
      password: 'demo123',
      description: 'Employee Dashboard - Submit and track expense claims'
    },
    {
      role: 'manager',
      email: 'manager@loganfreights.co.za',
      password: 'demo123',
      description: 'Manager Dashboard - Approve claims and view analytics'
    },
    {
      role: 'hr',
      email: 'hr@loganfreights.co.za',
      password: 'demo123',
      description: 'HR Dashboard - Employee management and compliance'
    },
    {
      role: 'administrator',
      email: 'admin@loganfreights.co.za',
      password: 'demo123',
      description: 'Admin Dashboard - Full system access and configuration'
    }
  ];

  /**
   * Authenticate user
   */
  async authenticateUser(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      console.log('🔐 Authenticating user:', credentials.email);

      // Check if in demo mode
      if (this.isDemoMode()) {
        return await this.handleDemoLogin(credentials);
      }

      // Production authentication
      const result = await supabaseAuth.signIn(credentials.email, credentials.password);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Authentication failed'
        };
      }

      // Verify role if specified
      if (credentials.role && result.user?.role !== credentials.role) {
        return {
          success: false,
          error: `Access denied. Expected ${credentials.role} role, but user has ${result.user.role} role.`
        };
      }

      console.log('✅ Authentication successful:', result.user?.name);
      
      // Log successful login
      await this.logLoginAttempt(credentials.email, true, result.user?.id);

      return {
        success: true,
        user: result.user
      };
    } catch (error) {
      console.error('❌ Authentication error:', error);
      
      // Log failed login attempt
      await this.logLoginAttempt(credentials.email, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Handle demo mode login
   */
  private async handleDemoLogin(credentials: LoginCredentials): Promise<LoginResult> {
    console.log('🎭 Demo mode login attempt');

    const demoUser = this.demoCredentials.find(
      demo => demo.email === credentials.email && demo.password === credentials.password
    );

    if (!demoUser) {
      return {
        success: false,
        error: 'Invalid demo credentials. Please use one of the provided demo accounts.'
      };
    }

    // Create demo user object
    const user = {
      id: `demo_${demoUser.role}`,
      email: demoUser.email,
      name: this.getDemoUserName(demoUser.role),
      role: demoUser.role,
      department: this.getDemoDepartment(demoUser.role),
      isDemo: true
    };

    console.log('✅ Demo login successful:', user.name);

    return {
      success: true,
      user
    };
  }

  /**
   * Get demo user display name
   */
  private getDemoUserName(role: string): string {
    const names = {
      employee: 'John Smith',
      manager: 'Sarah Johnson',
      hr: 'Michael Brown',
      administrator: 'Admin User'
    };
    return names[role as keyof typeof names] || 'Demo User';
  }

  /**
   * Get demo department
   */
  private getDemoDepartment(role: string): string {
    const departments = {
      employee: 'Operations',
      manager: 'Operations',
      hr: 'Human Resources',
      administrator: 'IT Administration'
    };
    return departments[role as keyof typeof departments] || 'General';
  }

  /**
   * Check if in demo mode
   */
  isDemoMode(): boolean {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    return !supabaseUrl || 
           !supabaseKey || 
           supabaseUrl.includes('demo-project') || 
           supabaseKey.includes('demo-');
  }

  /**
   * Get demo credentials for display
   */
  getDemoCredentials(): DemoCredentials[] {
    return this.demoCredentials;
  }

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isDemoMode()) {
        return {
          success: false,
          error: 'Password reset is not available in demo mode'
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      };
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return { valid: false, error: 'Email is required' };
    }
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    
    return { valid: true };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; error?: string; strength?: string } {
    if (!password) {
      return { valid: false, error: 'Password is required' };
    }

    if (password.length < 6) {
      return { 
        valid: false, 
        error: 'Password must be at least 6 characters long',
        strength: 'weak'
      };
    }

    // Check password strength
    let strength = 'weak';
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      strength = 'strong';
    } else if (password.length >= 6) {
      strength = 'medium';
    }

    return { valid: true, strength };
  }

  /**
   * Log login attempt for security
   */
  private async logLoginAttempt(email: string, successful: boolean, userId?: string): Promise<void> {
    try {
      if (this.isDemoMode()) return; // Don't log demo attempts

      await supabase
        .from('login_attempts')
        .insert({
          email,
          successful,
          user_id: userId,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          attempted_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log login attempt:', error);
    }
  }

  /**
   * Get client IP address (simplified)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real implementation, this would get the actual client IP
      // For now, return a placeholder
      return '127.0.0.1';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Check for account lockout
   */
  async checkAccountLockout(email: string): Promise<{ locked: boolean; attemptsRemaining?: number }> {
    try {
      if (this.isDemoMode()) {
        return { locked: false };
      }

      const { data: attempts, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .eq('successful', false)
        .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
        .order('attempted_at', { ascending: false });

      if (error) throw error;

      const failedAttempts = attempts?.length || 0;
      const maxAttempts = 5;

      return {
        locked: failedAttempts >= maxAttempts,
        attemptsRemaining: Math.max(0, maxAttempts - failedAttempts)
      };
    } catch (error) {
      console.warn('Failed to check account lockout:', error);
      return { locked: false };
    }
  }

  /**
   * Get login security info
   */
  async getLoginSecurityInfo(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (this.isDemoMode()) {
        return {
          success: true,
          data: {
            isDemoMode: true,
            securityFeatures: ['Demo Mode Active', 'No Real Data'],
            lastUpdate: new Date().toISOString()
          }
        };
      }

      // Get security configuration
      const { data: config, error } = await supabase
        .from('security_config')
        .select('*')
        .single();

      const securityInfo = {
        isDemoMode: false,
        passwordPolicy: {
          minLength: config?.password_min_length || 6,
          requireUppercase: config?.require_uppercase || false,
          requireNumbers: config?.require_numbers || false,
          requireSymbols: config?.require_symbols || false
        },
        lockoutPolicy: {
          maxAttempts: config?.max_login_attempts || 5,
          lockoutDuration: config?.lockout_duration_minutes || 15
        },
        securityFeatures: ['Multi-factor Authentication', 'Account Lockout Protection', 'Audit Logging'],
        lastUpdate: config?.updated_at || new Date().toISOString()
      };

      return { success: true, data: securityInfo };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get security info'
      };
    }
  }
}

// Export singleton instance
export const loginPageService = new LoginPageService();

// Export utility functions
export const authenticateUser = (credentials: LoginCredentials) =>
  loginPageService.authenticateUser(credentials);
export const requestPasswordReset = (email: string) =>
  loginPageService.requestPasswordReset(email);
export const validateEmail = (email: string) =>
  loginPageService.validateEmail(email);
export const validatePassword = (password: string) =>
  loginPageService.validatePassword(password);
export const getDemoCredentials = () =>
  loginPageService.getDemoCredentials();
export const isDemoMode = () =>
  loginPageService.isDemoMode();
export const checkAccountLockout = (email: string) =>
  loginPageService.checkAccountLockout(email);
export const getLoginSecurityInfo = () =>
  loginPageService.getLoginSecurityInfo();