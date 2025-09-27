import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
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
  Flame,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '../utils/dataStore';

interface ClickableRecentActivityProps {
  userId: string;
  userRole: 'employee' | 'employer' | 'hr' | 'administrator';
  showFilters?: boolean;
  limit?: number;
  allowApproval?: boolean;
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

export function ClickableRecentActivity({ 
  userId, 
  userRole, 
  showFilters = true, 
  limit = 10,
  allowApproval = true 
}: ClickableRecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showQuickApprovalDialog, setShowQuickApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'review'>('approve');
  const [managerComments, setManagerComments] = useState('');

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
      } else if (filter === 'pending_approvals') {
        // Show only submitted claims that need approval
        filtered = filtered.filter(activity => 
          activity.type === 'claim_submitted' && 
          activity.claim_id && 
          userRole === 'employer'
        );
      } else {
        filtered = filtered.filter(activity => activity.priority === filter);
      }
    }
    
    setFilteredActivities(filtered.slice(0, limit));
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (!allowApproval || userRole !== 'employer' || !activity.claim_id) {
      return;
    }

    // Check if this is a pending claim that can be approved
    const claim = dataStore.getClaim(activity.claim_id);
    if (claim && claim.status === 'pending' && activity.type === 'claim_submitted') {
      setSelectedActivity(activity);
      setApprovalAction('approve');
      setManagerComments('');
      setShowQuickApprovalDialog(true);
    }
  };

  const handleQuickApproval = async (action: 'approve' | 'reject' | 'review') => {
    if (!selectedActivity?.claim_id) return;

    try {
      const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : action === 'reject' ? 'Rejecting' : 'Sending for review'} claim...`);
      
      const updates = {
        status: action === 'approve' ? 'approved' as const : 
                action === 'reject' ? 'rejected' as const : 
                'under_review' as const,
        manager_id: userId,
        manager_name: 'Sarah Manager',
        manager_comments: managerComments || `Quick ${action} from recent activity`
      };

      const updatedClaim = dataStore.updateClaim(selectedActivity.claim_id, updates);
      
      toast.dismiss(loadingToast);
      
      if (updatedClaim) {
        const actionText = action === 'approve' ? 'approved' : 
                          action === 'reject' ? 'rejected' : 
                          'sent for review';
        toast.success(
          `Claim ${actionText} successfully`,
          {
            description: `${selectedActivity.employee_name} - R ${selectedActivity.amount?.toLocaleString()}`,
            duration: 4000
          }
        );
        
        setShowQuickApprovalDialog(false);
        setSelectedActivity(null);
        setManagerComments('');
        
        // Refresh activities
        setTimeout(() => {
          fetchActivities();
        }, 100);
      } else {
        toast.error('Failed to update claim - please try again');
      }
    } catch (error) {
      console.error('Error processing quick approval:', error);
      toast.error('Failed to process claim approval');
    }
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

  const canApproveActivity = (activity: ActivityItem) => {
    return allowApproval && 
           userRole === 'employer' && 
           activity.type === 'claim_submitted' && 
           activity.claim_id &&
           dataStore.getClaim(activity.claim_id)?.status === 'pending';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
                {userRole === 'employer' && allowApproval && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Click to Approve
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Latest activities and claim updates
                {userRole === 'employer' && allowApproval && ' - Click on pending claims to quickly approve'}
              </CardDescription>
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
                  <option value="pending_approvals">Pending Approvals</option>
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
              filteredActivities.map((activity) => {
                const isClickable = canApproveActivity(activity);
                
                return (
                  <div 
                    key={activity.id} 
                    className={`border-l-4 p-3 rounded-r-lg transition-all ${getActivityColor(activity)} ${
                      isClickable ? 'cursor-pointer hover:shadow-md hover:bg-green-100' : ''
                    }`}
                    onClick={() => handleActivityClick(activity)}
                    title={isClickable ? 'Click to quickly approve this claim' : ''}
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
                            {isClickable && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 animate-pulse">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve?
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
                );
              })
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

      {/* Quick Approval Dialog */}
      <Dialog open={showQuickApprovalDialog} onOpenChange={setShowQuickApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Quick Approval from Recent Activity
            </DialogTitle>
            <DialogDescription>
              {selectedActivity && (
                <div className="space-y-2">
                  <p>
                    Approve expense claim from{' '}
                    <strong>{selectedActivity.employee_name}</strong>
                    {selectedActivity.amount && (
                      <span> for <strong>{formatCurrency(selectedActivity.amount)}</strong></span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span><strong>Department:</strong> {selectedActivity.department}</span>
                    <span><strong>Action:</strong> {selectedActivity.action}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quick-comments" className="text-sm text-slate-700">
                  Manager Comments (Optional)
                </Label>
                <Textarea
                  id="quick-comments"
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  placeholder="Add any comments about this approval..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          </DialogBody>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQuickApprovalDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleQuickApproval('review')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send for Review
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleQuickApproval('reject')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleQuickApproval('approve')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
