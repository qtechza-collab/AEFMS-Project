export interface DemoSettings {
  enableDemoMode: boolean;
  demoDataRefreshInterval: number;
  showDemoIndicators: boolean;
  allowDataModification: boolean;
  demoUserRole: 'employee' | 'manager' | 'hr' | 'administrator';
  enterpriseFeatures: {
    analytics: boolean;
    reporting: boolean;
    userManagement: boolean;
    systemAdmin: boolean;
  };
}

export interface DemoData {
  users: DemoUser[];
  expenses: DemoExpense[];
  notifications: DemoNotification[];
  performance: DemoPerformance;
  financials: DemoFinancials;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  totalExpenses: number;
  pendingClaims: number;
}

export interface DemoExpense {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  receiptUrl?: string;
}

export interface DemoNotification {
  id: string;
  type: 'expense_submitted' | 'expense_approved' | 'expense_rejected' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
}

export interface DemoPerformance {
  systemUptime: number;
  responseTime: number;
  activeUsers: number;
  totalTransactions: number;
  errorRate: number;
}

export interface DemoFinancials {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  growthRate: number;
  budgetUtilization: number;
}

/**
 * Logan Freights Enterprise Demo Manager
 * Manages demo mode functionality for enterprise features
 */
class EnterpriseDemoManagerService {
  private demoSettings: DemoSettings = {
    enableDemoMode: true,
    demoDataRefreshInterval: 30000, // 30 seconds
    showDemoIndicators: true,
    allowDataModification: false,
    demoUserRole: 'administrator',
    enterpriseFeatures: {
      analytics: true,
      reporting: true,
      userManagement: true,
      systemAdmin: true
    }
  };

  private demoData: DemoData | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize demo mode
   */
  initialize(): void {
    console.log('🎭 Initializing Enterprise Demo Manager...');
    this.generateDemoData();
    this.startDataRefresh();
  }

  /**
   * Check if demo mode is enabled
   */
  isDemoMode(): boolean {
    return this.demoSettings.enableDemoMode;
  }

  /**
   * Get demo settings
   */
  getDemoSettings(): DemoSettings {
    return { ...this.demoSettings };
  }

  /**
   * Update demo settings
   */
  updateDemoSettings(settings: Partial<DemoSettings>): void {
    this.demoSettings = { ...this.demoSettings, ...settings };
    
    if (settings.demoDataRefreshInterval) {
      this.stopDataRefresh();
      this.startDataRefresh();
    }
  }

  /**
   * Generate comprehensive demo data for Logan Freights
   */
  private generateDemoData(): void {
    const users = this.generateDemoUsers();
    const expenses = this.generateDemoExpenses(users);
    const notifications = this.generateDemoNotifications();
    const performance = this.generateDemoPerformance();
    const financials = this.generateDemoFinancials();

    this.demoData = {
      users,
      expenses,
      notifications,
      performance,
      financials
    };
  }

  /**
   * Generate demo users for Logan Freights
   */
  private generateDemoUsers(): DemoUser[] {
    const departments = ['Operations', 'Finance', 'HR', 'IT', 'Administration'];
    const roles = ['employee', 'manager', 'hr', 'administrator'];
    
    const demoUsers: DemoUser[] = [
      {
        id: 'demo_user_001',
        name: 'John Smith',
        email: 'john.smith@loganfreights.co.za',
        role: 'manager',
        department: 'Operations',
        status: 'active',
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        totalExpenses: 45000,
        pendingClaims: 3
      },
      {
        id: 'demo_user_002',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@loganfreights.co.za',
        role: 'hr',
        department: 'HR',
        status: 'active',
        lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        totalExpenses: 28000,
        pendingClaims: 1
      },
      {
        id: 'demo_user_003',
        name: 'Mike Wilson',
        email: 'mike.wilson@loganfreights.co.za',
        role: 'employee',
        department: 'Operations',
        status: 'active',
        lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        totalExpenses: 32000,
        pendingClaims: 2
      },
      {
        id: 'demo_user_004',
        name: 'Lisa Adams',
        email: 'lisa.adams@loganfreights.co.za',
        role: 'administrator',
        department: 'IT',
        status: 'active',
        lastLogin: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        totalExpenses: 18000,
        pendingClaims: 0
      },
      {
        id: 'demo_user_005',
        name: 'Tom Brown',
        email: 'tom.brown@loganfreights.co.za',
        role: 'employee',
        department: 'Finance',
        status: 'active',
        lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        totalExpenses: 22000,
        pendingClaims: 1
      }
    ];

    // Generate additional random users
    for (let i = 6; i <= 45; i++) {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      
      demoUsers.push({
        id: `demo_user_${String(i).padStart(3, '0')}`,
        name: `Employee ${i}`,
        email: `employee${i}@loganfreights.co.za`,
        role,
        department: dept,
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        totalExpenses: Math.floor(Math.random() * 50000) + 10000,
        pendingClaims: Math.floor(Math.random() * 5)
      });
    }

    return demoUsers;
  }

