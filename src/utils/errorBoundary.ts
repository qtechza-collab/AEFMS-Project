export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

export interface ErrorReport {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

/**
 * Logan Freights Error Boundary Service
 */
class ErrorBoundaryService {
  
  logError(error: Error, errorInfo: ErrorInfo, userId?: string): void {
    const report: ErrorReport = {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId
    };

    console.error('Logan Freights Error:', report);

    // In production, send to error reporting service
    this.sendErrorReport(report);
  }

  private sendErrorReport(report: ErrorReport): void {
    // Implementation for error reporting
    try {
      // Send to external service or local storage
      const errors = JSON.parse(localStorage.getItem('logan-errors') || '[]');
      errors.push(report);
      localStorage.setItem('logan-errors', JSON.stringify(errors.slice(-10)));
    } catch (error) {
      console.warn('Failed to store error report:', error);
    }
  }
}

export const errorBoundaryService = new ErrorBoundaryService();