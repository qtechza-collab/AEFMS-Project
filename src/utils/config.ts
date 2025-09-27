// Configuration for Logan Freights Expense Management System
import { getEnvVar, isDemoMode } from './env';

export const config = {
  // Supabase configuration - update these with your actual values
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY')
  },
  
  // API endpoints
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL')
  },

  // Application settings
  app: {
    name: 'Logan Freights Logistics CC',
    currency: 'ZAR',
    taxRate: 0.15, // 15% VAT for South Africa
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFileTypes: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
  },

  // Feature flags
  features: {
    realTimeUpdates: true,
    emailNotifications: true,
    voiceAuthentication: false, // Disabled for production
    offlineMode: false,
    auditLogging: true
  },

  // Storage configuration
  storage: {
    buckets: {
      receipts: 'logan-receipts-6223d981',
      profiles: 'logan-profiles-6223d981', 
      financials: 'logan-financials-6223d981'
    }
  },

  // B4A (Back4App) configuration - fallback/alternative service
  b4a: {
    serverUrl: getEnvVar('VITE_B4A_SERVER_URL') || 'https://parseapi.back4app.com',
    applicationId: getEnvVar('VITE_B4A_APPLICATION_ID') || 'demo-app-id',
    restApiKey: getEnvVar('VITE_B4A_REST_API_KEY') || 'demo-rest-api-key',
    enabled: false // Disabled by default - using Supabase as primary
  }
};

// Environment detection (browser-safe)
export const isDevelopment = getEnvVar('NODE_ENV') === 'development';
export const isProduction = getEnvVar('NODE_ENV') === 'production';

// Helper function to check if configuration is complete
export const isConfigured = () => !isDemoMode();

// Helper function to get the correct API base URL
export const getApiBaseUrl = () => {
  if (config.api.baseUrl !== 'https://lrwfehxhophofxcxohsc.supabase.co/functions/v1/make-server-6223d981') {
    return config.api.baseUrl;
  }
  
  // If not configured, try to construct from Supabase URL
  if (config.supabase.url !== 'https://lrwfehxhophofxcxohsc.supabase.co') {
    return `${config.supabase.url}/functions/v1/make-server-6223d981`;
  }
  
  return config.api.baseUrl;
};

export default config;
