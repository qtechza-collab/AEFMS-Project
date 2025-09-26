import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Database, 
  Key, 
  ChevronDown,
  ExternalLink,
  Copy,
  CheckCheck,
  Rocket
} from 'lucide-react';
import { config, isConfigured } from '../utils/config';
import { toast } from 'sonner';

export function ConfigurationStatus() {
  const [isOpen, setIsOpen] = useState(!isConfigured());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const isSupabaseConfigured = config.supabase.url !== 'https://your-project.supabase.co' &&
                               config.supabase.anonKey !== 'your-anon-key-here';

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, label]));
      toast.success(`${label} copied to clipboard`);
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set([...prev]);
          newSet.delete(label);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isSupabaseConfigured) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          System Ready
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-white shadow-lg border-orange-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span>Setup Required</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="shadow-xl border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration Setup
              </CardTitle>
              <CardDescription>
                Connect your Supabase database to enable all features
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  The system is running in demo mode. Set up Supabase for full functionality.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Supabase URL</span>
                  </div>
                  <Badge variant={isSupabaseConfigured ? "secondary" : "destructive"}>
                    {isSupabaseConfigured ? "Configured" : "Required"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Anonymous Key</span>
                  </div>
                  <Badge variant={isSupabaseConfigured ? "secondary" : "destructive"}>
                    {isSupabaseConfigured ? "Configured" : "Required"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">🚀 Automated Setup (Recommended):</h4>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800 text-sm mb-2">
                    <Rocket className="h-4 w-4" />
                    <span className="font-medium">One-Command Deployment</span>
                  </div>
                  <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span>npm run deploy</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                        onClick={() => copyToClipboard('npm run deploy', 'Deploy Command')}
                      >
                        {copiedItems.has('Deploy Command') ? 
                          <CheckCheck className="h-3 w-3" /> : 
                          <Copy className="h-3 w-3" />
                        }
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    This will automatically set up Supabase, deploy the server function, and configure everything for you.
                  </p>
                </div>

                <h4 className="font-medium text-sm">📋 Manual Setup Instructions:</h4>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">1</span>
                    <div className="flex-1">
                      <p>Create a Supabase project at</p>
                      <Button
                        variant="link"
                        className="h-auto p-0 text-blue-600"
                        onClick={() => window.open('https://supabase.com', '_blank')}
                      >
                        supabase.com <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">2</span>
                    <p>Apply the database schema from <code className="bg-gray-100 px-1 rounded text-xs">/supabase/schema.sql</code></p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">3</span>
                    <p>Deploy the server function:</p>
                  </div>
                </div>

                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono ml-6">
                  <div className="flex items-center justify-between">
                    <span>supabase functions deploy server</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => copyToClipboard('supabase functions deploy server', 'Manual Deploy')}
                    >
                      {copiedItems.has('Manual Deploy') ? 
                        <CheckCheck className="h-3 w-3" /> : 
                        <Copy className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">4</span>
                    <p>Update environment variables in Supabase dashboard:</p>
                  </div>
                </div>

                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between">
                    <span>SUPABASE_URL=your_url_here</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => copyToClipboard('SUPABASE_URL=your_url_here', 'URL Variable')}
                    >
                      {copiedItems.has('URL Variable') ? 
                        <CheckCheck className="h-3 w-3" /> : 
                        <Copy className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SUPABASE_SERVICE_ROLE_KEY=your_key_here</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => copyToClipboard('SUPABASE_SERVICE_ROLE_KEY=your_key_here', 'Key Variable')}
                    >
                      {copiedItems.has('Key Variable') ? 
                        <CheckCheck className="h-3 w-3" /> : 
                        <Copy className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open('/DEPLOYMENT_GUIDE.md', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Full Guide
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsOpen(false)}
                  >
                    Continue Demo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}