import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { 
  UserPlus, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  Mail,
  User,
  Building,
  Lock
} from 'lucide-react';
import { api } from '../utils/api';

interface RegistrationData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  department: string;
  position: string;
  role: string;
  agreeToTerms: boolean;
}

interface UserRegistrationProps {
  onBack: () => void;
  onRegistrationSuccess?: (message: string) => void;
}

export function UserRegistration({ onBack, onRegistrationSuccess }: UserRegistrationProps) {
  const [formData, setFormData] = useState<RegistrationData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
    position: '',
    role: 'employee',
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<Partial<RegistrationData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const departments = [
    'Logistics',
    'Transportation',
    'Warehouse Operations',
    'Customer Service',
    'Administration',
    'Finance',
    'Human Resources',
    'IT Support',
    'Maintenance',
    'Security'
  ];

  const positions = {
    'Logistics': ['Driver', 'Logistics Coordinator', 'Route Planner', 'Dispatch Operator'],
    'Transportation': ['Long Haul Driver', 'Local Driver', 'Fleet Manager', 'Vehicle Inspector'],
    'Warehouse Operations': ['Warehouse Worker', 'Forklift Operator', 'Inventory Clerk', 'Warehouse Supervisor'],
    'Customer Service': ['Customer Service Rep', 'Call Center Agent', 'Account Manager'],
    'Administration': ['Admin Assistant', 'Office Manager', 'Receptionist'],
    'Finance': ['Accountant', 'Bookkeeper', 'Financial Analyst'],
    'Human Resources': ['HR Assistant', 'Recruiter', 'Training Coordinator'],
    'IT Support': ['IT Technician', 'System Administrator', 'Help Desk Analyst'],
    'Maintenance': ['Mechanic', 'Maintenance Technician', 'Maintenance Supervisor'],
    'Security': ['Security Guard', 'Security Supervisor', 'Safety Officer']
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RegistrationData> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, dots, underscores, and hyphens';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().split(' ').length < 2) {
      newErrors.name = 'Please enter your full name (first and last name)';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }

    // Position validation
    if (!formData.position) {
      newErrors.position = 'Please select a position';
    }

    // Terms validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegistrationData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          department: formData.department,
          position: formData.position,
          role: formData.role
        })
      });

      if (response.success) {
        setRegistrationSuccess(true);
        if (onRegistrationSuccess) {
          onRegistrationSuccess(response.message);
        }
      } else {
        setErrors({ username: response.error });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ username: 'Registration failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-slate-900">Registration Successful!</CardTitle>
          <CardDescription>
            Your account has been created and is pending approval from management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You will receive an email notification once your account has been approved. 
              This process usually takes 1-2 business days.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Username:</strong> {formData.username}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Department:</strong> {formData.department}</p>
            <p><strong>Position:</strong> {formData.position}</p>
          </div>

          <Button onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-slate-900">Create Your Account</CardTitle>
        <CardDescription>
          Join Logan Freights Logistics CC - Register for access to our expense management system
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-slate-700 mb-2">
              <User className="w-4 h-4" />
              <span>Personal Information</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-slate-700 mb-2">
              <Lock className="w-4 h-4" />
              <span>Account Information</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="john.doe"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-slate-700 mb-2">
              <Building className="w-4 h-4" />
              <span>Work Information</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value) => {
                  handleInputChange('department', value);
                  handleInputChange('position', ''); // Reset position when department changes
                }}
              >
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-600">{errors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select 
                value={formData.position} 
                onValueChange={(value) => handleInputChange('position', value)}
                disabled={!formData.department}
              >
                <SelectTrigger className={errors.position ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select your position" />
                </SelectTrigger>
                <SelectContent>
                  {formData.department && positions[formData.department as keyof typeof positions]?.map((pos) => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position && (
                <p className="text-sm text-red-600">{errors.position}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="employer">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={formData.agreeToTerms}
              onCheckedChange={(checked) => handleInputChange('agreeToTerms', checked as boolean)}
              className={errors.agreeToTerms ? 'border-red-500' : ''}
            />
            <div className="space-y-1">
              <Label htmlFor="terms" className="text-sm">
                I agree to the{' '}
                <span className="text-blue-600 hover:underline cursor-pointer">
                  Terms and Conditions
                </span>{' '}
                and{' '}
                <span className="text-blue-600 hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </Label>
              {errors.agreeToTerms && (
                <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}