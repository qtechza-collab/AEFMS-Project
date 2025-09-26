import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvVar } from '../env';

// Global singleton instance - only create one client for the entire application
let supabaseInstance: SupabaseClient | null = null;

// Track if we've already initialized to prevent multiple instances
declare global {
  interface Window {
    __loganFreightsSupabaseClient?: SupabaseClient;
  }
}

export function getOrCreateSupabaseClient(): SupabaseClient {
  // Check if we already have an instance in the window object (browser)
  if (typeof window !== 'undefined' && window.__loganFreightsSupabaseClient) {
    return window.__loganFreightsSupabaseClient;
  }

  // Check if we already have a module-level instance
  if (supabaseInstance) {
    return supabaseInstance;
  }

  console.log('🔄 Creating new Supabase client instance...');

  // Try environment variables first, then fall back to the connected info
  let supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  let supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  // Fall back to connected Supabase credentials if env vars not set
  if (!supabaseUrl || !supabaseAnonKey) {
    try {
      const { projectId, publicAnonKey } = require('./info');
      if (projectId && publicAnonKey) {
        supabaseUrl = `https://${projectId}.supabase.co`;
        supabaseAnonKey = publicAnonKey;
        console.log('✅ Using connected Supabase credentials');
      }
    } catch (error) {
      console.warn('Could not load connected Supabase credentials:', error);
    }
  }

  // Check if we still don't have valid credentials
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('demo-project') || supabaseAnonKey.includes('demo-')) {
    console.warn('⚠️ Supabase credentials not configured. Running in demo mode.');
    
    // Return a mock client that doesn't make real network requests
    const mockClient = {
      auth: {
        signInWithPassword: () => Promise.resolve({ 
          data: null, 
          error: { message: 'Demo mode: Supabase not configured' } 
        }),
        signUp: () => Promise.resolve({ 
          data: null, 
          error: { message: 'Demo mode: Supabase not configured' } 
        }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ 
          data: { session: null }, 
          error: { message: 'Demo mode: Supabase not configured' } 
        }),
        admin: {
          deleteUser: () => Promise.resolve({ error: null })
        }
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ 
              data: null, 
              error: { message: 'Demo mode: Supabase not configured' } 
            }),
            order: () => ({
              limit: () => Promise.resolve({ 
                data: [], 
                error: null 
              })
            })
          }),
          order: () => Promise.resolve({ 
            data: [], 
            error: null 
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ 
              data: null, 
              error: { message: 'Demo mode: Supabase not configured' } 
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ 
                data: null, 
                error: { message: 'Demo mode: Supabase not configured' } 
              })
            })
          })
        })
      }),
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ 
            error: { message: 'Demo mode: Supabase not configured' } 
          }),
          getPublicUrl: () => ({ 
            data: { publicUrl: 'https://demo-image.jpg' } 
          })
        })
      }
    };
    
    supabaseInstance = mockClient as any;
    
    // Store in window object for browser environment
    if (typeof window !== 'undefined') {
      window.__loganFreightsSupabaseClient = supabaseInstance;
    }
    
    console.log('✅ Mock Supabase client initialized for demo mode');
    return supabaseInstance;
  }

  // Create new instance with real credentials
  supabaseInstance = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        storageKey: 'logan-freights-auth-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'logan-freights-expense-system'
        }
      }
    }
  );

  // Store in window object for browser environment
  if (typeof window !== 'undefined') {
    window.__loganFreightsSupabaseClient = supabaseInstance;
  }

  console.log('✅ Supabase client initialized with real credentials');
  return supabaseInstance;
}

// Export a getter function to ensure lazy initialization
let _cachedClient: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_cachedClient) {
      _cachedClient = getOrCreateSupabaseClient();
    }
    return _cachedClient[prop as keyof SupabaseClient];
  }
});