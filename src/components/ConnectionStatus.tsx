import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Database, HardDrive } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getEnvVar, isDemoMode } from '../utils/env';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [connectionType, setConnectionType] = useState<'production' | 'demo'>('demo');

  useEffect(() => {
    // Check connection status periodically
    const checkConnection = async () => {
      try {
        const isDemo = isDemoMode();
        setConnectionType(isDemo ? 'demo' : 'production');
        
        if (isDemo) {
          setIsConnected(false);
          return;
        }

        // Test actual Supabase connection
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
        
        setIsConnected(!error);
      } catch (error) {
        console.log('Connection check failed:', error);
        setIsConnected(false);
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Show status for first 10 seconds, then only show if offline
    setTimeout(() => {
      setShowStatus(true);
      setTimeout(() => {
        if (isConnected && connectionType === 'production') {
          setShowStatus(false);
        }
      }, 10000);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, connectionType]);

  // Always show if offline or demo mode, or show temporarily when online
  if (!showStatus && isConnected && connectionType === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        variant={isConnected && connectionType === 'production' ? "default" : "destructive"} 
        className={`flex items-center gap-2 px-3 py-2 ${
          isConnected && connectionType === 'production'
            ? 'bg-green-100 text-green-800 border-green-200' 
            : connectionType === 'demo'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : 'bg-red-100 text-red-800 border-red-200'
        }`}
      >
        {isConnected && connectionType === 'production' ? (
          <>
            <Database className="w-4 h-4" />
            <span>Production Ready</span>
          </>
        ) : connectionType === 'demo' ? (
          <>
            <HardDrive className="w-4 h-4" />
            <span>Demo Mode</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Connection Error</span>
          </>
        )}
      </Badge>
    </div>
  );
}