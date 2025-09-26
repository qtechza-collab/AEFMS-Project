import { supabase } from './supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
  role: 'employee' | 'manager' | 'hr' | 'administrator';
  phone?: string;
  profile_photo?: string;
  manager_id?: string;
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  access_token?: string;
  error?: string;
}

class SupabaseAuthService {
  private currentUser: User | null = null;
  private accessToken: string | null = null;

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Check if we're in demo mode and provide demo authentication
        if (error.message.includes('Demo mode')) {
          const demoAccounts = SupabaseAuthService.getDummyAccounts();
          const demoUser = demoAccounts.find(acc => acc.email === email && acc.password === password);
          
          if (demoUser) {
            const user: User = {
              id: `demo-${demoUser.role}`,
              email: demoUser.email,
              name: demoUser.name,
              employee_id: `EMP-${Date.now()}`,
              department: demoUser.department,
              position: demoUser.role,
              role: demoUser.role as any,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            this.currentUser = user;
            this.accessToken = 'demo-token';
            
            console.log('✅ Demo authentication successful for:', user.name);
            return {
              success: true,
              user: user,
              access_token: 'demo-token'
            };
          }
        }
        
        return { success: false, error: error.message };
      }

      // Get user profile from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        return { success: false, error: 'User profile not found' };
      }

      this.currentUser = userData;
      this.accessToken = data.session.access_token;

      return {
        success: true,
        user: userData,
        access_token: data.session.access_token
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Sign in failed' };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { success: false, error: error.message };
      }

      this.currentUser = null;
      this.accessToken = null;
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'Sign out failed' };
    }
  }

  async getCurrentSession(): Promise<AuthResponse> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // In demo mode, check if we have a current user stored
        if (this.currentUser && error?.message?.includes('Demo mode')) {
          return {
            success: true,
            user: this.currentUser,
            access_token: this.accessToken
          };
        }
        return { success: false, error: 'No active session' };
      }

      // Get current user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        return { success: false, error: 'User profile not found' };
      }

      this.currentUser = userData;
      this.accessToken = session.access_token;

      return {
        success: true,
        user: userData,
        access_token: session.access_token
      };
    } catch (error) {
      console.error('Get session error:', error);
      return { success: false, error: 'Failed to get session' };
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.accessToken !== null;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  // Dummy account credentials for demo mode
  static getDummyAccounts() {
    return [
      {
        email: 'employee.dummy@loganfreights.co.za',
        password: 'Employee123!',
        name: 'John Driver',
        role: 'employee',
        department: 'Logistics'
      },
      {
        email: 'manager.dummy@loganfreights.co.za',
        password: 'Manager123!',
        name: 'Sarah Manager',
        role: 'manager',
        department: 'Management'
      },
      {
        email: 'hr.dummy@loganfreights.co.za',
        password: 'HR123!',
        name: 'Jane HR',
        role: 'hr',
        department: 'Human Resources'
      },
      {
        email: 'admin@loganfreights.co.za',
        password: 'Admin123!',
        name: 'System Administrator',
        role: 'administrator',
        department: 'IT'
      }
    ];
  }
}

export const authService = new SupabaseAuthService();
export default authService;