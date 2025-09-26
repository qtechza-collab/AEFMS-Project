import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Eye,
  Building,
  User,
  Calendar,
  Star,
  Flame
} from 'lucide-react';
import { dataStore } from '../utils/dataStore';

interface RecentActivityProps {
  userId: string;
  userRole: 'employee' | 'employer' | 'hr' | 'administrator';
  showFilters?: boolean;
  limit?: number;
}

interface ActivityItem {
  id: string;
  type: 'claim_submitted' | 'claim_approved' | 'claim_rejected' | 'high_cost_claim' | 'user_action' | 'system';
  employee_id: string;
  employee_name: string;
  department: string;
  action: string;
  amount?: number;
  claim_id?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export function RecentActivity({ userId, userRole, showFilters = true, limit = 10 }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to real-time updates
    const unsubscribe = dataStore.subscribe('activities:updated', () => {
      fetchActivities();
    });

    return unsubscribe;
  }, [userId, userRole]);

  useEffect(() => {
    filterActivities();
  }, [activities, filter]);

  const fetchActivities = () => {
    try {
      setIsLoading(true);
      
      let activityData = dataStore.getRecentActivities(50); // Get more for filtering
      
      // Filter based on user role
      if (userRole === 'employer') {
        // Managers see activities from their team
        const managedEmployees = dataStore.getEmployees().filter(emp => emp.manager_id === userId);
        const managedIds = managedEmployees.map(emp => emp.id);
        activityData = activityData.filter(activity => 
          managedIds.includes(activity.employee_id) || activity.employee_id === userId
        );
      } else if (userRole === 'employee') {
        // Employees see only their own activities
        activityData = activityData.filter(activity => activity.employee_id === userId);
      }
      // HR and Admin see all activities (no filtering needed)

      setActivities(activityData);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];
    
    if (filter !== 'all') {
      if (filter === 'high_cost') {
        filtered = filtered.filter(activity => 
          activity.type === 'high_cost_claim' || 
          (activity.amount && activity.amount > 1000)
        );
      } else if (filter === 'new_claims') {
        filtered = filtered.filter(activity => activity.type === 'claim_submitted');
      } else {
        filtered = filtered.filter(activity => activity.priority === filter);
      }
    }
    
    setFilteredActivities(filtered.slice(0, limit));
  };

  const getActivityIcon = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'claim_submitted':
        return activity.amount && activity.amount > 1000 ? 
          <Flame className="w-4 h-4 text-orange-600" /> :
          <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'claim_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'claim_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'high_cost_claim':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'user_action':
        return <User className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityColor = (activity: ActivityItem) => {
    switch (activity.priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs text-yellow-700 bg-yellow-50">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50">Low</Badge>;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return time.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString()}`;
  };

  const highlightNewClaims = filteredActivities.filter(a => 
    a.type === 'claim_submitted' && 
    new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  );

  const highlightHighCostClaims = filteredActivities.filter(a => 
    a.type === 'high_cost_claim' || (a.amount && a.amount > 1000)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest activities and claim updates</CardDescription>
          </div>
          {showFilters && (
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Activities</option>
                <option value="new_claims">New Claims</option>
                <option value="high_cost">High Cost</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Highlight sections */}
        {highlightNewClaims.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-900">New Claims Today</h4>
              <Badge variant="outline" className="text-xs text-blue-700">
                {highlightNewClaims.length} new
              </Badge>
            </div>
            <div className="space-y-1">
              {highlightNewClaims.slice(0, 3).map(activity => (
                <div key={activity.id} className="text-sm text-blue-800">
                  <span className="font-medium">{activity.employee_name}</span> - {activity.action}
                  {activity.amount && <span className="ml-2 font-medium">{formatCurrency(activity.amount)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {highlightHighCostClaims.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-red-600" />
              <h4 className="text-sm font-medium text-red-900">High Cost Claims</h4>
              <Badge variant="destructive" className="text-xs">
                {highlightHighCostClaims.length} high value
              </Badge>
            </div>
            <div className="space-y-1">
              {highlightHighCostClaims.slice(0, 3).map(activity => (
                <div key={activity.id} className="text-sm text-red-800">
                  <span className="font-medium">{activity.employee_name}</span> - {activity.action}
                  {activity.amount && <span className="ml-2 font-medium">{formatCurrency(activity.amount)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-sm text-slate-500 mt-2">Loading activities...</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No recent activities</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div 
                key={activity.id} 
                className={`border-l-4 p-3 rounded-r-lg transition-all hover:shadow-md ${getActivityColor(activity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {getActivityIcon(activity)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium">{activity.employee_name}</span>
                        </p>
                        {getPriorityBadge(activity.priority)}
                        {activity.type === 'high_cost_claim' && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            High Value
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-1">{activity.action}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <div className="flex items-center space-x-1">
                          <Building className="w-3 h-3" />
                          <span>{activity.department}</span>
                        </div>
                        {activity.amount && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-medium text-slate-700">
                              {formatCurrency(activity.amount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {activity.claim_id && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredActivities.length >= limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
              View All Activities
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}