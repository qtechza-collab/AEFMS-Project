import { supabase } from './supabase/client';

export interface HRManagementData {
  employeeOverview: EmployeeOverview;
  departmentStats: DepartmentStats[];
  performanceMetrics: PerformanceMetrics;
  complianceTracking: ComplianceTracking;
  onboarding: OnboardingData;
  training: TrainingData;
}

export interface EmployeeOverview {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  departures: number;
  employeesByDepartment: Array<{ department: string; count: number }>;
  employeesByRole: Array<{ role: string; count: number }>;
  averageTenure: number;
  retentionRate: number;
}

export interface DepartmentStats {
  department: string;
  employeeCount: number;
  managerId?: string;
  managerName?: string;
  avgSalary: number;
  budgetUtilization: number;
  performanceScore: number;
  turnoverRate: number;
  vacancies: number;
}

export interface PerformanceMetrics {
  overallPerformance: number;
  topPerformers: EmployeePerformance[];
  improvementNeeded: EmployeePerformance[];
  performanceByDepartment: Array<{
    department: string;
    avgScore: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  reviewsCompleted: number;
  reviewsDue: number;
}

export interface EmployeePerformance {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  performanceScore: number;
  lastReviewDate: string;
  goals: number;
  achievements: number;
}

export interface ComplianceTracking {
  overallCompliance: number;
  trainingCompliance: number;
  policyAcknowledgments: number;
  certificationStatus: Array<{
    certification: string;
    compliant: number;
    total: number;
    expiringSoon: number;
  }>;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  id: string;
  employeeId: string;
  employeeName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedDate: string;
  status: 'open' | 'investigating' | 'resolved';
  resolutionNotes?: string;
}

export interface OnboardingData {
  pendingOnboarding: Array<{
    employeeId: string;
    name: string;
    startDate: string;
    department: string;
    progress: number;
    assignedBuddy?: string;
  }>;
  recentlyOnboarded: Array<{
    employeeId: string;
    name: string;
    completedDate: string;
    satisfaction: number;
  }>;
  onboardingStats: {
    avgCompletionTime: number;
    completionRate: number;
    satisfactionScore: number;
  };
}

export interface TrainingData {
  upcomingTraining: TrainingSession[];
  completedTraining: TrainingSession[];
  trainingStats: {
    totalSessions: number;
    avgAttendance: number;
    completionRate: number;
    costPerEmployee: number;
  };
  requiredTraining: Array<{
    employeeId: string;
    name: string;
    missingTraining: string[];
    deadline: string;
  }>;
}

export interface TrainingSession {
  id: string;
  title: string;
  type: 'mandatory' | 'optional' | 'certification';
  instructor: string;
  scheduledDate: string;
  duration: number;
  maxParticipants: number;
  enrolledCount: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Logan Freights HR Management Service
 * Comprehensive HR operations and employee lifecycle management
 */
class HRManagementService {
  
  /**
   * Get comprehensive HR management data
   */
  async getHRManagementData(): Promise<{ success: boolean; data?: HRManagementData; error?: string }> {
    try {
      console.log('👥 Collecting HR management data...');

      const [
        employeeOverview,
        departmentStats,
        performanceMetrics,
        complianceTracking,
        onboarding,
        training
      ] = await Promise.all([
        this.getEmployeeOverview(),
        this.getDepartmentStats(),
        this.getPerformanceMetrics(),
        this.getComplianceTracking(),
        this.getOnboardingData(),
        this.getTrainingData()
      ]);

      const hrData: HRManagementData = {
        employeeOverview,
        departmentStats,
        performanceMetrics,
        complianceTracking,
        onboarding,
        training
      };

      return { success: true, data: hrData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get HR management data'
      };
    }
  }

  /**
   * Get employee overview statistics
   */
  private async getEmployeeOverview(): Promise<EmployeeOverview> {
    try {
      const { data: employees, error } = await supabase
        .from('users')
        .select('id, department, role, created_at, status, hire_date');

      if (error) throw error;

      const totalEmployees = employees?.length || 0;
      const activeEmployees = employees?.filter(e => e.status !== 'inactive').length || 0;

      // New hires (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newHires = employees?.filter(e => {
        const hireDate = new Date(e.hire_date || e.created_at);
        return hireDate >= thirtyDaysAgo;
      }).length || 0;

