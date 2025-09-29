import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './components/LoginPage';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { EmployerDashboard } from './components/EmployerDashboard';
import { HRDashboard } from './components/HRDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ConnectionStatus } from './components/ConnectionStatus';
import { SupabaseConnection } from './components/SupabaseConnection';
import { Toaster } from './components/ui/sonner';
// Production build - debugging components removed
import { authService, User as AuthUser } from './src/utils/supabaseAuth';
import { dataService } from './utils/supabaseDataService';
import { getEnvVar } from './utils/env';

// Enhanced error logging for production debugging
const logToConsole = (message: string, data?: any) => {
  console.log(`[Logan Freights] ${message}`, data || '');
  // Also try to display critical errors in the UI
  if (message.includes('ERROR') || message.includes('CRITICAL')) {
    // Store errors in memory instead of sessionStorage for Vercel compatibility
    try {
      const errors = (window as any).__loganErrors || [];
      errors.push({ timestamp: new Date().toISOString(), message, data });
      (window as any).__loganErrors = errors.slice(-10); // Keep last 10 errors
    } catch (e) {
      // Ignore storage errors
    }
  }
};

export type UserRole = 'employee' | 'manager' | 'hr' | 'administrator';

export interface User extends AuthUser {
  username?: string; // For backward compatibility
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemReady, setSystemReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logToConsole('🚀 Starting Logan Freights Expense Management System...');
        
        // Check if Supabase is configured
        const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
        const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
        const isSupabaseConfigured = !!(supabaseUrl && supabaseKey && 
          !supabaseUrl.includes('demo-project') && 
          !supabaseKey.includes('demo-'));
        
        setIsDemoMode(!isSupabaseConfigured);
        
        logToConsole('Environment check:', {
          nodeEnv: getEnvVar('NODE_ENV') || 'not-set',
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
          isConfigured: isSupabaseConfigured,
          demoMode: !isSupabaseConfigured,
          userAgent: navigator.userAgent,
          url: window.location.href
        });
        
        // Prevent multiple initialization
        if (typeof window !== 'undefined') {
          if ((window as any).__loganFreightsAppInitialized) {
            logToConsole('App already initialized, skipping...');
            setIsLoading(false);
            return;
          }
          (window as any).__loganFreightsAppInitialized = true;
        }
        
        // Add a small delay to ensure all scripts have loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check for existing session
        try {
          logToConsole('Checking for existing session...');
          const sessionResult = await authService.getCurrentSession();
          if (sessionResult.success && sessionResult.user) {
            setUser(sessionResult.user);
            logToConsole('✅ Session restored for user:', sessionResult.user.name);
          } else {
            logToConsole('No existing session found');
          }
        } catch (sessionError) {
          logToConsole('Session check failed, continuing with fresh start:', sessionError);
        }
        
        setSystemReady(true);
        logToConsole('✅ Logan Freights system ready for use');
        
      } catch (error) {
        logToConsole('CRITICAL ERROR: App initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setSystemReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Add error handlers for unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      logToConsole('CRITICAL ERROR: Unhandled error:', event.error);
      setInitError(`Unhandled error: ${event.error?.message || 'Unknown error'}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logToConsole('CRITICAL ERROR: Unhandled promise rejection:', event.reason);
      setInitError(`Promise rejection: ${event.reason?.message || 'Unknown rejection'}`);
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    initializeApp();

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (typeof window !== 'undefined') {
        (window as any).__loganFreightsAppInitialized = false;
      }
    };
  }, []);

  const handleLogin = async (email: string, password: string, role?: UserRole) => {
    try {
      console.log('Attempting authentication with Supabase...');
      
      const result = await authService.signIn(email, password);
      
      if (result.success && result.user) {
        // Verify role if provided
        if (role && result.user.role !== role) {
          return { success: false, error: `Invalid role. Expected ${role}, but user has ${result.user.role} role.` };
        }
        
        setUser(result.user);
        console.log('✅ Login successful for user:', result.user.name);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login. Please try again.' };
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null); // Force logout even if there's an error
    }
  };

  const renderDashboard = () => {
    if (!user) return null;

    switch (user.role) {
      case 'employee':
        return <EmployeeDashboard user={user} onLogout={handleLogout} setUser={setUser} />;
      case 'manager':
        return <EmployerDashboard user={user} onLogout={handleLogout} setUser={setUser} />;
      case 'hr':
        return <HRDashboard user={user} onLogout={handleLogout} setUser={setUser} />;
      case 'administrator':
        return <AdminDashboard user={user} onLogout={handleLogout} setUser={setUser} />;
      default:
        return <EmployeeDashboard user={user} onLogout={handleLogout} setUser={setUser} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 mb-4">Loading Logan Freights System...</p>
          
          {/* Debug info for troubleshooting */}
          <div className="text-xs text-slate-400 space-y-1">
            <div>Environment: {getEnvVar('NODE_ENV') || 'unknown'}</div>
            <div>URL: {window.location.href}</div>
            <div>Timestamp: {new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show initialization error if one occurred
  if (initError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg mb-4">System Initialization Error</h2>
          <p className="text-red-700 mb-4 text-sm">{initError}</p>
          
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reload Application
          </button>
          
          {/* Debug information */}
          <details className="mt-4 text-left">
            <summary className="text-xs text-slate-500 cursor-pointer">Debug Information</summary>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <div>Environment: {getEnvVar('NODE_ENV') || 'unknown'}</div>
              <div>URL: {window.location.href}</div>
              <div>User Agent: {navigator.userAgent}</div>
              <div>Supabase URL: {getEnvVar('VITE_SUPABASE_URL') ? 'Set' : 'Not Set'}</div>
              <div>Supabase Key: {getEnvVar('VITE_SUPABASE_ANON_KEY') ? 'Set' : 'Not Set'}</div>
              <div>Errors: {JSON.stringify((window as any).__loganErrors || [])}</div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} isDemoMode={isDemoMode} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {renderDashboard()}
        <ConnectionStatus />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}
