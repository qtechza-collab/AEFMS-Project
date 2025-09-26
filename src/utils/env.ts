// Environment variable management for Logan Freights System
// Handles both production and development environments with proper fallbacks

// Environment variable cache
let envCache: Record<string, string> = {};
let isInitialized = false;

/**
 * Get environment variable with proper fallbacks
 * @param key Environment variable key
 * @param defaultValue Optional default value
 * @returns Environment variable value or default
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  // Initialize cache on first use
  if (!isInitialized) {
    initializeEnvCache();
    isInitialized = true;
  }

  // Return cached value or default
  return envCache[key] || defaultValue || '';
}

/**
 * Check if we're running in demo mode (no real Supabase credentials)
 */
export function isDemoMode(): boolean {
  const url = getEnvVar('VITE_SUPABASE_URL');
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY');
  
  return !url || !key || 
         url.includes('demo-project') || 
         key.includes('demo-') ||
         url === 'https://demo-project.supabase.co' ||
         key === 'demo-anon-key';
}

/**
 * Initialize environment variable cache
 */
function initializeEnvCache(): void {
  try {
    // Vite environment variables
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      Object.keys(import.meta.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          envCache[key] = import.meta.env[key] as string;
        }
      });
    }

    // Process environment variables (Node.js)
    if (typeof process !== 'undefined' && process.env) {
      Object.keys(process.env).forEach(key => {
        if (process.env[key]) {
          envCache[key] = process.env[key] as string;
        }
      });
    }

    // Fall back to connected Supabase credentials if env vars not set
    if (!envCache['VITE_SUPABASE_URL'] || !envCache['VITE_SUPABASE_ANON_KEY']) {
      try {
        // Try to load from the connected Supabase info
        const infoModule = require('./supabase/info');
        if (infoModule.projectId && infoModule.publicAnonKey) {
          envCache['VITE_SUPABASE_URL'] = `https://${infoModule.projectId}.supabase.co`;
          envCache['VITE_SUPABASE_ANON_KEY'] = infoModule.publicAnonKey;
          console.log('[Logan Freights] Using connected Supabase credentials');
        }
      } catch (error) {
        console.warn('[Logan Freights] Could not load connected Supabase credentials:', error);
      }
    }

    // Browser environment detection
    if (typeof window !== 'undefined') {
      envCache['RUNTIME_ENV'] = 'browser';
    } else if (typeof global !== 'undefined') {
      envCache['RUNTIME_ENV'] = 'node';
    }

    // Check demo mode without calling the function to avoid circular reference
    const url = envCache['VITE_SUPABASE_URL'];
    const key = envCache['VITE_SUPABASE_ANON_KEY'];
    const isDemoModeLocal = !url || !key || 
           url.includes('demo-project') || 
           key.includes('demo-') ||
           url === 'https://demo-project.supabase.co' ||
           key === 'demo-anon-key';

    console.log('[Logan Freights] Environment initialized:', {
      hasSupabaseUrl: !!envCache['VITE_SUPABASE_URL'],
      hasSupabaseKey: !!envCache['VITE_SUPABASE_ANON_KEY'],
      isDemoMode: isDemoModeLocal,
      runtime: envCache['RUNTIME_ENV'] || 'unknown',
      url: url ? url.substring(0, 30) + '...' : 'not set'
    });

  } catch (error) {
    console.warn('[Logan Freights] Environment initialization warning:', error);
    
    // Fallback to demo mode if environment setup fails
    envCache = {
      'VITE_SUPABASE_URL': 'https://demo-project.supabase.co',
      'VITE_SUPABASE_ANON_KEY': 'demo-anon-key',
      'NODE_ENV': 'development',
      'RUNTIME_ENV': 'browser'
    };
  }
}

// Auto-initialize for immediate use
initializeEnvCache();