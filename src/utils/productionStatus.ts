import { supabase } from './supabase/client';
import { getEnvVar } from './env';

export interface ProductionEnvironment {
  isProduction: boolean;
  isDemoMode: boolean;
  environment: 'development' | 'staging' | 'production' | 'demo';
  buildVersion?: string;
  deploymentDate?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  tables: string[];
  policies: string[];
  storage: string[];
  functions: string[];
  lastCheck: string;
  error?: string;
}

export interface SystemConfiguration {
  supabaseUrl: string;
  hasAnonKey: boolean;
  hasServiceKey: boolean;
  rls: boolean;
  storage: boolean;
  auth: boolean;
  realtime: boolean;
}

/**
 * Logan Freights Production Status Service
 * Monitor production environment and system readiness
 */
class ProductionStatusService {
  
  /**
   * Get production environment status
   */
  getProductionEnvironment(): ProductionEnvironment {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
    const nodeEnv = getEnvVar('NODE_ENV') || 'development';
    
    const isDemoMode = !supabaseUrl || 
                      !supabaseKey || 
                      supabaseUrl.includes('demo-project') || 
                      supabaseKey.includes('demo-');

    const isProduction = nodeEnv === 'production' && !isDemoMode;

    let environment: 'development' | 'staging' | 'production' | 'demo' = 'development';
    
    if (isDemoMode) {
      environment = 'demo';
    } else if (nodeEnv === 'production') {
      environment = 'production';
    } else if (nodeEnv === 'staging') {
      environment = 'staging';
    }

    return {
      isProduction,
      isDemoMode,
      environment,
      buildVersion: getEnvVar('VITE_BUILD_VERSION') || 'unknown',
      deploymentDate: getEnvVar('VITE_DEPLOYMENT_DATE') || new Date().toISOString()
    };
  }

