import { getEnvVar } from './env';

/**
 * Logan Freights Demo Indicator Service
 */
class DemoIndicatorService {
  
  isDemoMode(): boolean {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
    
    return !supabaseUrl || 
           !supabaseKey || 
           supabaseUrl.includes('demo-project') || 
           supabaseKey.includes('demo-');
  }

  getDemoMessage(): string {
    return 'DEMO MODE - Using sample data for demonstration purposes';
  }

  getDemoFeatures(): string[] {
    return [
      'Sample expense data',
      'Mock approval workflows',
      'Simulated analytics',
      'No real database storage'
    ];
  }
}

export const demoIndicatorService = new DemoIndicatorService();