import { supabase } from './supabase/client';
import { dataService, type ExpenseClaim } from './supabaseDataService';

export interface FraudAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  claimId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alertType: string;
  description: string;
  amount: number;
  category: string;
  detectedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolution?: string;
}

export interface FraudPattern {
  pattern: string;
  description: string;
  frequency: number;
  riskScore: number;
  affectedEmployees: string[];
  totalAmount: number;
  detectionRules: string[];
}

export interface RiskAssessment {
  employeeId: string;
  employeeName: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
  lastAssessment: string;
}

/**
 * Logan Freights Fraud Detection Service
 * Advanced expense fraud detection and risk analysis
 */
class FraudDetectionService {
  
  private readonly riskThresholds = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90
  };

  /**
   * Analyze claim for fraud indicators
   */
  async analyzeClaimForFraud(claimId: string): Promise<{ success: boolean; data?: { riskScore: number; alerts: FraudAlert[] }; error?: string }> {
    try {
      // Get claim details
      const { data: claim, error: claimError } = await supabase
        .from('expense_claims')
        .select(`
          *,
          users!expense_claims_employee_id_fkey(name, department)
        `)
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        throw new Error('Claim not found');
      }

      const alerts: FraudAlert[] = [];
      let riskScore = 0;

      // Check for suspicious patterns
      riskScore += await this.checkAmountPatterns(claim, alerts);
      riskScore += await this.checkTimingPatterns(claim, alerts);
      riskScore += await this.checkFrequencyPatterns(claim, alerts);
      riskScore += await this.checkCategoryPatterns(claim, alerts);
      riskScore += await this.checkDescriptionPatterns(claim, alerts);
      riskScore += await this.checkReceiptPatterns(claim, alerts);

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      return { success: true, data: { riskScore, alerts } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze claim for fraud'
      };
    }
  }

  /**
   * Check for suspicious amount patterns
   */
  private async checkAmountPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // Round number check
    if (claim.amount % 100 === 0 && claim.amount >= 500) {
      alerts.push(this.createAlert(claim, 'medium', 'round_amount', 'Round number amount may indicate fabricated expense'));
      riskScore += 15;
    }

    // High amount check
    if (claim.amount > 10000) {
      alerts.push(this.createAlert(claim, 'high', 'high_amount', 'Unusually high expense amount requires verification'));
      riskScore += 25;
    }

    // Check for repeated amounts
    const { data: similarAmounts } = await supabase
      .from('expense_claims')
      .select('id')
      .eq('employee_id', claim.employee_id)
      .eq('amount', claim.amount)
      .neq('id', claim.id);

    if (similarAmounts && similarAmounts.length >= 3) {
      alerts.push(this.createAlert(claim, 'high', 'repeated_amounts', 'Employee has multiple claims with identical amounts'));
      riskScore += 30;
    }

    return riskScore;
  }

  /**
   * Check for suspicious timing patterns
   */
  private async checkTimingPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // Weekend/holiday submission
    const submissionDate = new Date(claim.submitted_at);
    if (submissionDate.getDay() === 0 || submissionDate.getDay() === 6) {
      alerts.push(this.createAlert(claim, 'low', 'weekend_submission', 'Claim submitted on weekend'));
      riskScore += 5;
    }

    // Late night submission
    const hour = submissionDate.getHours();
    if (hour < 6 || hour > 22) {
      alerts.push(this.createAlert(claim, 'low', 'unusual_time', 'Claim submitted during unusual hours'));
      riskScore += 5;
    }

    // Old expense date
    const expenseDate = new Date(claim.expense_date);
    const daysDifference = (submissionDate.getTime() - expenseDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysDifference > 90) {
      alerts.push(this.createAlert(claim, 'medium', 'old_expense', 'Expense is more than 90 days old'));
      riskScore += 20;
    }

    return riskScore;
  }

  /**
   * Check for frequency patterns
   */
  private async checkFrequencyPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // Check submission frequency
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentClaims } = await supabase
      .from('expense_claims')
      .select('id, amount')
      .eq('employee_id', claim.employee_id)
      .gte('submitted_at', thirtyDaysAgo.toISOString());

    if (recentClaims && recentClaims.length > 15) {
      alerts.push(this.createAlert(claim, 'high', 'high_frequency', 'Employee has submitted unusually high number of claims recently'));
      riskScore += 25;
    }

    // Check for pattern of claims just under approval threshold
    const underThresholdClaims = (recentClaims || []).filter(c => c.amount >= 4900 && c.amount <= 5000);
    if (underThresholdClaims.length >= 3) {
      alerts.push(this.createAlert(claim, 'critical', 'threshold_gaming', 'Multiple claims just under approval threshold'));
      riskScore += 40;
    }

    return riskScore;
  }

  /**
   * Check category patterns
   */
  private async checkCategoryPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // High-risk categories
    const highRiskCategories = ['Entertainment', 'Miscellaneous', 'Other', 'Personal'];
    if (highRiskCategories.includes(claim.category)) {
      alerts.push(this.createAlert(claim, 'medium', 'high_risk_category', 'Claim is in high-risk category'));
      riskScore += 15;
    }

    // Check for category switching patterns
    const { data: recentClaims } = await supabase
      .from('expense_claims')
      .select('category')
      .eq('employee_id', claim.employee_id)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (recentClaims) {
      const uniqueCategories = new Set(recentClaims.map(c => c.category));
      if (uniqueCategories.size >= 8) {
        alerts.push(this.createAlert(claim, 'medium', 'category_switching', 'Employee frequently switches between categories'));
        riskScore += 10;
      }
    }

    return riskScore;
  }

  /**
   * Check description patterns
   */
  private async checkDescriptionPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // Short or vague descriptions
    if (!claim.description || claim.description.length < 10) {
      alerts.push(this.createAlert(claim, 'medium', 'vague_description', 'Insufficient or vague expense description'));
      riskScore += 15;
    }

    // Check for copy-paste patterns
    const { data: similarDescriptions } = await supabase
      .from('expense_claims')
      .select('id')
      .eq('employee_id', claim.employee_id)
      .eq('description', claim.description)
      .neq('id', claim.id);

    if (similarDescriptions && similarDescriptions.length >= 2) {
      alerts.push(this.createAlert(claim, 'high', 'duplicate_description', 'Identical description used in multiple claims'));
      riskScore += 25;
    }

    return riskScore;
  }

  /**
   * Check receipt patterns
   */
  private async checkReceiptPatterns(claim: any, alerts: FraudAlert[]): Promise<number> {
    let riskScore = 0;

    // Missing receipt
    const { data: receipts } = await supabase
      .from('receipt_images')
      .select('id')
      .eq('claim_id', claim.id);

    if (!receipts || receipts.length === 0) {
      alerts.push(this.createAlert(claim, 'high', 'missing_receipt', 'No receipt attached to claim'));
      riskScore += 30;
    }

    return riskScore;
  }

  /**
   * Get all fraud alerts
   */
  async getFraudAlerts(status?: string): Promise<{ success: boolean; data?: FraudAlert[]; error?: string }> {
    try {
      let query = supabase
        .from('fraud_alerts')
        .select(`
          *,
          users!fraud_alerts_employee_id_fkey(name),
          expense_claims!fraud_alerts_claim_id_fkey(amount, category, description)
        `)
        .order('detected_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const alerts: FraudAlert[] = (data || []).map(alert => ({
        id: alert.id,
        employeeId: alert.employee_id,
        employeeName: alert.users?.name || 'Unknown',
        claimId: alert.claim_id,
        riskLevel: alert.risk_level,
        alertType: alert.alert_type,
        description: alert.description,
        amount: alert.expense_claims?.amount || 0,
        category: alert.expense_claims?.category || 'Unknown',
        detectedAt: alert.detected_at,
        status: alert.status,
        assignedTo: alert.assigned_to,
        resolution: alert.resolution
      }));

      return { success: true, data: alerts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get fraud alerts'
      };
    }
  }

  /**
   * Generate risk assessment for employee
   */
  async generateRiskAssessment(employeeId: string): Promise<{ success: boolean; data?: RiskAssessment; error?: string }> {
    try {
      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('users')
        .select('name')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      // Get employee's claims for analysis
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('employee_id', employeeId);

      if (claimsError) throw claimsError;

      // Get fraud alerts for this employee
      const { data: alerts, error: alertsError } = await supabase
        .from('fraud_alerts')
        .select('risk_level')
        .eq('employee_id', employeeId)
        .eq('status', 'open');

      let riskScore = 0;
      const riskFactors = [];
      const recommendations = [];

      // Analyze claims
      if (claims && claims.length > 0) {
        // High claim volume
        if (claims.length > 50) {
          riskScore += 10;
          riskFactors.push('High volume of expense claims');
        }

        // High average amount
        const averageAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0) / claims.length;
        if (averageAmount > 2000) {
          riskScore += 15;
          riskFactors.push('Above-average claim amounts');
        }

        // Rejection rate
        const rejectedClaims = claims.filter(c => c.status === 'rejected').length;
        const rejectionRate = (rejectedClaims / claims.length) * 100;
        if (rejectionRate > 15) {
          riskScore += 20;
          riskFactors.push('High claim rejection rate');
        }
      }

      // Add alert-based risk
      if (alerts && alerts.length > 0) {
        const criticalAlerts = alerts.filter(a => a.risk_level === 'critical').length;
        const highAlerts = alerts.filter(a => a.risk_level === 'high').length;
        
        riskScore += criticalAlerts * 30 + highAlerts * 20;
        
        if (criticalAlerts > 0) {
          riskFactors.push(`${criticalAlerts} critical fraud alerts`);
        }
        if (highAlerts > 0) {
          riskFactors.push(`${highAlerts} high-risk fraud alerts`);
        }
      }

      // Generate recommendations
      if (riskScore > 50) {
        recommendations.push('Require additional approval for claims over R1,000');
        recommendations.push('Request additional documentation for all claims');
      }
      if (riskScore > 75) {
        recommendations.push('Conduct expense audit');
        recommendations.push('Require manager pre-approval for all expenses');
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (riskScore >= this.riskThresholds.critical) riskLevel = 'critical';
      else if (riskScore >= this.riskThresholds.high) riskLevel = 'high';
      else if (riskScore >= this.riskThresholds.medium) riskLevel = 'medium';

      const assessment: RiskAssessment = {
        employeeId,
        employeeName: employee.name,
        riskScore: Math.min(100, riskScore),
        riskLevel,
        riskFactors,
        recommendations,
        lastAssessment: new Date().toISOString()
      };

      return { success: true, data: assessment };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate risk assessment'
      };
    }
  }

  /**
   * Create fraud alert
   */
  private createAlert(claim: any, riskLevel: string, alertType: string, description: string): FraudAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: claim.employee_id,
      employeeName: claim.users?.name || 'Unknown',
      claimId: claim.id,
      riskLevel: riskLevel as any,
      alertType,
      description,
      amount: claim.amount,
      category: claim.category,
      detectedAt: new Date().toISOString(),
      status: 'open'
    };
  }

  /**
   * Update fraud alert status
   */
  async updateAlertStatus(
    alertId: string, 
    status: 'investigating' | 'resolved' | 'false_positive',
    resolution?: string,
    assignedTo?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (resolution) updateData.resolution = resolution;
      if (assignedTo) updateData.assigned_to = assignedTo;
      if (status === 'resolved') updateData.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('fraud_alerts')
        .update(updateData)
        .eq('id', alertId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update alert status'
      };
    }
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();

// Export utility functions
export const analyzeClaimForFraud = (claimId: string) => 
  fraudDetectionService.analyzeClaimForFraud(claimId);
export const getFraudAlerts = (status?: string) => 
  fraudDetectionService.getFraudAlerts(status);
export const generateRiskAssessment = (employeeId: string) => 
  fraudDetectionService.generateRiskAssessment(employeeId);
export const updateAlertStatus = (alertId: string, status: any, resolution?: string, assignedTo?: string) => 
  fraudDetectionService.updateAlertStatus(alertId, status, resolution, assignedTo);