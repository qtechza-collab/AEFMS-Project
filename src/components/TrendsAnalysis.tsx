import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  RefreshCw,
  Download,
  FileText
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { api } from '../utils/api';

export function TrendsAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock trending data - would come from API
  const weeklyTrends = [
    { week: 'W1', claims: 45, amount: 23500, employees: 12 },
    { week: 'W2', claims: 52, amount: 27800, employees: 15 },
    { week: 'W3', claims: 38, amount: 19200, employees: 10 },
    { week: 'W4', claims: 61, amount: 31400, employees: 18 },
    { week: 'W5', claims: 47, amount: 24600, employees: 14 },
    { week: 'W6', claims: 55, amount: 29100, employees: 16 }
  ];

  const categoryTrends = [
    { month: 'Jan', fuel: 15200, meals: 8400, accommodation: 12600, repairs: 6800, tolls: 3200 },
    { month: 'Feb', fuel: 16800, meals: 7900, accommodation: 11200, repairs: 8400, tolls: 2900 },
    { month: 'Mar', fuel: 14600, meals: 9200, accommodation: 13800, repairs: 5600, tolls: 3400 },
    { month: 'Apr', fuel: 17200, meals: 8800, accommodation: 12400, repairs: 9200, tolls: 3100 },
    { month: 'May', fuel: 15900, meals: 9600, accommodation: 14200, repairs: 7200, tolls: 3600 },
    { month: 'Jun', fuel: 18400, meals: 9100, accommodation: 11800, repairs: 8800, tolls: 3200 }
  ];

  const latestClaims = [
    {
      id: 'CLM-2025-001',
      employee: 'John Driver',
      category: 'Fuel',
      amount: 850,
      date: '2025-01-15T10:30:00Z',
      status: 'pending',
      trend: 'up',
      change: '+15%'
    },
    {
      id: 'CLM-2025-002',
      employee: 'Sarah Johnson',
      category: 'Meals',
      amount: 320,
      date: '2025-01-15T09:15:00Z',
      status: 'approved',
      trend: 'down',
      change: '-8%'
    },
    {
      id: 'CLM-2025-003',
      employee: 'Mike Wilson',
      category: 'Repairs',
      amount: 1250,
      date: '2025-01-15T08:45:00Z',
      status: 'pending',
      trend: 'up',
      change: '+32%'
    },
    {
      id: 'CLM-2025-004',
      employee: 'Lisa Chen',
      category: 'Accommodation',
      amount: 680,
      date: '2025-01-15T08:20:00Z',
      status: 'approved',
      trend: 'up',
      change: '+5%'
    },
    {
      id: 'CLM-2025-005',
      employee: 'David Lee',
      category: 'Toll Gates',
      amount: 150,
      date: '2025-01-15T07:55:00Z',
      status: 'approved',
      trend: 'stable',
      change: '0%'
    }
  ];

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl text-slate-900">Trends & Real-time Analytics</h3>
          <p className="text-sm text-slate-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Trends
          </Button>
        </div>
      </div>

      {/* Real-time Claims Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Latest Claims Activity
          </CardTitle>
          <CardDescription>Real-time expense claim submissions with trend analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {latestClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-slate-900">{claim.employee}</h4>
                      <Badge variant="outline" className="text-xs">{claim.category}</Badge>
                      <Badge variant="secondary" className={getStatusColor(claim.status)}>
                        {claim.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <span>R{claim.amount.toLocaleString()}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(claim.date)}</span>
                      <span>•</span>
                      <span>ID: {claim.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(claim.trend)}
                    <span className={`text-sm ${
                      claim.trend === 'up' ? 'text-green-600' : 
                      claim.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {claim.change}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Weekly Claims Trend</CardTitle>
            <CardDescription>Claims volume and amounts over the last 6 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'amount' ? `R${Number(value).toLocaleString()}` : value,
                    name === 'amount' ? 'Amount' : name === 'claims' ? 'Claims' : 'Employees'
                  ]} 
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stackId="1"
                  stroke="#2563eb" 
                  fill="#2563eb" 
                  fillOpacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="claims" 
                  stackId="2"
                  stroke="#059669" 
                  fill="#059669" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">Category Performance</CardTitle>
            <CardDescription>Monthly trends by expense category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={categoryTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R${Number(value).toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="fuel" stroke="#dc2626" strokeWidth={2} />
                <Line type="monotone" dataKey="accommodation" stroke="#7c3aed" strokeWidth={2} />
                <Line type="monotone" dataKey="meals" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="repairs" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="tolls" stroke="#ea580c" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { name: 'Fuel', color: '#dc2626' },
                { name: 'Accommodation', color: '#7c3aed' },
                { name: 'Meals', color: '#059669' },
                { name: 'Repairs', color: '#2563eb' },
                { name: 'Tolls', color: '#ea580c' }
              ].map((item) => (
                <div key={item.name} className="flex items-center space-x-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl text-slate-900">Fuel Expenses</div>
              <div className="text-sm text-green-600">+18% this month</div>
              <Progress value={75} className="h-2" />
              <div className="text-xs text-slate-500">R89,400 total</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl text-slate-900">Repairs Category</div>
              <div className="text-sm text-red-600">+45% variance</div>
              <Progress value={45} className="h-2" />
              <div className="text-xs text-slate-500">Above budget threshold</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Most Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl text-slate-900">18 Employees</div>
              <div className="text-sm text-blue-600">Submitted claims this week</div>
              <Progress value={60} className="h-2" />
              <div className="text-xs text-slate-500">38% of total workforce</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">This Week's Summary</CardTitle>
          <CardDescription>Key metrics and changes from last week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl text-blue-600 mb-1">156</div>
              <div className="text-sm text-slate-600">Total Claims</div>
              <div className="text-xs text-green-600 mt-1">+12% from last week</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl text-green-600 mb-1">R89,400</div>
              <div className="text-sm text-slate-600">Total Amount</div>
              <div className="text-xs text-green-600 mt-1">+8% from last week</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-2xl text-yellow-600 mb-1">2.1</div>
              <div className="text-sm text-slate-600">Avg Processing Days</div>
              <div className="text-xs text-red-600 mt-1">+0.3 from last week</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-2xl text-purple-600 mb-1">18</div>
              <div className="text-sm text-slate-600">Active Submitters</div>
              <div className="text-xs text-green-600 mt-1">+2 from last week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}