/**
 * Logan Freights Logistics CC - Financial Data Service
 * Real financial statements and data for dashboard integration
 */

export interface FinancialStatement {
  year: number;
  revenue: {
    total: number;
    freightServices: number;
    logisticsConsulting: number;
    storageServices: number;
  };
  operatingExpenses: {
    total: number;
    fuelDiesel: number;
    vehicleMaintenance: number;
    salariesBenefits: number;
    insurance: number;
    tollFees: number;
    otherOperating: number;
  };
  profitBeforeTax: number;
  incomeTaxExpense: number;
  netProfit: number;
  totalComprehensiveIncome: number;
}

export class LoganFreightsFinancialData {
  static readonly companyInfo = {
    name: "LOGAN FREIGHTS LOGISTICS CC",
    location: "Durban, South Africa",
    financialYearEnd: "31 December",
    taxRate: 0.28, // 28% corporate tax rate
    vatRate: 0.15, // 15% VAT rate for South Africa
    currency: "ZAR",
    currencySymbol: "R"
  };

  static readonly profitLossStatements: FinancialStatement[] = [
    {
      year: 2024,
      revenue: {
        total: 2200000,
        freightServices: 1600000,
        logisticsConsulting: 350000,
        storageServices: 250000
      },
      operatingExpenses: {
        total: 1750000,
        fuelDiesel: 750000,
        vehicleMaintenance: 320000,
        salariesBenefits: 450000,
        insurance: 85000,
        tollFees: 95000,
        otherOperating: 50000
      },
      profitBeforeTax: 450000,
      incomeTaxExpense: 126000,
      netProfit: 324000,
      totalComprehensiveIncome: 324000
    },
    {
      year: 2023,
      revenue: {
        total: 1950000,
        freightServices: 1400000,
        logisticsConsulting: 300000,
        storageServices: 250000
      },
      operatingExpenses: {
        total: 1620000,
        fuelDiesel: 680000,
        vehicleMaintenance: 280000,
        salariesBenefits: 420000,
        insurance: 75000,
        tollFees: 115000,
        otherOperating: 50000
      },
      profitBeforeTax: 330000,
      incomeTaxExpense: 92400,
      netProfit: 237600,
      totalComprehensiveIncome: 237600
    },
    {
      year: 2022,
      revenue: {
        total: 1750000,
        freightServices: 1250000,
        logisticsConsulting: 275000,
        storageServices: 225000
      },
      operatingExpenses: {
        total: 1500000,
        fuelDiesel: 620000,
        vehicleMaintenance: 250000,
        salariesBenefits: 380000,
        insurance: 70000,
        tollFees: 130000,
        otherOperating: 50000
      },
      profitBeforeTax: 250000,
      incomeTaxExpense: 70000,
      netProfit: 180000,
      totalComprehensiveIncome: 180000
    }
  ];

  // Common expense categories for Logan Freights
  static readonly expenseCategories = [
    { id: 'fuel', name: 'Fuel & Diesel', budget: 750000, color: '#ef4444' },
    { id: 'maintenance', name: 'Vehicle Maintenance', budget: 320000, color: '#f97316' },
    { id: 'salaries', name: 'Salaries & Benefits', budget: 450000, color: '#3b82f6' },
    { id: 'insurance', name: 'Insurance', budget: 85000, color: '#8b5cf6' },
    { id: 'tolls', name: 'Toll Fees', budget: 95000, color: '#06b6d4' },
    { id: 'office', name: 'Office Expenses', budget: 30000, color: '#10b981' },
    { id: 'equipment', name: 'Equipment', budget: 50000, color: '#f59e0b' },
    { id: 'travel', name: 'Business Travel', budget: 25000, color: '#84cc16' }
  ];

  // Get current year data
  static getCurrentYearData(): FinancialStatement {
    return this.profitLossStatements[0]; // 2024 data
  }

  // Get previous year data
  static getPreviousYearData(): FinancialStatement {
    return this.profitLossStatements[1]; // 2023 data
  }

  // Calculate year-over-year growth
  static getYearOverYearGrowth() {
    const current = this.getCurrentYearData();
    const previous = this.getPreviousYearData();
    
    return {
      revenue: ((current.revenue.total - previous.revenue.total) / previous.revenue.total) * 100,
      expenses: ((current.operatingExpenses.total - previous.operatingExpenses.total) / previous.operatingExpenses.total) * 100,
      netProfit: ((current.netProfit - previous.netProfit) / previous.netProfit) * 100
    };
  }

  // Format currency for display
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Get budget vs actual analysis
  static getBudgetAnalysis() {
    const currentYear = this.getCurrentYearData();
    
    return this.expenseCategories.map(category => ({
      ...category,
      actual: this.getActualSpendForCategory(category.id),
      variance: this.getActualSpendForCategory(category.id) - category.budget,
      percentageUsed: (this.getActualSpendForCategory(category.id) / category.budget) * 100
    }));
  }

  private static getActualSpendForCategory(categoryId: string): number {
    const currentYear = this.getCurrentYearData();
    
    switch (categoryId) {
      case 'fuel': return currentYear.operatingExpenses.fuelDiesel;
      case 'maintenance': return currentYear.operatingExpenses.vehicleMaintenance;
      case 'salaries': return currentYear.operatingExpenses.salariesBenefits;
      case 'insurance': return currentYear.operatingExpenses.insurance;
      case 'tolls': return currentYear.operatingExpenses.tollFees;
      default: return 0;
    }
  }
}