      // Departures (would need departure tracking)
      const departures = 2; // Mock data - would be tracked separately

      // Group by department
      const departmentMap = new Map<string, number>();
      employees?.forEach(emp => {
        const dept = emp.department || 'Unknown';
        departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
      });
      const employeesByDepartment = Array.from(departmentMap.entries())
        .map(([department, count]) => ({ department, count }));

      // Group by role
      const roleMap = new Map<string, number>();
      employees?.forEach(emp => {
        const role = emp.role || 'employee';
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });
      const employeesByRole = Array.from(roleMap.entries())
        .map(([role, count]) => ({ role, count }));

      // Calculate average tenure
      const tenures = employees?.map(emp => {
        const hireDate = new Date(emp.hire_date || emp.created_at);
        const now = new Date();
        return (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365); // years
      }) || [];
      const averageTenure = tenures.length > 0 
        ? tenures.reduce((sum, tenure) => sum + tenure, 0) / tenures.length 
        : 0;

      // Retention rate (simplified)
      const retentionRate = totalEmployees > 0 ? ((totalEmployees - departures) / totalEmployees) * 100 : 100;

      return {
        totalEmployees,
        activeEmployees,
        newHires,
        departures,
        employeesByDepartment,
        employeesByRole,
        averageTenure: Math.round(averageTenure * 10) / 10,
        retentionRate: Math.round(retentionRate * 100) / 100
      };
    } catch (error) {
      console.warn('Failed to get employee overview:', error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        newHires: 0,
        departures: 0,
        employeesByDepartment: [],
        employeesByRole: [],
        averageTenure: 0,
        retentionRate: 100
      };
    }
  }

  /**
   * Get department statistics
   */
  private async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      const { data: employees, error: empError } = await supabase
        .from('users')
        .select('id, department, role');

      const { data: expenses, error: expError } = await supabase
        .from('expense_claims')
        .select('amount, department, status');

      if (empError) throw empError;

      // Group employees by department
      const departmentMap = new Map<string, {
        employeeCount: number;
        managers: string[];
        totalExpenses: number;
      }>();

      employees?.forEach(emp => {
        const dept = emp.department || 'Unknown';
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, {
            employeeCount: 0,
            managers: [],
            totalExpenses: 0
          });
        }
        
        const deptData = departmentMap.get(dept)!;
        deptData.employeeCount++;
        
