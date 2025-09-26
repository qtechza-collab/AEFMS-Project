import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  Fuel, 
  UtensilsCrossed, 
  Wrench, 
  Bed, 
  Car,
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  limit: number;
  spent: number;
  description: string;
  color: string;
}

export function ExpenseCategories() {
  const categories: ExpenseCategory[] = [
    {
      id: 'fuel',
      name: 'Fuel',
      icon: <Fuel className="w-5 h-5" />,
      limit: 2000,
      spent: 1250,
      description: 'Vehicle fuel and related expenses',
      color: 'text-red-600'
    },
    {
      id: 'meals',
      name: 'Meals',
      icon: <UtensilsCrossed className="w-5 h-5" />,
      limit: 800,
      spent: 450,
      description: 'Business meal allowances',
      color: 'text-green-600'
    },
    {
      id: 'repair',
      name: 'Repairs',
      icon: <Wrench className="w-5 h-5" />,
      limit: 1500,
      spent: 320,
      description: 'Vehicle maintenance and repairs',
      color: 'text-blue-600'
    },
    {
      id: 'accommodation',
      name: 'Accommodation',
      icon: <Bed className="w-5 h-5" />,
      limit: 1200,
      spent: 800,
      description: 'Overnight stays and lodging',
      color: 'text-purple-600'
    },
    {
      id: 'toll_gates',
      name: 'Toll Gates',
      icon: <Car className="w-5 h-5" />,
      limit: 300,
      spent: 180,
      description: 'Highway tolls and road fees',
      color: 'text-orange-600'
    }
  ];

  const getUsagePercentage = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  const getUsageStatus = (spent: number, limit: number) => {
    const percentage = getUsagePercentage(spent, limit);
    if (percentage >= 90) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100' };
    if (percentage >= 75) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-100' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">Expense Categories</h2>
          <p className="text-slate-600">Track your spending limits across different categories</p>
        </div>
        <Badge variant="outline" className="text-slate-600">
          Monthly Limits
        </Badge>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const usagePercentage = getUsagePercentage(category.spent, category.limit);
          const status = getUsageStatus(category.spent, category.limit);

          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-100 ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900">{category.name}</CardTitle>
                      <CardDescription className="text-xs">{category.description}</CardDescription>
                    </div>
                  </div>
                  {status.status === 'critical' && (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Spent</span>
                    <span className="text-slate-900">
                      R{category.spent.toLocaleString()} / R{category.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <div className="flex justify-between text-xs">
                    <span className={status.color}>{usagePercentage.toFixed(1)}% used</span>
                    <span className="text-slate-500">
                      R{(category.limit - category.spent).toLocaleString()} remaining
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${status.bg} ${status.color}`}
                  >
                    {status.status === 'critical' && 'Over Limit'}
                    {status.status === 'warning' && 'Approaching Limit'}
                    {status.status === 'good' && 'Within Limit'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Category Performance
          </CardTitle>
          <CardDescription>Detailed breakdown of your expense categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => {
              const usagePercentage = getUsagePercentage(category.spent, category.limit);
              const status = getUsageStatus(category.spent, category.limit);

              return (
                <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-white ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <h4 className="text-slate-900">{category.name}</h4>
                      <p className="text-sm text-slate-500">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-slate-900">R{category.spent.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">of R{category.limit.toLocaleString()}</p>
                      </div>
                      <div className="w-20">
                        <Progress value={usagePercentage} className="h-2" />
                      </div>
                      <div className="w-16 text-right">
                        <span className={`text-sm ${status.color}`}>
                          {usagePercentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl text-slate-900">
                  R{categories.reduce((sum, cat) => sum + cat.spent, 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Total Spent</p>
              </div>
              <div>
                <p className="text-2xl text-slate-900">
                  R{categories.reduce((sum, cat) => sum + cat.limit, 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Total Budget</p>
              </div>
              <div>
                <p className="text-2xl text-slate-900">
                  R{categories.reduce((sum, cat) => sum + (cat.limit - cat.spent), 0).toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">Remaining</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}