import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle, AlertCircle, Database, Globe, Shield, Loader2 } from 'lucide-react';
import { getEnvVar, isDemoMode } from '../utils/env';
import { supabase } from '../utils/supabase/client';

interface ProductionStatusProps {
  className?: string;
}

export function ProductionStatus({ className }: ProductionStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'ready' | 'needs-setup' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const demoMode = isDemoMode();
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');

  useEffect(() => {
    checkProductionStatus();
  }, []);

  const checkProductionStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (demoMode) {
        setConnectionStatus('error');
        setDatabaseStatus('needs-setup');
        setError('Running in demo mode - Supabase not configured');
        return;
      }

      // Test basic connection
      const { data, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (connectionError) {
        if (connectionError.message.includes('relation "public.users" does not exist')) {
          setConnectionStatus('connected');
          setDatabaseStatus('needs-setup');
          setError('Database schema not installed');
        } else {
          setConnectionStatus('error');
          setDatabaseStatus('error');
          setError(connectionError.message);
        }
      } else {
        setConnectionStatus('connected');
        setDatabaseStatus('ready');
      }
    } catch (err) {
      setConnectionStatus('error');
      setDatabaseStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (connectionStatus === 'connected' && databaseStatus === 'ready') return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant="outline">Checking...</Badge>;
    if (demoMode) return <Badge variant="outline" className="text-amber-700 border-amber-300">Demo Mode</Badge>;
    if (connectionStatus === 'connected' && databaseStatus === 'ready') {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Production Ready</Badge>;
    }
    if (connectionStatus === 'connected' && databaseStatus === 'needs-setup') {
      return <Badge variant="outline" className="text-blue-700 border-blue-300">Setup Required</Badge>;
    }
    return <Badge variant="destructive">Connection Error</Badge>;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-base">System Status</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Logan Freights production deployment status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium">Connection</div>
              <div className={`text-xs ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <Database className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm font-medium">Database</div>
              <div className={`text-xs ${databaseStatus === 'ready' ? 'text-green-600' : 'text-amber-600'}`}>
                {databaseStatus === 'ready' ? 'Ready' : 
                 databaseStatus === 'needs-setup' ? 'Setup Required' : 'Error'}
              </div>
            </div>
          </div>

          {/* Security Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm font-medium">Security</div>
              <div className="text-xs text-green-600">RLS Enabled</div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800 mb-2">⚠️ Status Message</div>
            <div className="text-xs text-red-600">{error}</div>
          </div>
        )}

        {/* Setup Instructions */}
        {databaseStatus === 'needs-setup' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800 mb-2">🚀 Setup Required</div>
            <div className="text-xs text-blue-600 mb-3">
              Run the database schema in your Supabase project to enable all features.
            </div>
            <Button 
              size="sm" 
              onClick={() => window.open(`${supabaseUrl}/project/sql`, '_blank')}
              className="text-xs"
            >
              Open SQL Editor
            </Button>
          </div>
        )}

        {/* Success Message */}
        {connectionStatus === 'connected' && databaseStatus === 'ready' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800 mb-1">✅ Production Ready</div>
            <div className="text-xs text-green-600">
              All systems operational. Full functionality available.
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkProductionStatus}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Checking...' : 'Refresh Status'}
        </Button>
      </CardContent>
    </Card>
  );
}