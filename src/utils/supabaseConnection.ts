import { supabase } from './supabase/client';
import { getEnvVar } from './env';

export interface ConnectionTest {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
}

export interface SupabaseConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  tests: ConnectionTest[];
  configuration: {
    url: string;
    hasAnonKey: boolean;
    hasServiceKey: boolean;
  };
}

/**
 * Logan Freights Supabase Connection Service
 */
class SupabaseConnectionService {
  
  async testConnection(): Promise<{ success: boolean; status?: SupabaseConnectionStatus; error?: string }> {
    try {
      const tests: ConnectionTest[] = [];
      let connected = false;
      let authenticated = false;

      // Test basic connection
      const startTime = Date.now();
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        const duration = Date.now() - startTime;
        
        if (error) {
          tests.push({
            name: 'Database Connection',
            status: 'fail',
            message: error.message,
            duration
          });
        } else {
          connected = true;
          tests.push({
            name: 'Database Connection',
            status: 'pass',
            message: 'Successfully connected to database',
            duration
          });
        }
      } catch (error) {
        tests.push({
          name: 'Database Connection',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Connection failed'
        });
      }

      // Test authentication
      try {
        const { data: session } = await supabase.auth.getSession();
        authenticated = !!session?.session;
        
        tests.push({
          name: 'Authentication',
          status: authenticated ? 'pass' : 'warning',
          message: authenticated ? 'User authenticated' : 'No active session'
        });
      } catch (error) {
        tests.push({
          name: 'Authentication',
          status: 'fail',
          message: 'Authentication check failed'
        });
      }

      // Test storage
      try {
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        
        tests.push({
          name: 'Storage',
          status: storageError ? 'fail' : 'pass',
          message: storageError ? storageError.message : `${buckets?.length || 0} storage buckets available`
        });
      } catch (error) {
        tests.push({
          name: 'Storage',
          status: 'fail',
          message: 'Storage check failed'
        });
      }

      const configuration = {
        url: getEnvVar('VITE_SUPABASE_URL') || 'not configured',
        hasAnonKey: !!getEnvVar('VITE_SUPABASE_ANON_KEY'),
        hasServiceKey: !!getEnvVar('VITE_SUPABASE_SERVICE_KEY')
      };

      const status: SupabaseConnectionStatus = {
        connected,
        authenticated,
        tests,
        configuration
      };

      return { success: true, status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  async setupDatabase(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Check if tables exist and create if needed
      const requiredTables = ['users', 'expense_claims', 'receipt_images', 'notifications'];
      
      for (const table of requiredTables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          return {
            success: false,
            error: `Table '${table}' is missing or inaccessible. Please run the database setup script.`
          };
        }
      }

      return {
        success: true,
        message: 'Database setup verified - all required tables are accessible'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database setup check failed'
      };
    }
  }
}

export const supabaseConnectionService = new SupabaseConnectionService();