  /**
   * Generate demo expenses
   */
  private generateDemoExpenses(users: DemoUser[]): DemoExpense[] {
    const categories = ['Fuel', 'Maintenance', 'Office Supplies', 'Travel', 'Meals', 'Equipment', 'Insurance', 'Other'];
    const statuses: Array<'pending' | 'approved' | 'rejected'> = ['pending', 'approved', 'rejected'];
    const expenses: DemoExpense[] = [];

    // Generate expenses for each user
    users.forEach(user => {
      const expenseCount = Math.floor(Math.random() * 8) + 2; // 2-10 expenses per user
      
      for (let i = 0; i < expenseCount; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const amount = Math.floor(Math.random() * 5000) + 100; // R100 - R5000
        const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
        
        expenses.push({
          id: `demo_expense_${user.id}_${i}`,
          employeeId: user.id,
          employeeName: user.name,
          amount,
          category,
          description: this.generateExpenseDescription(category),
          date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          receiptUrl: Math.random() > 0.3 ? `https://demo.loganfreights.co.za/receipts/demo_${i}.jpg` : undefined
        });
      }
    });

    return expenses;
  }

  /**
   * Generate expense description based on category
   */
  private generateExpenseDescription(category: string): string {
    const descriptions: { [key: string]: string[] } = {
      'Fuel': ['Diesel for delivery truck', 'Petrol for company vehicle', 'Fuel for route JHB-DBN'],
      'Maintenance': ['Vehicle service and repair', 'Tire replacement', 'Oil change and inspection'],
      'Office Supplies': ['Stationery and printing', 'Office equipment', 'Computer accessories'],
      'Travel': ['Accommodation in Cape Town', 'Flight to client meeting', 'Hotel expenses'],
      'Meals': ['Client lunch meeting', 'Team dinner', 'Conference catering'],
      'Equipment': ['Safety equipment', 'Communication devices', 'Tools and hardware'],
      'Insurance': ['Vehicle insurance premium', 'Cargo insurance', 'Equipment insurance'],
      'Other': ['Parking fees', 'Toll fees', 'License renewal']
    };

    const categoryDescriptions = descriptions[category] || ['Miscellaneous expense'];
    return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
  }

  /**
   * Generate demo notifications
   */
  private generateDemoNotifications(): DemoNotification[] {
    return [
      {
        id: 'demo_notif_001',
        type: 'expense_submitted',
        title: 'New Expense Submitted',
        message: 'John Smith submitted a fuel expense for R850',
        priority: 'medium',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: 'demo_notif_002',
        type: 'expense_approved',
        title: 'Expense Approved',
        message: 'Your maintenance expense of R2,300 has been approved',
        priority: 'low',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true
      },
      {
        id: 'demo_notif_003',
        type: 'system_alert',
        title: 'Budget Alert',
        message: 'Operations department is approaching budget limit (85% utilized)',
        priority: 'high',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: false
      },
      {
        id: 'demo_notif_004',
        type: 'expense_rejected',
        title: 'Expense Rejected',
        message: 'Travel expense rejected - missing receipt required',
        priority: 'medium',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: false
      }
    ];
  }

  /**
   * Generate demo performance metrics
   */
  private generateDemoPerformance(): DemoPerformance {
    return {
      systemUptime: 99.8,
      responseTime: Math.floor(Math.random() * 100) + 200, // 200-300ms
      activeUsers: Math.floor(Math.random() * 20) + 25, // 25-45 users
      totalTransactions: Math.floor(Math.random() * 1000) + 5000,
      errorRate: Math.random() * 0.5 // 0-0.5%
    };
  }

  /**
   * Generate demo financial data (Logan Freights specific)
   */
  private generateDemoFinancials(): DemoFinancials {
    return {
      totalRevenue: 2200000, // R2.2M as per Logan Freights data
      totalExpenses: 1876000, // Calculated from financial data
      netProfit: 324000, // R324K as per financial data
      growthRate: 8.64, // Actual growth rate
      budgetUtilization: 75.04 // Current budget utilization
    };
  }

  /**
   * Get demo data
   */
  getDemoData(): DemoData | null {
    return this.demoData;
  }

  /**
   * Get filtered demo data based on user role
   */
  getFilteredDemoData(userRole: string): Partial<DemoData> {
    if (!this.demoData) return {};

    switch (userRole) {
      case 'employee':
        return {
          expenses: this.demoData.expenses.filter(e => e.employeeId === 'demo_user_003'),
          notifications: this.demoData.notifications.filter(n => n.type !== 'system_alert')
        };
      
      case 'manager':
        return {
          users: this.demoData.users.filter(u => u.department === 'Operations'),
          expenses: this.demoData.expenses.filter(e => 
            this.demoData!.users.find(u => u.id === e.employeeId)?.department === 'Operations'
          ),
          notifications: this.demoData.notifications,
          performance: this.demoData.performance
        };
      
      case 'hr':
        return {
          users: this.demoData.users,
          expenses: this.demoData.expenses,
          notifications: this.demoData.notifications,
          performance: this.demoData.performance
        };
      
      case 'administrator':
        return this.demoData;
      
      default:
        return {};
    }
  }

