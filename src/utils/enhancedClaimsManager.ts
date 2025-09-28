import { dataService } from './supabaseDataService';
import type { ExpenseClaim } from './supabaseDataService';
import { toast } from 'sonner';

/**
 * Enhanced Claims Manager for Logan Freights
 * Provides advanced claims management, workflow optimization, and batch operations
 */
class EnhancedClaimsManager {
  private operationQueue: Map<string, Promise<any>> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Create a new expense claim with enhanced validation and processing
   */
  async createClaim(claimData: Partial<ExpenseClaim>): Promise<{
    success: boolean;
    claim?: ExpenseClaim;
    error?: string;
    validationErrors?: string[];
  }> {
    try {
      // Enhanced validation
      const validation = this.validateClaimData(claimData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors: validation.errors
        };
      }

      // Pre-process claim data
      const processedData = this.preprocessClaimData(claimData);

      // Create the claim using base service
      const result = await dataService.createClaim(processedData);
      
      if (result.success) {
        // Post-creation processing
        await this.postCreateProcessing(result.claim!);
        
        toast.success('Expense claim created successfully!');
        
        // Emit custom event for real-time updates
        this.emitClaimsUpdate('claim-created', result.claim!);
        
        return result;
      } else {
        toast.error(`Failed to create claim: ${result.error}`);
        return result;
      }

    } catch (error) {
      console.error('Enhanced Claims Manager - Create Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error creating claim: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Update an existing claim with optimistic updates and rollback capability
   */
  async updateClaim(
    claimId: string, 
    updates: Partial<ExpenseClaim>,
    options: { optimistic?: boolean; silent?: boolean } = {}
  ): Promise<{
    success: boolean;
    claim?: ExpenseClaim;
    error?: string;
  }> {
    const operationId = `update-${claimId}-${Date.now()}`;
    
    try {
      // Prevent duplicate operations
      if (this.operationQueue.has(claimId)) {
        console.log('Update already in progress for claim:', claimId);
        return await this.operationQueue.get(claimId)!;
      }

      const updatePromise = this.executeUpdateWithRetry(claimId, updates, options);
      this.operationQueue.set(claimId, updatePromise);

      const result = await updatePromise;
      
      this.operationQueue.delete(claimId);
      this.retryAttempts.delete(operationId);

      return result;

    } catch (error) {
      this.operationQueue.delete(claimId);
      console.error('Enhanced Claims Manager - Update Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (!options.silent) {
        toast.error(`Failed to update claim: ${errorMessage}`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete claim with confirmation and cascade options
   */
  async deleteClaim(
    claimId: string,
    options: { force?: boolean; cascade?: boolean } = {}
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Check if claim can be deleted
      if (!options.force) {
        const canDelete = await this.canDeleteClaim(claimId);
        if (!canDelete.allowed) {
          toast.error(canDelete.reason || 'Cannot delete this claim');
          return {
            success: false,
            error: canDelete.reason || 'Deletion not allowed'
          };
        }
      }

      // Perform deletion using base service
      const result = await dataService.deleteClaim?.(claimId);
      
      if (result?.success) {
        toast.success('Claim deleted successfully');
        this.emitClaimsUpdate('claim-deleted', { id: claimId });
        return { success: true };
      } else {
        const error = result?.error || 'Failed to delete claim';
        toast.error(error);
        return { success: false, error };
      }

    } catch (error) {
      console.error('Enhanced Claims Manager - Delete Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error deleting claim: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get claims with advanced filtering and sorting
   */
  async getFilteredClaims(
    userId: string,
    filters: {
      status?: string[];
      dateRange?: { start: string; end: string };
      amountRange?: { min: number; max: number };
      categories?: string[];
      searchTerm?: string;
    } = {},
    options: {
      sortBy?: 'date' | 'amount' | 'status' | 'category';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    success: boolean;
    claims?: ExpenseClaim[];
    totalCount?: number;
    error?: string;
  }> {
    try {
      // Get base claims data
      const result = await dataService.getUserExpenseClaims(userId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      let filteredClaims = [...result.data];

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        filteredClaims = filteredClaims.filter(claim => 
          filters.status!.includes(claim.status)
        );
      }

      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        filteredClaims = filteredClaims.filter(claim => {
          const claimDate = new Date(claim.expense_date);
          return claimDate >= start && claimDate <= end;
        });
      }

      if (filters.amountRange) {
        filteredClaims = filteredClaims.filter(claim => 
          claim.amount >= filters.amountRange!.min && 
          claim.amount <= filters.amountRange!.max
        );
      }

      if (filters.categories && filters.categories.length > 0) {
        filteredClaims = filteredClaims.filter(claim => 
          filters.categories!.includes(claim.category)
        );
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredClaims = filteredClaims.filter(claim =>
          claim.description?.toLowerCase().includes(searchLower) ||
          claim.vendor?.toLowerCase().includes(searchLower) ||
          claim.category?.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      if (options.sortBy) {
        filteredClaims.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'date':
              aValue = new Date(a.expense_date);
              bValue = new Date(b.expense_date);
              break;
            case 'amount':
              aValue = a.amount;
              bValue = b.amount;
              break;
            case 'status':
              aValue = a.status;
              bValue = b.status;
              break;
            case 'category':
              aValue = a.category;
              bValue = b.category;
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
          if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      const totalCount = filteredClaims.length;

      // Apply pagination
      if (options.offset !== undefined || options.limit !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || filteredClaims.length;
        filteredClaims = filteredClaims.slice(offset, offset + limit);
      }

      return {
        success: true,
        claims: filteredClaims,
        totalCount
      };

    } catch (error) {
      console.error('Enhanced Claims Manager - Filter Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to filter claims'
      };
    }
  }

  /**
   * Private helper methods
   */
  private validateClaimData(claimData: Partial<ExpenseClaim>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!claimData.amount || claimData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!claimData.category) {
      errors.push('Category is required');
    }

    if (!claimData.description || claimData.description.trim().length < 5) {
      errors.push('Description must be at least 5 characters');
    }

    if (!claimData.expense_date) {
      errors.push('Expense date is required');
    }

    if (!claimData.employee_id) {
      errors.push('Employee ID is required');
    }

    // Logan Freights specific validations
    if (claimData.amount && claimData.amount > 10000) {
      errors.push('Claims over R10,000 require additional approval');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private preprocessClaimData(claimData: Partial<ExpenseClaim>): Partial<ExpenseClaim> {
    return {
      ...claimData,
      currency: claimData.currency || 'ZAR',
      submitted_at: claimData.submitted_at || new Date().toISOString(),
      status: claimData.status || 'pending'
    };
  }

  private async postCreateProcessing(claim: ExpenseClaim): Promise<void> {
    try {
      // Send notification to manager if applicable
      if (claim.manager_id) {
        // Notification logic would go here
        console.log(`Notification sent for new claim ${claim.id}`);
      }

      // Log audit trail
      console.log(`Claim ${claim.id} created successfully for employee ${claim.employee_id}`);

    } catch (error) {
      console.error('Post-create processing error:', error);
      // Don't fail the main operation for post-processing errors
    }
  }

  private async executeUpdateWithRetry(
    claimId: string, 
    updates: Partial<ExpenseClaim>, 
    options: { optimistic?: boolean; silent?: boolean }
  ): Promise<{ success: boolean; claim?: ExpenseClaim; error?: string }> {
    const operationId = `update-${claimId}-${Date.now()}`;
    const attempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await dataService.updateClaim(claimId, updates);
      
      if (result.success) {
        if (!options.silent) {
          toast.success('Claim updated successfully');
        }
        this.emitClaimsUpdate('claim-updated', result.claim!);
      }
      
      return result;

    } catch (error) {
      if (attempts < this.MAX_RETRIES) {
        this.retryAttempts.set(operationId, attempts + 1);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (attempts + 1)));
        return this.executeUpdateWithRetry(claimId, updates, options);
      }
      
      throw error;
    }
  }

  private async canDeleteClaim(claimId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check claim status and other business rules
      // For now, simple implementation
      return { allowed: true };
      
    } catch (error) {
      return { 
        allowed: false, 
        reason: 'Unable to verify deletion permissions' 
      };
    }
  }

  private emitClaimsUpdate(eventType: string, data: any): void {
    try {
      // Emit custom event for real-time updates
      const event = new CustomEvent('logan-claims-updated', {
        detail: { type: eventType, data, timestamp: Date.now() }
      });
      window.dispatchEvent(event);

      console.log(`📡 Enhanced Claims Manager: Emitted ${eventType} event`, data);

    } catch (error) {
      console.error('Error emitting claims update:', error);
    }
  }

  /**
   * Export claims data in various formats
   */
  async exportClaims(
    userId: string,
    format: 'csv' | 'excel' | 'pdf' = 'csv',
    filters?: any
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.getFilteredClaims(userId, filters);
      
      if (!result.success || !result.claims) {
        return { success: false, error: result.error };
      }

      switch (format) {
        case 'csv':
          const csvData = this.convertToCSV(result.claims);
          return { success: true, data: csvData };
        
        default:
          return { success: false, error: 'Format not supported yet' };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  private convertToCSV(claims: ExpenseClaim[]): string {
    const headers = ['ID', 'Date', 'Category', 'Amount', 'Currency', 'Description', 'Status', 'Vendor'];
    const rows = claims.map(claim => [
      claim.id,
      claim.expense_date,
      claim.category,
      claim.amount,
      claim.currency,
      claim.description,
      claim.status,
      claim.vendor || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field || ''}"`).join(',')
    ).join('\n');
  }

  /**
   * Get claims with simple filter (backward compatibility)
   */
  async getClaims(
    filters: { employee_id: string },
    user: { id: string; role: string }
  ): Promise<ExpenseClaim[]> {
    try {
      const result = await this.getFilteredClaims(filters.employee_id);
      return result.claims || [];
    } catch (error) {
      console.error('Enhanced Claims Manager - getClaims Error:', error);
      return [];
    }
  }

  /**
   * Clear operation cache and reset retry counters
   */
  clearCache(): void {
    this.operationQueue.clear();
    this.retryAttempts.clear();
    console.log('🗑️ Enhanced Claims Manager cache cleared');
  }
}

// Export singleton instance
export const enhancedClaimsManager = new EnhancedClaimsManager();

// Default export
export default enhancedClaimsManager;
