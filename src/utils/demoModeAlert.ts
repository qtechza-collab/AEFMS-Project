import { demoIndicatorService } from './demoIndicator';

export interface DemoAlert {
  show: boolean;
  message: string;
  type: 'info' | 'warning';
  dismissible: boolean;
}

/**
 * Logan Freights Demo Mode Alert Service
 */
class DemoModeAlertService {
  
  getDemoAlert(): DemoAlert {
    if (demoIndicatorService.isDemoMode()) {
      return {
        show: true,
        message: 'You are using Logan Freights in demo mode. Connect to Supabase for full functionality.',
        type: 'warning',
        dismissible: true
      };
    }

    return {
      show: false,
      message: '',
      type: 'info',
      dismissible: false
    };
  }

  shouldShowAlert(): boolean {
    const dismissed = localStorage.getItem('logan-demo-alert-dismissed');
    return demoIndicatorService.isDemoMode() && !dismissed;
  }

  dismissAlert(): void {
    localStorage.setItem('logan-demo-alert-dismissed', 'true');
  }
}

export const demoModeAlertService = new DemoModeAlertService();