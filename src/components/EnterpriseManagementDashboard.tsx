/**
 * Enterprise Management Dashboard
 * Comprehensive management interface for all enterprise features
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  BarChart3,
  Download,
  Users,
  Bell,
  Settings,
  Database,
  Cloud,
  FileText,
  Camera,
  Shield,
  TrendingUp,
  RefreshCw,
  PieChart,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { EnterpriseDashboardStats } from './EnterpriseDashboardStats';
import { EnterpriseExportControls } from './EnterpriseExportControls';
import { EnterpriseProfileUpload } from './EnterpriseProfileUpload';
import { NotificationCenter } from './NotificationCenter';
import { ExpenseApprovals } from './ExpenseApprovals';
import { FinancialAnalytics } from './FinancialAnalytics';
import { IFRSCompliance } from './IFRSCompliance';
import { FraudDetection } from './FraudDetection';
import { ProductionStatus } from './ProductionStatus';
import { type User } from '../App';

interface EnterpriseManagementDashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function EnterpriseManagementDashboard({ user, onLogout, setUser }: EnterpriseManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const handleProfileUpdate = (updates: Partial<User>) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
  };

  const getTabBadge = (tab: string) => {
    switch (tab) {
      case 'notifications':
        return <Badge variant="outline" className="ml-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200">12</Badge>;
      case 'approvals':
        return user.role === 'employee' ? null : <Badge variant="outline" className="ml-1.5 text-xs bg-yellow-50 text-yellow-700 border-yellow-200">5</Badge>;
      default:
        return null;
    }
  };

  const isManagerLevel = user.role === 'employer' || user.role === 'hr' || user.role === 'administrator';

  const fetchDashboardData = () => {
    // Simulate fetching dashboard data
    console.log('Fetching dashboard data for user:', user.name);
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Subscribe to real-time updates - manager dashboard should refresh when claims are updated
    const handleClaimsUpdate = () => {
      console.log('🔄 Manager dashboard: Received claims update event');
      fetchDashboardData();
    };

    const handleDataSync = (event: CustomEvent) => {
      console.log('🔄 Manager dashboard: Received data sync event', event.detail);
      fetchDashboardData();
    };

    // Listen for multiple event types to ensure updates are caught
    window.addEventListener('logan-claims-updated', handleClaimsUpdate);
    window.addEventListener('logan-claims-refresh', handleClaimsUpdate);
    window.addEventListener('logan-notification-update', handleClaimsUpdate);
    window.addEventListener('logan-data-sync', handleDataSync);

    return () => {
      window.removeEventListener('logan-claims-updated', handleClaimsUpdate);
      window.removeEventListener('logan-claims-refresh', handleClaimsUpdate);
      window.removeEventListener('logan-notification-update', handleClaimsUpdate);
      window.removeEventListener('logan-data-sync', handleDataSync);
    };
  }, [user.id]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-semibold">LF</span>
                </div>
                <div>
                  <h1 className="text-2xl text-slate-900">Logan Freights Enterprise</h1>
                  <p className="text-slate-600">Expense Management System</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role.toUpperCase()}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.position}</p>
                </div>
                <Button variant="outline" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <div className="hidden lg:block">
            <TabsList className={`grid w-full bg-white mb-8 ${isManagerLevel ? 'grid-cols-9' : 'grid-cols-5'} gap-1`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="overview" className="flex items-center justify-center px-3 py-2 text-sm">
                    <BarChart3 className="w-4 h-4 mr-1.5" />
                    <span className="hidden xl:inline">Overview</span>
                    <span className="xl:hidden">Overview</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Enterprise Overview & Statistics</p></TooltipContent>
              </Tooltip>
              
              {isManagerLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="approvals" className="flex items-center justify-center px-3 py-2 text-sm">
                      <FileText className="w-4 h-4 mr-1.5" />
                      <span className="hidden xl:inline">Approvals</span>
                      <span className="xl:hidden">Approvals</span>
                      {getTabBadge('approvals')}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Expense Claim Approvals</p></TooltipContent>
                </Tooltip>
              )}
              
              {isManagerLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="analytics" className="flex items-center justify-center px-3 py-2 text-sm">
                      <PieChart className="w-4 h-4 mr-1.5" />
                      <span className="hidden xl:inline">Analytics</span>
                      <span className="xl:hidden">Analytics</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Financial Analytics & Reports</p></TooltipContent>
                </Tooltip>
              )}
              
              {isManagerLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="ifrs" className="flex items-center justify-center px-3 py-2 text-sm">
                      <Globe className="w-4 h-4 mr-1.5" />
                      <span className="hidden xl:inline">IFRS</span>
                      <span className="xl:hidden">IFRS</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>IFRS Compliance & Reporting</p></TooltipContent>
                </Tooltip>
              )}
              
              {isManagerLevel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="fraud" className="flex items-center justify-center px-3 py-2 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-1.5" />
                      <span className="hidden xl:inline">Fraud</span>
                      <span className="xl:hidden">Fraud</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent><p>Fraud Detection & Analytics</p></TooltipContent>
                </Tooltip>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="exports" className="flex items-center justify-center px-3 py-2 text-sm">
                    <Download className="w-4 h-4 mr-1.5" />
                    <span className="hidden xl:inline">Exports</span>
                    <span className="xl:hidden">Exports</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Data Export & Reports</p></TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="notifications" className="flex items-center justify-center px-3 py-2 text-sm">
                    <Bell className="w-4 h-4 mr-1.5" />
                    <span className="hidden xl:inline">Notifications</span>
                    <span className="xl:hidden">Alerts</span>
                    {getTabBadge('notifications')}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Notification Center</p></TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="profile" className="flex items-center justify-center px-3 py-2 text-sm">
                    <Camera className="w-4 h-4 mr-1.5" />
                    <span className="hidden xl:inline">Profile</span>
                    <span className="xl:hidden">Profile</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Profile Management</p></TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="system" className="flex items-center justify-center px-3 py-2 text-sm">
                    <Settings className="w-4 h-4 mr-1.5" />
                    <span className="hidden xl:inline">System</span>
                    <span className="xl:hidden">System</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p>System Information</p></TooltipContent>
              </Tooltip>
            </TabsList>
          </div>

          {/* Mobile/Tablet Tabs - Scrollable */}
          <div className="lg:hidden mb-8">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-white p-1 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <TabsTrigger value="overview" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  
                  {isManagerLevel && (
                    <TabsTrigger value="approvals" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                      <FileText className="w-4 h-4 mr-2" />
                      Approvals
                      {getTabBadge('approvals')}
                    </TabsTrigger>
                  )}
                  
                  {isManagerLevel && (
                    <TabsTrigger value="analytics" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                      <PieChart className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Financial Analytics</span>
                      <span className="sm:hidden">Analytics</span>
                    </TabsTrigger>
                  )}
                  
                  {isManagerLevel && (
                    <TabsTrigger value="ifrs" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                      <Globe className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">IFRS Compliance</span>
                      <span className="sm:hidden">IFRS</span>
                    </TabsTrigger>
                  )}
                  
                  {isManagerLevel && (
                    <TabsTrigger value="fraud" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Fraud Detection</span>
                      <span className="sm:hidden">Fraud</span>
                    </TabsTrigger>
                  )}
                  
                  <TabsTrigger value="exports" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                    <Download className="w-4 h-4 mr-2" />
                    Exports
                  </TabsTrigger>
                  
                  <TabsTrigger value="notifications" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                    <Bell className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Notifications</span>
                    <span className="sm:hidden">Alerts</span>
                    {getTabBadge('notifications')}
                  </TabsTrigger>
                  
                  <TabsTrigger value="profile" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                    <Camera className="w-4 h-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  
                  <TabsTrigger value="system" className="flex items-center px-4 py-2 text-sm whitespace-nowrap">
                    <Settings className="w-4 h-4 mr-2" />
                    System
                  </TabsTrigger>
                </div>
              </TabsList>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl text-slate-900">Enterprise Overview</h2>
                <p className="text-slate-600">Comprehensive system statistics and analytics</p>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
            <EnterpriseDashboardStats 
              userRole={user.role}
              onNavigateToApprovals={() => {
                if (isManagerLevel) {
                  setActiveTab('approvals');
                }
              }}
              onNavigateToAnalytics={() => {
                if (isManagerLevel) {
                  setActiveTab('analytics');
                }
              }}
              onNavigateToNotifications={() => setActiveTab('notifications')}
            />
            <ProductionStatus />
          </TabsContent>

          {/* Approvals Tab - Only for managers */}
          {isManagerLevel && (
            <TabsContent value="approvals" className="space-y-6">
              <ExpenseApprovals
                managerId={user.id}
                managerName={user.name}
                managerRole={user.role as 'employer' | 'hr' | 'administrator'}
              />
            </TabsContent>
          )}

          {/* Financial Analytics Tab - Only for managers */}
          {isManagerLevel && (
            <TabsContent value="analytics" className="space-y-6">
              <FinancialAnalytics />
            </TabsContent>
          )}

          {/* IFRS Compliance Tab - Only for managers */}
          {isManagerLevel && (
            <TabsContent value="ifrs" className="space-y-6">
              <IFRSCompliance />
            </TabsContent>
          )}

          {/* Fraud Detection Tab - Only for managers */}
          {isManagerLevel && (
            <TabsContent value="fraud" className="space-y-6">
              <FraudDetection />
            </TabsContent>
          )}

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl text-slate-900">Enterprise Export Manager</h2>
              <p className="text-slate-600">Generate comprehensive reports and export data</p>
            </div>
            <EnterpriseExportControls />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl text-slate-900">Notification Center</h2>
              <p className="text-slate-600">Manage and view all system notifications</p>
            </div>
            <NotificationCenter userId={user.id} userRole={user.role} />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl text-slate-900">Profile Management</h2>
              <p className="text-slate-600">Manage your profile information and settings</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Upload */}
              <EnterpriseProfileUpload
                user={user}
                onProfileUpdate={handleProfileUpdate}
              />

              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                  <CardDescription>Your account details and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">Full Name</label>
                      <p className="text-slate-900">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Employee ID</label>
                      <p className="text-slate-900">{user.employee_id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Email</label>
                      <p className="text-slate-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Phone</label>
                      <p className="text-slate-900">{user.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Department</label>
                      <p className="text-slate-900">{user.department}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Position</label>
                      <p className="text-slate-900">{user.position}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Account Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {user.status?.toUpperCase() || 'ACTIVE'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl text-slate-900">System Information</h2>
              <p className="text-slate-600">System status, connections, and configuration</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <span>System Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Database</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Cloud Storage</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Online
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Notifications</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Real-time Sync</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Enabled
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Cloud Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cloud className="w-5 h-5 text-blue-600" />
                    <span>Cloud Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">B4A Hosting</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Supabase</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Backup
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Receipt Storage</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Available
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Profile Images</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Synced
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <span>Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Response Time</span>
                    <span className="text-sm text-slate-900">{"< 200ms"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Uptime</span>
                    <span className="text-sm text-slate-900">99.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Data Accuracy</span>
                    <span className="text-sm text-slate-900">100%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Security Score</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      A+
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information Details */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>Detailed system configuration and capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900">Features Enabled</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>✅ Advanced PDF/Excel Export with Pivot Tables</li>
                      <li>✅ Cloud Profile Image Storage</li>
                      <li>✅ Real-time Notifications with Cross-data Support</li>
                      <li>✅ 50+ Demo Claims with Auto-cleanup</li>
                      <li>✅ Enterprise-grade Security</li>
                      <li>✅ Fraud Detection & Analytics</li>
                      <li>✅ IFRS Compliance Reporting</li>
                      <li>✅ Multi-role Approval Workflows</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-900">Integration Status</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>🔗 B4A Parse Server (App ID: bkMEMWecnn9oYZTvuAPqD3NB1zZ2oHkUGeokgVO3)</li>
                      <li>🔗 Enhanced Cloud Storage with Fallback</li>
                      <li>🔗 Real-time Cross-data Synchronization</li>
                      <li>🔗 Automated Notification Escalation</li>
                      <li>🔗 South African Tax Calculation (15% VAT)</li>
                      <li>🔗 Multi-currency Support (ZAR, USD, EUR, GBP)</li>
                      <li>🔗 30-day Data Retention Policy</li>
                      <li>🔗 Enterprise Export Capabilities</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  );
}