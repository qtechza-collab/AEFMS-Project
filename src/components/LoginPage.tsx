import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Eye, EyeOff, Lock, User, Mic, Globe, CheckCircle, Clock, UserPlus } from 'lucide-react';
import type { UserRole } from '../App';
import { UserRegistration } from './UserRegistration';
import { DemoIndicator } from './DemoIndicator';
import { DemoModeAlert } from './DemoModeAlert';
import { SupabaseConnection } from './SupabaseConnection';

interface LoginPageProps {
  onLogin: (email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  isDemoMode?: boolean;
}

export function LoginPage({ onLogin, isDemoMode = false }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');

  // Demo credentials - now using email addresses
  const demoCredentials = {
    employee: { email: 'employee.dummy@loganfreights.co.za', password: 'Employee123!', name: 'John Driver' },
    manager: { email: 'manager.dummy@loganfreights.co.za', password: 'Manager123!', name: 'Sarah Manager' },
    hr: { email: 'hr.dummy@loganfreights.co.za', password: 'HR123!', name: 'Jane HR' },
    administrator: { email: 'admin@loganfreights.co.za', password: 'Admin123!', name: 'System Admin' }
  };

  const handleRegistrationSuccess = (message: string) => {
    setRegistrationMessage(message);
    setShowRegistration(false);
  };

  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-8">
        <UserRegistration 
          onBack={() => setShowRegistration(false)}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await onLogin(email, password, role);
    if (!result.success) {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const handleDemoLogin = (demoRole: UserRole) => {
    const demo = demoCredentials[demoRole];
    setEmail(demo.email);
    setPassword(demo.password);
    setRole(demoRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex">
      <DemoIndicator isDemoMode={isDemoMode} />
      {/* Left Side - Company Description */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center text-white">
        <div className="max-w-md">
          <h1 className="text-4xl text-white mb-6">Automated Expense Management and Forecasting System</h1>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Streamlined expense management for logistics operations across South Africa
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-blue-100">OCR Receipt Processing</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-blue-100">Voice Authentication</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-blue-100">IFRS Compliance</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-blue-100">Multi-Currency Support</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl text-white mb-1">50+</div>
              <div className="text-blue-200 text-sm">Connected Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-white mb-1">&lt;3s</div>
              <div className="text-blue-200 text-sm">Response Time</div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-900/30 rounded-lg">
            <p className="text-blue-100 text-sm leading-relaxed">
              A small to medium-sized logistics business, Logan Freights Logistics CC is situated in Durban, South Africa. 
              The business specialises in freight forwarding and provides services including supply chain management, 
              warehousing, cargo transportation, and customs clearance.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="bg-white shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center">
                  <Globe className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-slate-900">Logan Freights</CardTitle>
              <CardDescription className="text-slate-600">Logistics CC</CardDescription>
              <Separator className="my-4" />
              <CardTitle className="text-lg text-slate-900">Sign In to Your Account</CardTitle>
              <CardDescription>Access your expense management dashboard</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <DemoModeAlert isDemoMode={isDemoMode} />
              {isDemoMode && <SupabaseConnection />}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email Address *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 border-slate-300 focus:border-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700">Password</Label>
                    <Button type="button" variant="link" className="text-blue-600 text-xs p-0 h-auto">
                      Create new password
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 border-slate-300 focus:border-slate-900"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700">Select Your Role *</Label>
                  <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                    <SelectTrigger className="border-slate-300 focus:border-slate-900">
                      <SelectValue placeholder="Choose your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="hr">HR Manager</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {registrationMessage && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                    {registrationMessage}
                  </div>
                )}

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>

                  <div className="relative">
                    <Separator />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white px-2 text-xs text-slate-500">OR</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-300 hover:bg-slate-50"
                    onClick={() => setShowRegistration(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register New Account
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                <Separator />
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-3">Demo Accounts (Click to Auto-Fill)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto p-2 flex flex-col"
                      onClick={() => handleDemoLogin('employee')}
                    >
                      <Badge variant="secondary" className="mb-1">Employee</Badge>
                      <p className="text-xs">John Driver</p>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto p-2 flex flex-col"
                      onClick={() => handleDemoLogin('manager')}
                    >
                      <Badge variant="secondary" className="mb-1">Manager</Badge>
                      <p className="text-xs">Sarah Manager</p>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto p-2 flex flex-col"
                      onClick={() => handleDemoLogin('hr')}
                    >
                      <Badge variant="secondary" className="mb-1">HR</Badge>
                      <p className="text-xs">Jane HR</p>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto p-2 flex flex-col"
                      onClick={() => handleDemoLogin('administrator')}
                    >
                      <Badge variant="secondary" className="mb-1">Admin</Badge>
                      <p className="text-xs">System Admin</p>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}