  /**
   * Get database status
   */
  async getDatabaseStatus(): Promise<{ success: boolean; status?: DatabaseStatus; error?: string }> {
    try {
      const env = this.getProductionEnvironment();
      
      if (env.isDemoMode) {
        return {
          success: true,
          status: {
            connected: false,
            tables: [],
            policies: [],
            storage: [],
            functions: [],
            lastCheck: new Date().toISOString(),
            error: 'Demo mode - no database connection'
          }
        };
      }

      const status: DatabaseStatus = {
        connected: false,
        tables: [],
        policies: [],
        storage: [],
        functions: [],
        lastCheck: new Date().toISOString()
      };

      // Test basic connection
      try {
        const { error } = await supabase
          .from('users')
          .select('id')
          .limit(1);
        
        status.connected = !error;
        if (error) {
          status.error = error.message;
        }
      } catch (error) {
        status.connected = false;
        status.error = error instanceof Error ? error.message : 'Connection failed';
      }

      // Get table information (if connected)
      if (status.connected) {
        try {
          // Get available tables (simplified - would need proper permissions)
          const expectedTables = [
            'users', 'expense_claims', 'receipt_images', 'notifications',
            'audit_log', 'approval_history', 'department_budgets'
          ];
          
          for (const table of expectedTables) {
            try {
              const { error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
              
              if (!error) {
                status.tables.push(table);
              }
            } catch (error) {
              // Table doesn't exist or no access
            }
          }

          // Check storage buckets
          try {
            const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
            if (!bucketsError && buckets) {
              status.storage = buckets.map(b => b.name);
            }
          } catch (error) {
            // Storage not accessible
          }

        } catch (error) {
          status.error = `Connected but limited access: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      return { success: true, status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get database status'
      };
    }
  }

  /**
   * Get system configuration
   */
  getSystemConfiguration(): SystemConfiguration {
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || '';
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || '';
    const serviceKey = getEnvVar('VITE_SUPABASE_SERVICE_KEY') || '';

    return {
      supabaseUrl: supabaseUrl ? 'configured' : 'not configured',
      hasAnonKey: !!supabaseKey,
      hasServiceKey: !!serviceKey,
      rls: true, // Assume RLS is enabled
      storage: true, // Assume storage is enabled
      auth: true, // Assume auth is enabled
      realtime: true // Assume realtime is enabled
    };
  }

  /**
   * Run system health checks
   */
  async runHealthChecks(): Promise<{ success: boolean; checks?: any[]; error?: string }> {
    try {
      const checks = [];

      // Environment check
      const env = this.getProductionEnvironment();
      checks.push({
        name: 'Environment Configuration',
        status: env.isProduction ? 'pass' : env.isDemoMode ? 'warning' : 'info',
        message: `Running in ${env.environment} mode`,
        details: env
      });

      // Database connectivity check
      const dbStatus = await this.getDatabaseStatus();
      checks.push({
        name: 'Database Connectivity',
        status: dbStatus.success && dbStatus.status?.connected ? 'pass' : 'fail',
        message: dbStatus.status?.connected ? 'Database connected' : 'Database connection failed',
        details: dbStatus.status
      });

      // Configuration check
      const config = this.getSystemConfiguration();
      const configScore = Object.values(config).filter(v => v === true || v === 'configured').length;
      checks.push({
        name: 'System Configuration',
        status: configScore >= 4 ? 'pass' : 'warning',
        message: `${configScore}/6 components configured`,
        details: config
      });

      // Security check
      const securityCheck = await this.checkSecurity();
      checks.push({
        name: 'Security Configuration',
        status: securityCheck.secure ? 'pass' : 'warning',
        message: securityCheck.message,
        details: securityCheck
      });

      // Performance check
      const perfCheck = await this.checkPerformance();
      checks.push({
        name: 'Performance Check',
        status: perfCheck.responseTime < 1000 ? 'pass' : 'warning',
        message: `Response time: ${perfCheck.responseTime}ms`,
        details: perfCheck
      });

      return { success: true, checks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Check security configuration
   */
  private async checkSecurity(): Promise<{ secure: boolean; message: string; details: any }> {
    const env = this.getProductionEnvironment();
    
    if (env.isDemoMode) {
      return {
        secure: false,
        message: 'Demo mode - security features disabled',
        details: { demoMode: true }
      };
    }

    const issues = [];
    const config = this.getSystemConfiguration();

    if (!config.hasAnonKey) {
      issues.push('Missing anonymous key');
    }

    if (env.environment === 'production') {
      if (window.location.protocol !== 'https:') {
        issues.push('Not using HTTPS in production');
      }
    }

    return {
      secure: issues.length === 0,
      message: issues.length === 0 ? 'Security configuration valid' : `${issues.length} security issues found`,
      details: { issues, config }
    };
  }

  /**
   * Check system performance
   */
  private async checkPerformance(): Promise<{ responseTime: number; details: any }> {
    const startTime = performance.now();
    
    try {
      const env = this.getProductionEnvironment();
      
      if (env.isDemoMode) {
        // Simulate response time for demo
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Test actual database response time
        await supabase
          .from('users')
          .select('id')
          .limit(1);
      }
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        responseTime: Math.round(responseTime),
        details: {
          timestamp: new Date().toISOString(),
          connection: env.isDemoMode ? 'demo' : 'database'
        }
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        responseTime: Math.round(endTime - startTime),
        details: {
          error: error instanceof Error ? error.message : 'Performance check failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get deployment information
   */
  getDeploymentInfo(): any {
    return {
      environment: this.getProductionEnvironment(),
      buildInfo: {
        version: getEnvVar('VITE_BUILD_VERSION') || 'development',
        date: getEnvVar('VITE_DEPLOYMENT_DATE') || new Date().toISOString(),
        commit: getEnvVar('VITE_GIT_COMMIT') || 'unknown'
      },
      runtime: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate system report
   */
  async generateSystemReport(): Promise<{ success: boolean; report?: any; error?: string }> {
    try {
      const environment = this.getProductionEnvironment();
      const dbStatus = await this.getDatabaseStatus();
      const configuration = this.getSystemConfiguration();
      const healthChecks = await this.runHealthChecks();
      const deploymentInfo = this.getDeploymentInfo();

      const report = {
        reportId: `report_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        system: 'Logan Freights Expense Management System',
        environment,
        database: dbStatus.status,
        configuration,
        healthChecks: healthChecks.checks,
        deployment: deploymentInfo,
        summary: {
          status: this.getOverallStatus(healthChecks.checks || []),
          issues: this.getIssues(healthChecks.checks || []),
          recommendations: this.getRecommendations(environment, healthChecks.checks || [])
        }
      };

      return { success: true, report };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate system report'
      };
    }
  }

  /**
   * Get overall system status
   */
  private getOverallStatus(checks: any[]): 'healthy' | 'warning' | 'critical' {
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;

    if (failCount > 0) return 'critical';
    if (warningCount > 1) return 'warning';
    return 'healthy';
  }

  /**
   * Get issues from health checks
   */
  private getIssues(checks: any[]): string[] {
    return checks
      .filter(c => c.status === 'fail' || c.status === 'warning')
      .map(c => `${c.name}: ${c.message}`);
  }

  /**
   * Get recommendations based on environment and checks
   */
  private getRecommendations(env: ProductionEnvironment, checks: any[]): string[] {
    const recommendations = [];

    if (env.isDemoMode) {
      recommendations.push('Configure Supabase credentials for production use');
    }

    if (env.environment === 'development') {
      recommendations.push('Deploy to production environment for live use');
    }

    const failedChecks = checks.filter(c => c.status === 'fail');
    if (failedChecks.length > 0) {
      recommendations.push('Address failed health checks before production deployment');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally');
    }

    return recommendations;
  }
}

// Export singleton instance
export const productionStatusService = new ProductionStatusService();

// Export utility functions
export const getProductionEnvironment = () => productionStatusService.getProductionEnvironment();
export const getDatabaseStatus = () => productionStatusService.getDatabaseStatus();
export const getSystemConfiguration = () => productionStatusService.getSystemConfiguration();
export const runHealthChecks = () => productionStatusService.runHealthChecks();
export const getDeploymentInfo = () => productionStatusService.getDeploymentInfo();
export const generateSystemReport = () => productionStatusService.generateSystemReport();