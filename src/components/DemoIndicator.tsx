import React from 'react';
import { Badge } from './ui/badge';
import { CloudOff } from 'lucide-react';
import { getEnvVar } from '../utils/env';

interface DemoIndicatorProps {
  isDemoMode?: boolean;
}

export function DemoIndicator({ isDemoMode = false }: DemoIndicatorProps) {
  // Don't show anything if not in demo mode
  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex flex-col space-y-2">
        <Badge 
          variant="outline" 
          className="bg-yellow-50 text-yellow-700 border-yellow-200"
          title="Demo Mode: Using fallback data"
        >
          <CloudOff className="w-3 h-3 mr-1" />
          Demo Mode
        </Badge>
        <div className="text-xs text-gray-500 max-w-48 text-right">
          Using mock data
        </div>
      </div>
    </div>
  );
}