        if (emp.role === 'manager' || emp.role === 'hr' || emp.role === 'administrator') {
          deptData.managers.push(emp.id);
        }
      });

      // Add expense data
      expenses?.forEach(expense => {
        const dept = expense.department || 'Unknown';
        if (departmentMap.has(dept) && expense.status === 'approved') {
          departmentMap.get(dept)!.totalExpenses += expense.amount || 0;
        }
      });

      const stats: DepartmentStats[] = Array.from(departmentMap.entries()).map(([department, data]) => ({
        department,
        employeeCount: data.employeeCount,
        managerId: data.managers[0],
        managerName: 'Manager Name', // Would lookup from users table
        avgSalary: 65000, // Logan Freights average - would be from salary data
        budgetUtilization: Math.min(100, (data.totalExpenses / 500000) * 100), // Assuming R500k dept budget
        performanceScore: 85, // Would be calculated from performance reviews
        turnoverRate: 5, // Would be calculated from departure data
        vacancies: 0 // Would be from job postings
      }));

      return stats.sort((a, b) => b.employeeCount - a.employeeCount);
    } catch (error) {
      console.warn('Failed to get department stats:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Mock performance data - would come from performance review system
      const mockPerformances: EmployeePerformance[] = [
        {
          employeeId: 'emp_001',
          name: 'John Smith',
          department: 'Operations',
          role: 'Manager',
          performanceScore: 95,
          lastReviewDate: '2024-01-15',
          goals: 5,
          achievements: 5
        },
        {
          employeeId: 'emp_002',
          name: 'Sarah Johnson',
          department: 'Finance',
          role: 'Analyst',
          performanceScore: 88,
          lastReviewDate: '2024-02-01',
          goals: 4,
          achievements: 3
        }
      ];

      const topPerformers = mockPerformances
        .filter(p => p.performanceScore >= 90)
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 5);

      const improvementNeeded = mockPerformances
        .filter(p => p.performanceScore < 70)
        .sort((a, b) => a.performanceScore - b.performanceScore)
        .slice(0, 5);

      const performanceByDepartment = [
        { department: 'Operations', avgScore: 87, trend: 'up' as const },
        { department: 'Finance', avgScore: 85, trend: 'stable' as const },
        { department: 'HR', avgScore: 90, trend: 'up' as const },
        { department: 'IT', avgScore: 88, trend: 'stable' as const }
      ];

      return {
        overallPerformance: 87,
        topPerformers,
        improvementNeeded,
        performanceByDepartment,
        reviewsCompleted: 42,
        reviewsDue: 3
      };
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
      return {
        overallPerformance: 85,
        topPerformers: [],
        improvementNeeded: [],
        performanceByDepartment: [],
        reviewsCompleted: 0,
        reviewsDue: 0
      };
    }
  }

  /**
   * Get compliance tracking data
   */
  private async getComplianceTracking(): Promise<ComplianceTracking> {
    try {
      // Mock compliance data - would come from compliance system
      const certificationStatus = [
        {
          certification: 'Safety Training',
          compliant: 40,
          total: 45,
          expiringSoon: 5
        },
        {
          certification: 'Data Protection',
          compliant: 42,
          total: 45,
          expiringSoon: 2
        },
        {
          certification: 'Financial Compliance',
          compliant: 38,
          total: 45,
          expiringSoon: 3
        }
      ];

      const violations: ComplianceViolation[] = [
        {
          id: 'viol_001',
          employeeId: 'emp_003',
          employeeName: 'Mike Wilson',
          violationType: 'Policy Violation',
          severity: 'medium',
          description: 'Late expense submission beyond policy deadline',
          reportedDate: '2024-02-15',
          status: 'investigating'
        }
      ];

      const overallCompliance = certificationStatus.reduce((sum, cert) => 
        sum + (cert.compliant / cert.total), 0) / certificationStatus.length * 100;

      return {
        overallCompliance: Math.round(overallCompliance),
        trainingCompliance: 88,
        policyAcknowledgments: 95,
        certificationStatus,
        violations
      };
    } catch (error) {
      console.warn('Failed to get compliance tracking:', error);
      return {
        overallCompliance: 90,
        trainingCompliance: 88,
        policyAcknowledgments: 95,
        certificationStatus: [],
        violations: []
      };
    }
  }

  /**
   * Get onboarding data
   */
  private async getOnboardingData(): Promise<OnboardingData> {
    try {
      // Mock onboarding data - would come from onboarding system
      const pendingOnboarding = [
        {
          employeeId: 'emp_new_001',
          name: 'Jane Doe',
          startDate: '2024-03-01',
          department: 'Operations',
          progress: 65,
          assignedBuddy: 'John Smith'
        }
      ];

      const recentlyOnboarded = [
        {
          employeeId: 'emp_new_002',
          name: 'Tom Brown',
          completedDate: '2024-02-20',
          satisfaction: 4.5
        }
      ];

      const onboardingStats = {
        avgCompletionTime: 14, // days
        completionRate: 95, // percentage
        satisfactionScore: 4.3 // out of 5
      };

      return {
        pendingOnboarding,
        recentlyOnboarded,
        onboardingStats
      };
    } catch (error) {
      console.warn('Failed to get onboarding data:', error);
      return {
        pendingOnboarding: [],
        recentlyOnboarded: [],
        onboardingStats: {
          avgCompletionTime: 0,
          completionRate: 0,
          satisfactionScore: 0
        }
      };
    }
  }

  /**
   * Get training data
   */
  private async getTrainingData(): Promise<TrainingData> {
    try {
      // Mock training data - would come from training management system
      const upcomingTraining: TrainingSession[] = [
        {
          id: 'train_001',
          title: 'Expense Management Best Practices',
          type: 'mandatory',
          instructor: 'HR Team',
          scheduledDate: '2024-03-15',
          duration: 120, // minutes
          maxParticipants: 20,
          enrolledCount: 15,
          status: 'scheduled'
        },
        {
          id: 'train_002',
          title: 'IFRS Compliance Training',
          type: 'mandatory',
          instructor: 'Finance Team',
          scheduledDate: '2024-03-20',
          duration: 180,
          maxParticipants: 25,
          enrolledCount: 18,
          status: 'scheduled'
        }
      ];

      const completedTraining: TrainingSession[] = [
        {
          id: 'train_003',
          title: 'Safety Training 2024',
          type: 'mandatory',
          instructor: 'Safety Officer',
          scheduledDate: '2024-02-10',
          duration: 90,
          maxParticipants: 30,
          enrolledCount: 28,
          status: 'completed'
        }
      ];

      const trainingStats = {
        totalSessions: 12,
        avgAttendance: 88, // percentage
        completionRate: 92, // percentage
        costPerEmployee: 1200 // ZAR
      };

      const requiredTraining = [
        {
          employeeId: 'emp_004',
          name: 'Lisa Adams',
          missingTraining: ['Safety Training', 'Data Protection'],
          deadline: '2024-03-30'
        }
      ];

      return {
        upcomingTraining,
        completedTraining,
        trainingStats,
        requiredTraining
      };
    } catch (error) {
      console.warn('Failed to get training data:', error);
      return {
        upcomingTraining: [],
        completedTraining: [],
        trainingStats: {
          totalSessions: 0,
          avgAttendance: 0,
          completionRate: 0,
          costPerEmployee: 0
        },
        requiredTraining: []
      };
    }
  }

  /**
   * Create new employee record
   */
  async createEmployee(employeeData: {
    name: string;
    email: string;
    department: string;
    role: string;
    position?: string;
    hireDate?: string;
    salary?: number;
  }): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: employeeData.name,
          email: employeeData.email,
          department: employeeData.department,
          role: employeeData.role,
          position: employeeData.position || 'Employee',
          hire_date: employeeData.hireDate || new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create onboarding record
      await supabase
        .from('employee_onboarding')
        .insert({
          employee_id: data.id,
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString()
        });

      // Log HR action
      await this.logHRAction('employee_created', `New employee created: ${employeeData.name}`, {
        employeeId: data.id,
        department: employeeData.department
      });

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create employee'
      };
    }
  }

  /**
   * Update employee information
   */
  async updateEmployee(
    employeeId: string,
    updates: {
      name?: string;
      email?: string;
      department?: string;
      role?: string;
      position?: string;
      status?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] !== undefined) {
          updateData[key] = updates[key as keyof typeof updates];
        }
      });

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', employeeId);

      if (error) throw error;

      // Log HR action
      await this.logHRAction('employee_updated', `Employee information updated`, {
        employeeId,
        updates
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update employee'
      };
    }
  }

  /**
   * Schedule employee training
   */
  async scheduleTraining(trainingData: Omit<TrainingSession, 'id' | 'enrolledCount' | 'status'>): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          title: trainingData.title,
          type: trainingData.type,
          instructor: trainingData.instructor,
          scheduled_date: trainingData.scheduledDate,
          duration: trainingData.duration,
          max_participants: trainingData.maxParticipants,
          enrolled_count: 0,
          status: 'scheduled',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule training'
      };
    }
  }

  /**
   * Log HR action for audit trail
   */
  private async logHRAction(actionType: string, description: string, metadata?: any): Promise<void> {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action_type: actionType,
          description,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log HR action:', error);
    }
  }
}

// Export singleton instance
export const hrManagementService = new HRManagementService();

// Export utility functions
export const getHRManagementData = () => hrManagementService.getHRManagementData();
export const createEmployee = (employeeData: any) => hrManagementService.createEmployee(employeeData);
export const updateEmployee = (employeeId: string, updates: any) => 
  hrManagementService.updateEmployee(employeeId, updates);
export const scheduleTraining = (trainingData: any) => hrManagementService.scheduleTraining(trainingData);