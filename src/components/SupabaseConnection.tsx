import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react';
import { getEnvVar } from '../utils/env';

interface SupabaseConnectionProps {
  onConnectionVerified?: () => void;
}

export function SupabaseConnection({ onConnectionVerified }: SupabaseConnectionProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'url' | 'key' | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const url = getEnvVar('VITE_SUPABASE_URL');
    const key = getEnvVar('VITE_SUPABASE_ANON_KEY');
    
    if (!url || !key || url.includes('demo-project') || key.includes('demo-')) {
      setConnectionStatus('disconnected');
      return;
    }

    try {
      // Test the connection
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      
      if (response.ok || response.status === 404) {
        setConnectionStatus('connected');
        setSupabaseUrl(url);
        setSupabaseKey(key);
        onConnectionVerified?.();
      } else {
        setConnectionStatus('error');
        setError('Invalid Supabase credentials');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const verifyConnection = async () => {
    if (!supabaseUrl || !supabaseKey) return;
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      
      if (response.ok || response.status === 404) {
        setConnectionStatus('connected');
        onConnectionVerified?.();
      } else {
        setError('Invalid credentials or project not accessible');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-300">Not Configured</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  if (connectionStatus === 'connected') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Supabase Connected
              </CardTitle>
              <CardDescription className="text-green-600">
                Production database is active and ready
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-green-800">Project URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-white px-2 py-1 rounded border text-green-700">
                {supabaseUrl}
              </code>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(supabaseUrl, 'url')}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                {copied === 'url' ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`${supabaseUrl}/project/api/settings`, '_blank')}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700">
              All production features are active. Financial data, user authentication, and file storage are fully operational.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Supabase Configuration
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              Connect to your Supabase project for full production functionality
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'disconnected' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              Currently running in demo mode. Connect your Supabase project to enable full functionality.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="supabase-url">Supabase Project URL</Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="supabase-key">Supabase Anon Key</Label>
            <div className="relative">
              <Input
                id="supabase-key"
                type={showKey ? "text" : "password"}
                placeholder="eyJ..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={verifyConnection} 
            disabled={!supabaseUrl || !supabaseKey || isVerifying}
            className="w-full"
          >
            {isVerifying ? 'Verifying Connection...' : 'Connect to Supabase'}
          </Button>
        </div>

        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">How to get your Supabase credentials:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 pl-4">
            <li>1. Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">supabase.com</a></li>
            <li>2. Create a new project or select existing project</li>
            <li>3. Go to Settings → API</li>
            <li>4. Copy the Project URL and anon/public key</li>
            <li>5. Run the SQL schema from <code>/supabase/schema.sql</code> in SQL Editor</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}