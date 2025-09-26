import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { getEnvVar, isDemoMode } from '../utils/env';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Logan Freights Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const isConfigured = !isDemoMode();
      const envVars = {
        VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
        VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
        NODE_ENV: getEnvVar('NODE_ENV')
      };
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Logan Freights System Error
                </h1>
                <p className="text-gray-600">
                  Something went wrong with the application
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-red-900 mb-2">Error Details:</h3>
              <p className="text-red-700 text-sm font-mono">
                {this.state.error?.message || 'Unknown error occurred'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="text-red-700 text-sm cursor-pointer">
                    View Stack Trace
                  </summary>
                  <pre className="text-xs text-red-600 mt-2 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Environment Configuration Status */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Environment Configuration
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Configuration Status:</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isConfigured 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isConfigured ? 'Configured' : 'Using Defaults'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Supabase URL:</span>
                  <span className="text-xs text-gray-500 font-mono max-w-xs truncate">
                    {envVars.VITE_SUPABASE_URL}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Environment:</span>
                  <span className="text-xs text-gray-500">
                    {envVars.NODE_ENV || 'development'}
                  </span>
                </div>
              </div>
            </div>

            {/* Common Solutions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-3">Common Solutions:</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Check that all environment variables are properly set</li>
                <li>• Ensure Supabase project is active and configured</li>
                <li>• Verify internet connection for cloud services</li>
                <li>• Clear browser cache and local storage</li>
                {!isConfigured && (
                  <li>• <strong>Set up your Supabase credentials in environment variables</strong></li>
                )}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </button>
              
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>

            {/* Environment Variables Help */}
            {!isConfigured && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">
                  🔧 Environment Setup Required
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  To use Logan Freights with your Supabase project, create a <code>.env.local</code> file with:
                </p>
                <pre className="text-xs bg-yellow-100 p-2 rounded border font-mono">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}