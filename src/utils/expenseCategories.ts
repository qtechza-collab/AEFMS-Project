import { supabase } from './supabase/client';

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  requiresReceipt: boolean;
  maxAmount?: number;
  approvalRequired: boolean;
  taxDeductible: boolean;
  parentCategory?: string;
  subcategories?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Logan Freights Expense Categories Service
 * Category management and validation
 */
class ExpenseCategoriesService {
  
  private readonly defaultCategories: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Travel',
      description: 'Business travel expenses including flights, accommodation, and transport',
      active: true,
      requiresReceipt: true,
      approvalRequired: true,
      taxDeductible: true,
      maxAmount: 15000
    },
    {
      name: 'Meals',
      description: 'Business meals and entertainment',
      active: true,
      requiresReceipt: true,
      approvalRequired: false,
      taxDeductible: true,
      maxAmount: 1000
    },
    {
      name: 'Fuel',
      description: 'Vehicle fuel expenses',
      active: true,
      requiresReceipt: true,
      approvalRequired: false,
      taxDeductible: true,
      maxAmount: 2000
    },
    {
      name: 'Office Supplies',
      description: 'Stationery, equipment, and office materials',
      active: true,
      requiresReceipt: true,
      approvalRequired: false,
      taxDeductible: true,
      maxAmount: 5000
    },
    {
      name: 'Communications',
      description: 'Phone, internet, and communication expenses',
      active: true,
      requiresReceipt: true,
      approvalRequired: false,
      taxDeductible: true,
      maxAmount: 1500
    },
    {
      name: 'Training',
      description: 'Professional development and training courses',
      active: true,
      requiresReceipt: true,
      approvalRequired: true,
      taxDeductible: true,
      maxAmount: 10000
    },
    {
      name: 'Equipment',
      description: 'Tools, machinery, and equipment purchases',
      active: true,
      requiresReceipt: true,
      approvalRequired: true,
      taxDeductible: true,
      maxAmount: 25000
    },
    {
      name: 'Other',
      description: 'Miscellaneous business expenses',
      active: true,
      requiresReceipt: true,
      approvalRequired: true,
      taxDeductible: false,
      maxAmount: 3000
    }
  ];

  /**
   * Get all expense categories
   */
  async getCategories(activeOnly: boolean = true): Promise<{ success: boolean; data?: ExpenseCategory[]; error?: string }> {
    try {
      let query = supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // If no categories exist, return defaults
      if (!data || data.length === 0) {
        return { success: true, data: this.getDefaultCategories() };
      }

      const categories: ExpenseCategory[] = data.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        active: cat.active,
        requiresReceipt: cat.requires_receipt,
        maxAmount: cat.max_amount,
        approvalRequired: cat.approval_required,
        taxDeductible: cat.tax_deductible,
        parentCategory: cat.parent_category,
        subcategories: cat.subcategories || [],
        createdAt: cat.created_at,
        updatedAt: cat.updated_at
      }));

      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get categories'
      };
    }
  }

  /**
   * Get default categories
   */
  private getDefaultCategories(): ExpenseCategory[] {
    return this.defaultCategories.map((cat, index) => ({
      ...cat,
      id: `default_${index + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Create new category
   */
  async createCategory(categoryData: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description,
          active: categoryData.active,
          requires_receipt: categoryData.requiresReceipt,
          max_amount: categoryData.maxAmount,
          approval_required: categoryData.approvalRequired,
          tax_deductible: categoryData.taxDeductible,
          parent_category: categoryData.parentCategory,
          subcategories: categoryData.subcategories,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, data: { id: data.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category'
      };
    }
  }

  /**
   * Update category
   */
  async updateCategory(categoryId: string, updates: Partial<ExpenseCategory>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.requiresReceipt !== undefined) updateData.requires_receipt = updates.requiresReceipt;
      if (updates.maxAmount !== undefined) updateData.max_amount = updates.maxAmount;
      if (updates.approvalRequired !== undefined) updateData.approval_required = updates.approvalRequired;
      if (updates.taxDeductible !== undefined) updateData.tax_deductible = updates.taxDeductible;
      if (updates.parentCategory !== undefined) updateData.parent_category = updates.parentCategory;
      if (updates.subcategories !== undefined) updateData.subcategories = updates.subcategories;

      const { error } = await supabase
        .from('expense_categories')
        .update(updateData)
        .eq('id', categoryId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category'
      };
    }
  }

  /**
   * Validate expense against category rules
   */
  async validateExpense(categoryId: string, amount: number, hasReceipt: boolean): Promise<{ 
    valid: boolean; 
    warnings: string[]; 
    errors: string[]; 
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Get category details
      const { data: category, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (error || !category) {
        errors.push('Invalid expense category');
        return { valid: false, warnings, errors };
      }

      // Check if category is active
      if (!category.active) {
        errors.push('This expense category is no longer active');
      }

      // Check receipt requirement
      if (category.requires_receipt && !hasReceipt) {
        errors.push('Receipt is required for this category');
      }

      // Check maximum amount
      if (category.max_amount && amount > category.max_amount) {
        errors.push(`Amount exceeds maximum limit of R${category.max_amount} for this category`);
      }

      // Warnings for approval requirements
      if (category.approval_required) {
        warnings.push('This expense requires manager approval');
      }

      // Amount warnings
      if (amount > 5000) {
        warnings.push('High-value expense may require additional documentation');
      }

      return {
        valid: errors.length === 0,
        warnings,
        errors
      };
    } catch (error) {
      errors.push('Failed to validate expense category');
      return { valid: false, warnings, errors };
    }
  }

  /**
   * Get category usage statistics
   */
  async getCategoryStats(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('category, amount, status')
        .eq('status', 'approved');

      if (error) throw error;

      const categoryStats = new Map<string, { 
        totalAmount: number; 
        claimCount: number; 
        averageAmount: number; 
      }>();

      (claims || []).forEach(claim => {
        const category = claim.category;
        const current = categoryStats.get(category) || { totalAmount: 0, claimCount: 0, averageAmount: 0 };
        
        current.totalAmount += claim.amount || 0;
        current.claimCount += 1;
        current.averageAmount = current.totalAmount / current.claimCount;
        
        categoryStats.set(category, current);
      });

      const stats = Array.from(categoryStats.entries()).map(([category, data]) => ({
        category,
        ...data
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get category statistics'
      };
    }
  }

  /**
   * Get popular categories
   */
  async getPopularCategories(limit: number = 5): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const { data: claims, error } = await supabase
        .from('expense_claims')
        .select('category')
        .gte('submitted_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

      if (error) throw error;

      const categoryCount = new Map<string, number>();
      (claims || []).forEach(claim => {
        categoryCount.set(claim.category, (categoryCount.get(claim.category) || 0) + 1);
      });

      const popular = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([category]) => category);

      return { success: true, data: popular };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get popular categories'
      };
    }
  }
}

// Export singleton instance
export const expenseCategoriesService = new ExpenseCategoriesService();

// Export utility functions
export const getCategories = (activeOnly?: boolean) => expenseCategoriesService.getCategories(activeOnly);
export const createCategory = (categoryData: any) => expenseCategoriesService.createCategory(categoryData);
export const updateCategory = (categoryId: string, updates: Partial<ExpenseCategory>) => 
  expenseCategoriesService.updateCategory(categoryId, updates);
export const validateExpense = (categoryId: string, amount: number, hasReceipt: boolean) =>
  expenseCategoriesService.validateExpense(categoryId, amount, hasReceipt);
export const getCategoryStats = () => expenseCategoriesService.getCategoryStats();
export const getPopularCategories = (limit?: number) => expenseCategoriesService.getPopularCategories(limit);