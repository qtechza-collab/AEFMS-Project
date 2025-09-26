import { supabase } from './supabase/client';

export interface EmployeeData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  hireDate: string;
  status: 'active' | 'inactive' | 'suspended';
  profilePhoto?: string;
  lastLogin?: string;
  totalClaims: number;
  totalAmount: number;
  averageClaimAmount: number;
}

export interface DepartmentStats {
  department: string;
  employeeCount: number;
  totalClaims: number;
  totalAmount: number;
  averageAmount: number;
}

export interface EmployeePerformanceMetrics {
  employeeId: string;
  name: string;
  claimsThisMonth: number;
  claimsLastMonth: number;
  averageProcessingTime: number;
  complianceScore: number;
  flaggedClaims: number;
}

/**
 * Logan Freights Employee Management Service
 * Comprehensive employee administration and analytics
 */
class EmployeeManagementService {
  
  /**
   * Get all employees with statistics
   */
  async getAllEmployees(): Promise<{ success: boolean; data?: EmployeeData[]; error?: string }> {
    try {
      // Get basic employee data
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (employeesError) throw employeesError;

      // Get claim statistics for each employee
      const { data: claimStats, error: claimStatsError } = await supabase
        .from('expense_claims')
        .select('employee_id, amount, status');

      if (claimStatsError) throw claimStatsError;

      // Calculate statistics per employee
      const statsMap = new Map<string, { totalClaims: number; totalAmount: number; averageAmount: number }>();
      
      (claimStats || []).forEach(claim => {
        const employeeId = claim.employee_id;
        const current = statsMap.get(employeeId) || { totalClaims: 0, totalAmount: 0, averageAmount: 0 };
        
        current.totalClaims++;
        current.totalAmount += claim.amount || 0;
        current.averageAmount = current.totalAmount / current.totalClaims;
        
        statsMap.set(employeeId, current);
      });

      const employeeData: EmployeeData[] = (employees || []).map(employee => {
        const stats = statsMap.get(employee.id) || { totalClaims: 0, totalAmount: 0, averageAmount: 0 };
        
        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          position: employee.position || 'Employee',
          hireDate: employee.hire_date || employee.created_at,
          status: employee.status || 'active',
          profilePhoto: employee.profile_photo,
          lastLogin: employee.last_login,
          totalClaims: stats.totalClaims,
          totalAmount: stats.totalAmount,
          averageClaimAmount: stats.averageAmount
        };
      });

      return { success: true, data: employeeData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get employees'
      };
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(): Promise<{ success: boolean; data?: DepartmentStats[]; error?: string }> {
    try {
      // Get employees by department
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, department');

      if (employeesError) throw employeesError;

      // Get all claims
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('employee_id, amount, department');

      if (claimsError) throw claimsError;

      // Group by department
      const departmentMap = new Map<string, DepartmentStats>();

      // Initialize departments from employees
      (employees || []).forEach(employee => {
        const dept = employee.department;
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, {
            department: dept,
            employeeCount: 0,
            totalClaims: 0,
            totalAmount: 0,
            averageAmount: 0
          });
        }
        departmentMap.get(dept)!.employeeCount++;
      });

      // Add claim statistics
      (claims || []).forEach(claim => {
        const dept = claim.department;
        if (departmentMap.has(dept)) {
          const stats = departmentMap.get(dept)!;
          stats.totalClaims++;
          stats.totalAmount += claim.amount || 0;
          stats.averageAmount = stats.totalAmount / stats.totalClaims;
        }
      });

      return { success: true, data: Array.from(departmentMap.values()) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get department statistics'
      };
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(employeeData: {
    name: string;
    email: string;
    role: string;
    department: string;
    position?: string;
    hireDate?: string;
  }): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: employeeData.name,
          email: employeeData.email,
          role: employeeData.role,
          department: employeeData.department,
          position: employeeData.position || 'Employee',
          hire_date: employeeData.hireDate || new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log the creation
      await this.logEmployeeAction('employee_created', `New employee created: ${employeeData.name}`, {
        employeeId: data.id,
        name: employeeData.name,
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
    updates: Partial<EmployeeData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map the updates to database fields
      if (updates.name) updateData.name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.role) updateData.role = updates.role;
      if (updates.department) updateData.department = updates.department;
      if (updates.position) updateData.position = updates.position;
      if (updates.status) updateData.status = updates.status;
      if (updates.hireDate) updateData.hire_date = updates.hireDate;

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', employeeId);

      if (error) throw error;

      // Log the update
      await this.logEmployeeAction('employee_updated', `Employee information updated`, {
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
   * Deactivate employee
   */
  async deactivateEmployee(employeeId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          status: 'inactive',
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (error) throw error;

      // Log the deactivation
      await this.logEmployeeAction('employee_deactivated', `Employee deactivated`, {
        employeeId,
        reason
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate employee'
      };
    }
  }

  /**
   * Get employee performance metrics
   */
  async getEmployeePerformanceMetrics(): Promise<{ success: boolean; data?: EmployeePerformanceMetrics[]; error?: string }> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get employees
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id, name')
        .eq('status', 'active');

      if (employeesError) throw employeesError;

      // Get claims for analysis
      const { data: claims, error: claimsError } = await supabase
        .from('expense_claims')
        .select('employee_id, submitted_at, approved_at, status, flagged_for_review')
        .gte('submitted_at', lastMonthStart.toISOString());

      if (claimsError) throw claimsError;

      const metrics: EmployeePerformanceMetrics[] = (employees || []).map(employee => {
        const employeeClaims = (claims || []).filter(c => c.employee_id === employee.id);
        
        const thisMonthClaims = employeeClaims.filter(c => 
          new Date(c.submitted_at) >= thisMonthStart
        ).length;

        const lastMonthClaims = employeeClaims.filter(c => {
          const date = new Date(c.submitted_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        }).length;

        const processedClaims = employeeClaims.filter(c => c.approved_at);
        const averageProcessingTime = processedClaims.length > 0 
          ? processedClaims.reduce((sum, c) => {
              const submitted = new Date(c.submitted_at).getTime();
              const approved = new Date(c.approved_at!).getTime();
              return sum + (approved - submitted) / (1000 * 60 * 60 * 24); // days
            }, 0) / processedClaims.length
          : 0;

        const flaggedClaims = employeeClaims.filter(c => c.flagged_for_review).length;
        const complianceScore = employeeClaims.length > 0 
          ? Math.max(0, 100 - (flaggedClaims / employeeClaims.length * 100))
          : 100;

        return {
          employeeId: employee.id,
          name: employee.name,
          claimsThisMonth: thisMonthClaims,
          claimsLastMonth: lastMonthClaims,
          averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
          complianceScore: Math.round(complianceScore),
          flaggedClaims
        };
      });

      return { success: true, data: metrics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get performance metrics'
      };
    }
  }

  /**
   * Search employees
   */
  async searchEmployees(query: string): Promise<{ success: boolean; data?: EmployeeData[]; error?: string }> {
    try {
      const { data: employees, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`)
        .order('name');

      if (error) throw error;

      // Convert to EmployeeData format (simplified for search)
      const employeeData: EmployeeData[] = (employees || []).map(employee => ({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        position: employee.position || 'Employee',
        hireDate: employee.hire_date || employee.created_at,
        status: employee.status || 'active',
        profilePhoto: employee.profile_photo,
        lastLogin: employee.last_login,
        totalClaims: 0, // Would need separate query for exact counts
        totalAmount: 0,
        averageClaimAmount: 0
      }));

      return { success: true, data: employeeData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search employees'
      };
    }
  }

  /**
   * Log employee management actions
   */
  private async logEmployeeAction(actionType: string, description: string, metadata?: any): Promise<void> {
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
      console.warn('Failed to log employee action:', error);
    }
  }
}

// Export singleton instance
export const employeeManagementService = new EmployeeManagementService();

// Export utility functions
export const getAllEmployees = () => employeeManagementService.getAllEmployees();
export const getDepartmentStats = () => employeeManagementService.getDepartmentStats();
export const createEmployee = (employeeData: any) => employeeManagementService.createEmployee(employeeData);
export const updateEmployee = (employeeId: string, updates: Partial<EmployeeData>) => 
  employeeManagementService.updateEmployee(employeeId, updates);
export const deactivateEmployee = (employeeId: string, reason?: string) => 
  employeeManagementService.deactivateEmployee(employeeId, reason);
export const getEmployeePerformanceMetrics = () => employeeManagementService.getEmployeePerformanceMetrics();
export const searchEmployees = (query: string) => employeeManagementService.searchEmployees(query);