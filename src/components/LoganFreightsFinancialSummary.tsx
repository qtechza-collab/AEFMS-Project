/**
 * Logan Freights Financial Summary Component
 * Displays key financial metrics from the real company data
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  Truck,
  PieChart
} from 'lucide-react';
import LoganFreightsFinancialData from '../utils/loganFreightsFinancialData';

export function LoganFreightsFinancialSummary() {
  const financialData = LoganFreightsFinancialData.getLatestFinancials();
  const companyInfo = LoganFreightsFinancialData.companyInfo;
  const ratios = LoganFreightsFinancialData.calculateFinancialRatios();

  const formatCurrency = LoganFreightsFinancialData.formatCurrency;

  // Calculate year-over-year changes
  const currentYear = LoganFreightsFinancialData.profitLossStatements[0]; // 2024
  const previousYear = LoganFreightsFinancialData.profitLossStatements[1]; // 2023

  const revenueChange = ((currentYear.revenue.total - previousYear.revenue.total) / previousYear.revenue.total) * 100;
  const profitChange = ((currentYear.netProfit - previousYear.netProfit) / previousYear.netProfit) * 100;

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Truck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl text-slate-900">{companyInfo.name}</h1>
        </div>
        <p className="text-slate-600">{companyInfo.location}</p>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Financial Year 2024
        </Badge>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-slate-900">{formatCurrency(financialData.profitLoss.revenue.total)}</div>
            <div className={`flex items-center space-x-1 text-sm ${revenueChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {revenueChange >= 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{Math.abs(revenueChange).toFixed(1)}% vs 2023</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-600">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-slate-900">{formatCurrency(financialData.profitLoss.netProfit)}</div>
            <div className={`flex items-center space-x-1 text-sm ${profitChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {profitChange >= 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{Math.abs(profitChange).toFixed(1)}% vs 2023</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-600">Total Assets</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-slate-900">{formatCurrency(financialData.balanceSheet.assets.totalAssets)}</div>
            <p className="text-xs text-slate-500">
              Fleet: {formatCurrency(financialData.balanceSheet.assets.nonCurrentAssets.fleetVehicles)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-slate-600">Cash Position</CardTitle>
            <PieChart className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-slate-900">{formatCurrency(financialData.balanceSheet.assets.currentAssets.cashBank)}</div>
            <p className="text-xs text-slate-500">
              Current Ratio: {ratios?.currentRatio.toFixed(2) || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown 2024</CardTitle>
          <CardDescription>Income sources by service type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Freight Services</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-slate-900">{formatCurrency(financialData.profitLoss.revenue.freightServices)}</span>
                <Badge variant="outline" className="ml-2">
                  {((financialData.profitLoss.revenue.freightServices / financialData.profitLoss.revenue.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-green-600" />
                <span className="text-sm">Logistics Consulting</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-slate-900">{formatCurrency(financialData.profitLoss.revenue.logisticsConsulting)}</span>
                <Badge variant="outline" className="ml-2">
                  {((financialData.profitLoss.revenue.logisticsConsulting / financialData.profitLoss.revenue.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Storage Services</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-slate-900">{formatCurrency(financialData.profitLoss.revenue.storageServices)}</span>
                <Badge variant="outline" className="ml-2">
                  {((financialData.profitLoss.revenue.storageServices / financialData.profitLoss.revenue.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Ratios */}
      {ratios && (
        <Card>
          <CardHeader>
            <CardTitle>Key Financial Ratios</CardTitle>
            <CardDescription>Financial health indicators for 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">{ratios.grossProfitMargin.toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Gross Profit Margin</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">{ratios.netProfitMargin.toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Net Profit Margin</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">{ratios.currentRatio.toFixed(2)}</div>
                <div className="text-xs text-slate-500">Current Ratio</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-orange-600">{ratios.debtToEquityRatio.toFixed(2)}</div>
                <div className="text-xs text-slate-500">Debt-to-Equity</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-indigo-600">{ratios.returnOnEquity.toFixed(1)}%</div>
                <div className="text-xs text-slate-500">Return on Equity</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-teal-600">{ratios.assetTurnover.toFixed(2)}</div>
                <div className="text-xs text-slate-500">Asset Turnover</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Location:</span>
              <span className="ml-2 text-slate-900">{companyInfo.location}</span>
            </div>
            <div>
              <span className="text-slate-500">Financial Year End:</span>
              <span className="ml-2 text-slate-900">{companyInfo.financialYearEnd}</span>
            </div>
            <div>
              <span className="text-slate-500">Corporate Tax Rate:</span>
              <span className="ml-2 text-slate-900">{(companyInfo.taxRate * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-slate-500">VAT Rate:</span>
              <span className="ml-2 text-slate-900">{(companyInfo.vatRate * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-slate-500">Currency:</span>
              <span className="ml-2 text-slate-900">{companyInfo.currency}</span>
            </div>
            <div>
              <span className="text-slate-500">Business Type:</span>
              <span className="ml-2 text-slate-900">Logistics & Freight</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoganFreightsFinancialSummary;