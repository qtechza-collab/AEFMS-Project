import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle,
  X,
  Clock,
  TrendingUp,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Flag,
  Coins
} from 'lucide-react';
import { ClaimsViewer, Claim } from './ClaimsViewer';
import { toast } from 'sonner';

interface FraudAlert {
  id: string;
  employee: string;
  employeeId: string;
  category: string;
  amount: number;
  date: string;
  flags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigated' | 'resolved' | 'false_positive';
  description: string;
  riskScore: number;
  claimId?: string;
  receiptUrl?: string;
}

export function FraudDetection() {
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showClaimViewer, setShowClaimViewer] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  const mockAlerts: FraudAlert[] = [
    {
      id: '1',
      employee: 'Mike Wilson',
      employeeId: 'EMP001',
      category: 'Repairs',
      amount: 1200,
      date: '2025-01-10',
      flags: ['Duplicate detection', 'High amount', 'Weekend submission'],
      severity: 'critical',
      status: 'pending',
      description: 'Vehicle maintenance claim submitted twice within 24 hours',
      riskScore: 95,
      claimId: 'CLM001',
      receiptUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400'
    },
    {
      id: '2',
      employee: 'John Driver',
      employeeId: 'EMP002',
      category: 'Fuel',
      amount: 850,
      date: '2025-01-09',
      flags: ['High amount', 'Geographic anomaly'],
      severity: 'high',
      status: 'pending',
      description: 'Fuel expense significantly above average for route',
      riskScore: 78,
      claimId: 'CLM002',
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400'
    },
    {
      id: '3',
      employee: 'Sarah Lee',
      employeeId: 'EMP003',
      category: 'Meals',
      amount: 200,
      date: '2025-01-08',
      flags: ['Missing VAT number', 'Low image quality'],
      severity: 'medium',
      status: 'investigated',
      description: 'Receipt image quality poor, VAT details unclear',
      riskScore: 65,
      claimId: 'CLM003',
      receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'
    },
    {
      id: '4',
      employee: 'Peter Williams',
      employeeId: 'EMP004',
      category: 'Accommodation',
      amount: 300,
      date: '2025-01-07',
      flags: ['Time anomaly', 'Inconsistent tax rate'],
      severity: 'low',
      status: 'false_positive',
      description: 'Late night hotel booking flagged incorrectly',
      riskScore: 35,
      claimId: 'CLM004',
      receiptUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
    }
  ];

  const weeklyStats = [
    { week: 'Week 1', alerts: 5, resolved: 3, falsePositives: 1 },
    { week: 'Week 2', alerts: 8, resolved: 6, falsePositives: 1 },
    { week: 'Week 3', alerts: 3, resolved: 2, falsePositives: 0 },
    { week: 'Week 4', alerts: 7, resolved: 4, falsePositives: 2 }
  ];

  const fraudCategories = [
    { category: 'Duplicate Receipts', count: 12, percentage: 35, trend: '+15%' },
    { category: 'High Amount Anomalies', count: 8, percentage: 23, trend: '-5%' },
    { category: 'Tax Inconsistencies', count: 6, percentage: 18, trend: '+8%' },
    { category: 'Geographic Anomalies', count: 4, percentage: 12, trend: '+2%' },
    { category: 'Time-based Anomalies', count: 4, percentage: 12, trend: '-3%' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigated': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'false_positive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAlerts = mockAlerts.filter(alert => {
    if (activeFilter === 'all') return true;
    return alert.status === activeFilter;
  });

  const convertAlertToClaim = (alert: FraudAlert): Claim => ({
    id: alert.claimId || alert.id,
    employee_id: alert.employeeId,
    employee_name: alert.employee,
    amount: alert.amount,
    currency: 'ZAR',
    category: alert.category,
    description: alert.description,
    date: alert.date,
    receipt_url: alert.receiptUrl,
    receipt_filename: `receipt-${alert.claimId || alert.id}.jpg`,
    status: 'pending',
    submitted_at: alert.date,
    tax_amount: alert.amount * 0.15, // 15% South African VAT
    fraud_score: alert.riskScore,
    fraud_flags: alert.flags,
    is_flagged: true
  });

  const handleAlertAction = (alertId: string, action: string) => {
    toast.success(`Alert ${action} successfully`);
    console.log(`${action} alert:`, alertId);
    // Update alert status logic here
  };

  const handleViewClaim = (alert: FraudAlert) => {
    if (alert.claimId) {
      setSelectedClaim(convertAlertToClaim(alert));
      setShowClaimViewer(true);
    } else {
      toast.error('No claim associated with this alert');
    }
  };

  const handleCloseClaimViewer = () => {
    setShowClaimViewer(false);
    setSelectedClaim(null);
  };

  const handleApproveClaim = async (claimId: string) => {
    toast.success('Claim approved - fraud alert cleared');
    handleCloseClaimViewer();
  };

  const handleRejectClaim = async (claimId: string, reason: string) => {
    toast.success('Claim rejected - fraud confirmed');
    handleCloseClaimViewer();
  };

  const criticalAlerts = mockAlerts.filter(a => a.severity === 'critical' && a.status === 'pending').length;
  const highAlerts = mockAlerts.filter(a => a.severity === 'high' && a.status === 'pending').length;
  const totalPending = mockAlerts.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">Fraud Detection</h2>
          <p className="text-slate-600">AI-powered fraud detection and prevention system</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-red-700 bg-red-50">
            {criticalAlerts} Critical
          </Badge>
          <Badge variant="outline" className="text-orange-700 bg-orange-50">
            {highAlerts} High Risk
          </Badge>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Alerts</p>
                <p className="text-2xl text-slate-900">{totalPending}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">This Week</p>
                <p className="text-2xl text-slate-900">{weeklyStats[weeklyStats.length - 1].alerts}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Detection Rate</p>
                <p className="text-2xl text-slate-900">94.2%</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveFilter('false_positive')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">False Positives</p>
                <p className="text-2xl text-slate-900">5.8%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="all">All Alerts ({mockAlerts.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({totalPending})</TabsTrigger>
          <TabsTrigger value="investigated">Investigated</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-6">
          {/* Alert List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Fraud Alerts</CardTitle>
              <CardDescription>
                {activeFilter === 'all' ? 'All fraud detection alerts' : 
                 activeFilter === 'pending' ? 'Alerts requiring investigation' :
                 activeFilter === 'investigated' ? 'Alerts under review' :
                 'Resolved fraud alerts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-slate-900">{alert.employee}</h3>
                            <Badge variant="outline">{alert.category}</Badge>
                            <Badge 
                              variant="outline" 
                              className={getSeverityColor(alert.severity)}
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge 
                              variant="secondary" 
                              className={getStatusColor(alert.status)}
                            >
                              {alert.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-slate-600 mb-2">{alert.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-500 mb-3">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {alert.date}
                            </div>
                            <div className="flex items-center">
                              <Coins className="w-4 h-4 mr-1" />
                              R{alert.amount.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Shield className="w-4 h-4 mr-1" />
                              Risk Score: {alert.riskScore}%
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {alert.flags.map((flag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Flag className="w-3 h-3 mr-1" />
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-4">
                          <div className="text-sm text-slate-500 mb-1">Risk Score</div>
                          <div className="flex items-center space-x-2">
                            <Progress value={alert.riskScore} className="w-20 h-2" />
                            <span className="text-sm text-slate-900">{alert.riskScore}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                            {alert.claimId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewClaim(alert)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Claim
                              </Button>
                            )}
                          </div>
                          {alert.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleAlertAction(alert.id, 'investigate')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Investigate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleAlertAction(alert.id, 'dismiss')}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fraud Categories Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Fraud Categories</CardTitle>
                <CardDescription>Breakdown of fraud types detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fraudCategories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">{category.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-900">{category.count}</span>
                          <Badge 
                            variant="outline" 
                            className={category.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'}
                          >
                            {category.trend}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{category.percentage}% of total</span>
                        <span>{category.count} cases</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Tax-Related Red Flags</CardTitle>
                <CardDescription>SARS compliance and tax validation alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-red-800">Missing VAT Numbers</h4>
                      <Badge className="bg-red-100 text-red-800">6 cases</Badge>
                    </div>
                    <p className="text-sm text-red-700">Receipts without valid VAT registration numbers</p>
                  </div>
                  
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-orange-800">Inconsistent Tax Rates</h4>
                      <Badge className="bg-orange-100 text-orange-800">4 cases</Badge>
                    </div>
                    <p className="text-sm text-orange-700">VAT rates not matching standard 15% rate</p>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-yellow-800">Duplicate Tax Entries</h4>
                      <Badge className="bg-yellow-100 text-yellow-800">3 cases</Badge>
                    </div>
                    <p className="text-sm text-yellow-700">Same tax invoice submitted multiple times</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-blue-800">Zero-Rated Items</h4>
                      <Badge className="bg-blue-100 text-blue-800">2 cases</Badge>
                    </div>
                    <p className="text-sm text-blue-700">Items incorrectly classified as zero-rated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Fraud Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Weekly Fraud Activity</CardTitle>
              <CardDescription>Fraud detection trends over the past month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {weeklyStats.map((week, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-700 mb-3">{week.week}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">New Alerts:</span>
                        <span className="text-slate-900">{week.alerts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Resolved:</span>
                        <span className="text-green-600">{week.resolved}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">False Positives:</span>
                        <span className="text-orange-600">{week.falsePositives}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Fraud Alert Details</DialogTitle>
              <DialogDescription>
                Alert ID: {selectedAlert.id} | Employee: {selectedAlert.employee}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Risk Score</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={selectedAlert.riskScore} className="flex-1 h-3" />
                    <span className="text-slate-900">{selectedAlert.riskScore}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-slate-900">R{selectedAlert.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="text-slate-900">{selectedAlert.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="text-slate-900">{selectedAlert.date}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-slate-500 mb-2">Description</p>
                <p className="text-slate-900">{selectedAlert.description}</p>
              </div>
              
              <div>
                <p className="text-sm text-slate-500 mb-2">Fraud Flags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAlert.flags.map((flag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Flag className="w-3 h-3 mr-1" />
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                {selectedAlert.claimId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAlert(null);
                      handleViewClaim(selectedAlert);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Full Claim
                  </Button>
                )}
                <Button onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Enhanced Claims Viewer for Fraud Investigation */}
      <ClaimsViewer
        isOpen={showClaimViewer}
        onClose={handleCloseClaimViewer}
        claim={selectedClaim}
        onApprove={handleApproveClaim}
        onReject={handleRejectClaim}
        canManage={true}
        showFraudDetails={true}
      />
    </div>
  );
}