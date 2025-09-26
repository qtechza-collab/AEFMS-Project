import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  FileText, 
  Download, 
  Globe, 
  Users, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Eye,
  Activity
} from 'lucide-react';

export function IFRSCompliance() {
  const [liveRates] = useState({
    USD: 18.45,
    EUR: 19.82,
    GBP: 22.15,
    lastUpdated: '2025-01-14 10:30:00'
  });

  const activeUsers = [
    { name: 'Sarah Manager', role: 'Employer', status: 'active', lastSeen: '2 min ago' },
    { name: 'John Driver', role: 'Employee', status: 'active', lastSeen: '5 min ago' },
    { name: 'Mary Johnson', role: 'Employee', status: 'active', lastSeen: '8 min ago' },
    { name: 'Peter Williams', role: 'Employee', status: 'idle', lastSeen: '25 min ago' },
    { name: 'Mike Wilson', role: 'Employee', status: 'active', lastSeen: '12 min ago' }
  ];

  const approvedReceipts = [
    { id: '2024-001', employee: 'John Driver', amount: 450, date: '2025-01-10', category: 'Fuel' },
    { id: '2024-002', employee: 'Mary Johnson', amount: 120, date: '2025-01-09', category: 'Meals' },
    { id: '2024-003', employee: 'Sarah Lee', amount: 85, date: '2025-01-08', category: 'Toll Gates' },
    { id: '2024-004', employee: 'Peter Williams', amount: 300, date: '2025-01-07', category: 'Accommodation' }
  ];

  const operatingSegments = [
    {
      segment: 'Freight Services',
      revenue: 2450000,
      operatingProfit: 368000,
      assets: 1850000,
      description: 'Core freight forwarding and transportation services'
    },
    {
      segment: 'Storage and Handling',
      revenue: 680000,
      operatingProfit: 95000,
      assets: 420000,
      description: 'Warehousing and cargo handling operations'
    },
    {
      segment: 'Logistics Consulting',
      revenue: 320000,
      operatingProfit: 78000,
      assets: 85000,
      description: 'Supply chain consulting and advisory services'
    }
  ];

  const foreignExchangeImpact = {
    totalExposure: 125000,
    unrealizedGainLoss: -8500,
    hedgedAmount: 95000,
    currency: 'USD'
  };

  const employeeBenefits = {
    salariesAndWages: 1850000,
    retirementFunds: 185000,
    medicalAid: 125000,
    leaveAccruals: 75000,
    otherBenefits: 45000
  };

  const handleDownloadReport = (reportType: string) => {
    console.log(`Downloading ${reportType} report...`);
    // Simulate file download
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">IFRS for SMEs Compliance</h2>
          <p className="text-slate-600">International Financial Reporting Standards compliance and reporting</p>
        </div>
        <Badge variant="outline" className="text-green-700 bg-green-50">
          IFRS Compliant
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="currency">Currency Exchange</TabsTrigger>
          <TabsTrigger value="segments">Operating Segments</TabsTrigger>
          <TabsTrigger value="conceptual">Conceptual Framework</TabsTrigger>
          <TabsTrigger value="reports">Reports & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Active Users</p>
                    <p className="text-2xl text-slate-900">{activeUsers.filter(u => u.status === 'active').length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Approved Receipts</p>
                    <p className="text-2xl text-slate-900">{approvedReceipts.length + 142}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">FX Exposure</p>
                    <p className="text-2xl text-slate-900">R{foreignExchangeImpact.totalExposure.toLocaleString()}</p>
                  </div>
                  <Globe className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Compliance Score</p>
                    <p className="text-2xl text-slate-900">98.5%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Current Active Users</CardTitle>
              <CardDescription>Users currently logged into the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeUsers.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <p className="text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={user.status === 'active' ? 'secondary' : 'outline'} className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                        {user.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">{user.lastSeen}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Approved Receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Recent Approved Receipts</CardTitle>
              <CardDescription>Prevent double approval and duplicate detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approvedReceipts.map((receipt) => (
                  <div key={receipt.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-slate-900">Receipt #{receipt.id}</p>
                        <p className="text-xs text-slate-500">{receipt.employee} • {receipt.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900">R{receipt.amount}</p>
                      <p className="text-xs text-slate-500">{receipt.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          {/* Live Exchange Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Live Currency Exchange Rates
              </CardTitle>
              <CardDescription>Real-time exchange rates for foreign currency transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">USD/ZAR</p>
                      <p className="text-2xl text-slate-900">R{liveRates.USD}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">+0.15%</Badge>
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">EUR/ZAR</p>
                      <p className="text-2xl text-slate-900">R{liveRates.EUR}</p>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-800">-0.08%</Badge>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">GBP/ZAR</p>
                      <p className="text-2xl text-slate-900">R{liveRates.GBP}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">+0.23%</Badge>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Last updated: {liveRates.lastUpdated}</p>
            </CardContent>
          </Card>

          {/* Foreign Exchange Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Foreign Exchange Impact Analysis</CardTitle>
              <CardDescription>IAS 21 - The Effects of Changes in Foreign Exchange Rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-700 mb-2">Total Exposure</h4>
                    <p className="text-2xl text-slate-900">R{foreignExchangeImpact.totalExposure.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">Equivalent in {foreignExchangeImpact.currency}</p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-700 mb-2">Unrealized Gain/Loss</h4>
                    <p className={`text-2xl ${foreignExchangeImpact.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R{Math.abs(foreignExchangeImpact.unrealizedGainLoss).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">
                      {foreignExchangeImpact.unrealizedGainLoss >= 0 ? 'Gain' : 'Loss'} this period
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-700 mb-2">Hedged Amount</h4>
                    <p className="text-2xl text-slate-900">R{foreignExchangeImpact.hedgedAmount.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{Math.round((foreignExchangeImpact.hedgedAmount / foreignExchangeImpact.totalExposure) * 100)}% of exposure</p>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="text-slate-700 mb-2">Risk Assessment</h4>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Moderate Risk</Badge>
                    <p className="text-sm text-slate-500 mt-1">Monitor exchange rate fluctuations</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Button variant="outline" onClick={() => handleDownloadReport('fx-impact')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download FX Impact Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          {/* Operating Segments (IFRS 8) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Operating Segments - IFRS 8</CardTitle>
              <CardDescription>Segment reporting based on management's internal reporting structure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {operatingSegments.map((segment, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg text-slate-900">{segment.segment}</h3>
                        <p className="text-sm text-slate-600">{segment.description}</p>
                      </div>
                      <Badge variant="outline">Segment {index + 1}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 rounded">
                        <p className="text-sm text-slate-600">Revenue</p>
                        <p className="text-xl text-slate-900">R{segment.revenue.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded">
                        <p className="text-sm text-slate-600">Operating Profit</p>
                        <p className="text-xl text-slate-900">R{segment.operatingProfit.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">{Math.round((segment.operatingProfit / segment.revenue) * 100)}% margin</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded">
                        <p className="text-sm text-slate-600">Segment Assets</p>
                        <p className="text-xl text-slate-900">R{segment.assets.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <h4 className="text-slate-700 mb-3">Segment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl text-slate-900">
                        R{operatingSegments.reduce((sum, seg) => sum + seg.revenue, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">Total Revenue</p>
                    </div>
                    <div>
                      <p className="text-2xl text-slate-900">
                        R{operatingSegments.reduce((sum, seg) => sum + seg.operatingProfit, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">Total Operating Profit</p>
                    </div>
                    <div>
                      <p className="text-2xl text-slate-900">
                        R{operatingSegments.reduce((sum, seg) => sum + seg.assets, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500">Total Assets</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Benefits (IAS 19) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Employee Benefits - IAS 19</CardTitle>
              <CardDescription>Employee benefit obligations and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Salaries and Wages</p>
                    <p className="text-xl text-slate-900">R{employeeBenefits.salariesAndWages.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Retirement Fund Contributions</p>
                    <p className="text-xl text-slate-900">R{employeeBenefits.retirementFunds.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Medical Aid Contributions</p>
                    <p className="text-xl text-slate-900">R{employeeBenefits.medicalAid.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Leave Accruals</p>
                    <p className="text-xl text-slate-900">R{employeeBenefits.leaveAccruals.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Other Benefits</p>
                    <p className="text-xl text-slate-900">R{employeeBenefits.otherBenefits.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-slate-600">Total Employee Benefits</p>
                    <p className="text-xl text-slate-900">
                      R{Object.values(employeeBenefits).reduce((sum, val) => sum + val, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conceptual" className="space-y-6">
          {/* Conceptual Framework Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Conceptual Framework Analysis</CardTitle>
              <CardDescription>Elements of financial statements according to IFRS conceptual framework</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-700 mb-4">Assets</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Cash and Cash Equivalents</span>
                      <span className="text-slate-900">R485,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Trade Receivables</span>
                      <span className="text-slate-900">R320,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Fleet and Equipment</span>
                      <span className="text-slate-900">R1,850,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Right-of-Use Assets</span>
                      <span className="text-slate-900">R125,000</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-slate-700 mb-4">Liabilities</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Trade Payables</span>
                      <span className="text-slate-900">R185,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">VAT Payable</span>
                      <span className="text-slate-900">R45,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Employee Benefits</span>
                      <span className="text-slate-900">R75,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-slate-600">Lease Liabilities</span>
                      <span className="text-slate-900">R118,000</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-700 mb-4">Income</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-slate-600">Freight Services Revenue</span>
                      <span className="text-slate-900">R2,450,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-slate-600">Storage Revenue</span>
                      <span className="text-slate-900">R680,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-slate-600">Consulting Revenue</span>
                      <span className="text-slate-900">R320,000</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-slate-700 mb-4">Expenses</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-slate-600">Fuel Costs</span>
                      <span className="text-slate-900">R890,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-slate-600">Employee Costs</span>
                      <span className="text-slate-900">R1,850,000</span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-slate-600">Maintenance & Repairs</span>
                      <span className="text-slate-900">R245,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Financial Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">IFRS Financial Statements</CardTitle>
                <CardDescription>Official financial reports for period ended 28 February 2025</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadReport('foreign-exchange-summary')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Foreign Exchange Impact Summary
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadReport('employee-benefits-summary')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Employee Benefits Summary
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadReport('operating-segments-summary')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Operating Segments Analysis
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDownloadReport('conceptual-framework-summary')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Conceptual Framework Summary
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Compliance Status</CardTitle>
                <CardDescription>IFRS for SMEs compliance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-slate-700">Revenue Recognition</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-slate-700">Asset Valuation</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-slate-700">Foreign Exchange</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-slate-700">Tax Disclosures</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Review Required</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Independent Review Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Independent Review (28 February 2025)</CardTitle>
              <CardDescription>Preparation status for independent review engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl text-blue-600 mb-2">98%</div>
                  <div className="text-sm text-slate-600">Documentation Complete</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl text-green-600 mb-2">145</div>
                  <div className="text-sm text-slate-600">Supporting Schedules</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl text-purple-600 mb-2">28 Feb</div>
                  <div className="text-sm text-slate-600">Review Date</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="text-slate-700">Financial Statements</span>
                  <Badge className="bg-green-100 text-green-800">Ready</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="text-slate-700">Supporting Schedules</span>
                  <Badge className="bg-green-100 text-green-800">Ready</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <span className="text-slate-700">Audit Trail</span>
                  <Badge className="bg-green-100 text-green-800">Ready</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                  <span className="text-slate-700">Management Letter Response</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}