  /**
   * Simulate real-time data updates
   */
  private startDataRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (this.demoData) {
        // Update performance metrics
        this.demoData.performance.responseTime = Math.floor(Math.random() * 100) + 200;
        this.demoData.performance.activeUsers = Math.floor(Math.random() * 20) + 25;
        this.demoData.performance.errorRate = Math.random() * 0.5;
        
        // Occasionally add new notifications
        if (Math.random() > 0.8) {
          this.addRandomNotification();
        }
      }
    }, this.demoSettings.demoDataRefreshInterval);
  }

  /**
   * Stop data refresh
   */
  private stopDataRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Add random notification for demo purposes
   */
  private addRandomNotification(): void {
    if (!this.demoData) return;

    const types: Array<DemoNotification['type']> = ['expense_submitted', 'expense_approved', 'system_alert'];
    const priorities: Array<DemoNotification['priority']> = ['low', 'medium', 'high'];
    
    const newNotification: DemoNotification = {
      id: `demo_notif_${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      title: 'Demo Update',
      message: 'This is a real-time demo notification',
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      timestamp: new Date().toISOString(),
      read: false
    };

    this.demoData.notifications.unshift(newNotification);
    
    // Keep only last 10 notifications
    if (this.demoData.notifications.length > 10) {
      this.demoData.notifications = this.demoData.notifications.slice(0, 10);
    }
  }

  /**
   * Reset demo data
   */
  resetDemoData(): void {
    console.log('🔄 Resetting demo data...');
    this.generateDemoData();
  }

  /**
   * Export demo data (for testing/debugging)
   */
  exportDemoData(): string {
    return JSON.stringify(this.demoData, null, 2);
  }

  /**
   * Get demo indicator badge props
   */
  getDemoIndicatorProps(): { variant: 'secondary' | 'destructive'; text: string } {
    return {
      variant: 'secondary',
      text: 'DEMO MODE'
    };
  }

  /**
   * Simulate expense approval/rejection
   */
  simulateExpenseAction(expenseId: string, action: 'approve' | 'reject'): boolean {
    if (!this.demoData || !this.demoSettings.allowDataModification) {
      return false;
    }

    const expense = this.demoData.expenses.find(e => e.id === expenseId);
    if (expense) {
      expense.status = action === 'approve' ? 'approved' : 'rejected';
      
      // Add notification
      const notification: DemoNotification = {
        id: `demo_notif_action_${Date.now()}`,
        type: action === 'approve' ? 'expense_approved' : 'expense_rejected',
        title: `Expense ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `${expense.description} - R${expense.amount}`,
        priority: 'medium',
        timestamp: new Date().toISOString(),
        read: false
      };

      this.demoData.notifications.unshift(notification);
      return true;
    }

    return false;
  }

  /**
   * Get demo system status
   */
  getDemoSystemStatus(): {
    status: 'operational' | 'demo';
    message: string;
    features: string[];
  } {
    return {
      status: 'demo',
      message: 'Running in demonstration mode with simulated Logan Freights data',
      features: [
        'Real-time data simulation',
        'Interactive expense management',
        'Role-based dashboard views',
        'Live performance metrics',
        'Logan Freights financial integration'
      ]
    };
  }

  /**
   * Cleanup demo manager
   */
  destroy(): void {
    this.stopDataRefresh();
    this.demoData = null;
    console.log('🧹 Enterprise Demo Manager destroyed');
  }
}

// Export singleton instance
export const enterpriseDemoManager = new EnterpriseDemoManagerService();

// Auto-initialize if in demo mode (simplified for build compatibility)
if (typeof window !== 'undefined') {
  // Initialize demo manager when running in browser
  // The actual demo mode check will be handled by the components that use it
  enterpriseDemoManager.initialize();
}

// Export utility functions
export const isDemoMode = () => enterpriseDemoManager.isDemoMode();
export const getDemoData = () => enterpriseDemoManager.getDemoData();
export const getFilteredDemoData = (userRole: string) => enterpriseDemoManager.getFilteredDemoData(userRole);
export const resetDemoData = () => enterpriseDemoManager.resetDemoData();
export const simulateExpenseAction = (expenseId: string, action: 'approve' | 'reject') => 
  enterpriseDemoManager.simulateExpenseAction(expenseId, action);
export const getDemoSystemStatus = () => enterpriseDemoManager.getDemoSystemStatus();
export const getDemoIndicatorProps = () => enterpriseDemoManager.getDemoIndicatorProps();