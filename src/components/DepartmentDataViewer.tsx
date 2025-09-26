import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { 
  Building2, Users, TrendingUp, Shield, Settings, 
  Database, ChevronRight, CheckCircle, AlertTriangle,
  BarChart3, FileText, UserCheck, Lock
} from 'lucide-react';
import { api } from '../utils/api';
import { User } from '../App';

interface DepartmentDataViewerProps {
  user: User;
}

interface DepartmentData {
  hr?: any;
  admin?: any;
  manager?: any;
  employee?: any;
  relationships?: any;
}

export function DepartmentDataViewer({ user }: DepartmentDataViewerProps) {
  const [departmentData, setDepartmentData] = useState<DepartmentData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDepartmentData();
  }, [user.role]);

  const loadDepartmentData = async () => {
    try {
      setLoading(true);
      
      // Load role-specific data
      const promises = [];
      
      if (user.role === 'hr' || user.role === 'administrator') {
        promises.push(api.getHRMasterData().then(data => ({ type: 'hr', data })));
      }
      
      if (user.role === 'administrator') {
        promises.push(api.getAdminMasterData().then(data => ({ type: 'admin', data })));
      }
      
      if (user.role === 'employer' || user.role === 'hr' || user.role === 'administrator') {
        promises.push(api.getManagerMasterData().then(data => ({ type: 'manager', data })));
      }
      
      promises.push(api.getEmployeeMasterData().then(data => ({ type: 'employee', data })));
      promises.push(api.getDepartmentRelationships().then(data => ({ type: 'relationships', data })));

      const results = await Promise.all(promises);
      
      const newData: DepartmentData = {};
      results.forEach(result => {
        if (result.data.success) {
          newData[result.type as keyof DepartmentData] = result.data.data;
        }
      });
      
      setDepartmentData(newData);
    } catch (error) {
      console.error('Error loading department data:', error);
      toast.error('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async (type: string, itemId: string, action: 'approve' | 'reject' | 'escalate', reason?: string) => {
    try {
      const result = await api.processApprovalWorkflow({
        type,
        item_id: itemId,
        approver_role: user.role,
        approver_id: user.id,
        action,
        reason
      });

      if (result.success) {
        toast.success(`${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Escalated'} successfully`);
        loadDepartmentData(); // Refresh data
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval');
    }
  };

  const checkDataAccess = async (dataType: string, targetUserId?: string) => {
    try {
      const result = await api.checkDataAccess(user.role, dataType, targetUserId);
      return result.data?.hasAccess || false;
    } catch (error) {
      console.error('Error checking data access:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const renderDepartmentOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* HR Department */}
      {departmentData.hr && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HR Department</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.hr.department_info?.staff_count || 0}</div>
            <p className="text-xs text-muted-foreground">Staff Members</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Employee Satisfaction</span>
                <span>{departmentData.hr.kpis?.employee_satisfaction || 0}%</span>
              </div>
              <Progress value={departmentData.hr.kpis?.employee_satisfaction || 0} className="h-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Department */}
      {departmentData.admin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administration</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.admin.department_info?.staff_count || 0}</div>
            <p className="text-xs text-muted-foreground">System Admins</p>
            <div className="mt-4 space-y-2">
              <Badge variant="outline">
                {departmentData.admin.security_settings?.two_factor_required ? 'MFA Enabled' : 'MFA Disabled'}
              </Badge>
              <Badge variant="outline">
                Session: {departmentData.admin.system_config?.session_timeout || 30}min
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager Department */}
      {departmentData.manager && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Management</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.manager.team_metrics?.team_size || 0}</div>
            <p className="text-xs text-muted-foreground">Team Members</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Utilization</span>
                <span>{departmentData.manager.team_metrics?.budget_utilization || 0}%</span>
              </div>
              <Progress value={departmentData.manager.team_metrics?.budget_utilization || 0} className="h-1" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAccessPermissions = () => {
    const userPermissions = departmentData.relationships?.data_access_matrix?.[user.role] || [];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Data Access Permissions
          </CardTitle>
          <CardDescription>
            Your role-based access permissions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPermissions.map((permission: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="capitalize">{permission.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
          {userPermissions.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Limited Access</AlertTitle>
              <AlertDescription>
                Your role has limited data access permissions. Contact your administrator for more access.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderApprovalHierarchy = () => {
    const approvalHierarchy = departmentData.relationships?.approval_hierarchy || {};
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Approval Hierarchy
          </CardTitle>
          <CardDescription>
            Who can approve what in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(approvalHierarchy).map(([type, roles]) => (
              <div key={type} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 capitalize">{type.replace(/_/g, ' ')}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {(roles as string[]).map((role, index) => (
                    <React.Fragment key={role}>
                      <Badge 
                        variant={role === user.role ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {role}
                      </Badge>
                      {index < (roles as string[]).length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDepartmentKPIs = () => {
    const hrKpis = departmentData.hr?.kpis || {};
    const managerMetrics = departmentData.manager?.team_metrics || {};
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HR KPIs */}
        {Object.keys(hrKpis).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">HR KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(hrKpis).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <span>{value}%</span>
                    </div>
                    <Progress value={value as number} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manager Metrics */}
        {Object.keys(managerMetrics).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Management Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(managerMetrics).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium">
                      {typeof value === 'number' && key.includes('rate') ? `${value}%` : value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Department Data</h2>
          <p className="text-muted-foreground">
            View department-specific data and relationships
          </p>
        </div>
        <Button onClick={loadDepartmentData} variant="outline" size="sm">
          <Database className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderDepartmentOverview()}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {renderAccessPermissions()}
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          {renderApprovalHierarchy()}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          {renderDepartmentKPIs()}
        </TabsContent>
      </Tabs>

      {/* Role-specific insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {user.role === 'administrator' ? 'System Insights' : 
             user.role === 'hr' ? 'HR Insights' : 
             user.role === 'employer' ? 'Management Insights' : 'Employee Insights'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {departmentData.relationships?.reporting_structure?.[user.role]?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Reports To</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {departmentData.relationships?.approval_hierarchy ? 
                  Object.values(departmentData.relationships.approval_hierarchy)
                    .filter(roles => (roles as string[]).includes(user.role)).length : 0}
              </div>
              <p className="text-sm text-muted-foreground">Can Approve</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {departmentData.relationships?.data_access_matrix?.[user.role]?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Access Types</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}