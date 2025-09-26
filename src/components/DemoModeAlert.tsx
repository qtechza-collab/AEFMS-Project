import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Info, ExternalLink } from 'lucide-react';

interface DemoModeAlertProps {
  isDemoMode: boolean;
}

export function DemoModeAlert({ isDemoMode }: DemoModeAlertProps) {
  if (!isDemoMode) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Demo Mode:</strong> Supabase credentials not configured. 
        <span className="ml-2">
          Use demo accounts: employee.dummy@loganfreights.co.za / Employee123! 
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 underline"
          >
            Get Supabase <ExternalLink className="h-3 w-3" />
          </a>
        </span>
      </AlertDescription>
    </Alert>
  );
}