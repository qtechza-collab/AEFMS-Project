import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  User, 
  Key, 
  Bell, 
  Shield,
  Save,
  Eye,
  EyeOff,
  Building,
  Globe,
  Database
} from 'lucide-react';
import type { User as UserType } from '../App';

interface EmployerSettingsProps {
  user: UserType;
}

export function EmployerSettings({ user }: EmployerSettingsProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [systemSettings, setSystemSettings] = useState({
    autoApproval: false,
    fraudSensitivity: 'medium',
    emailNotifications: true,
    weeklyReports: true,
    backupFrequency: 'daily',
    sessionTimeout: 30
  });

  const [profileData, setProfileData] = useState({
    name: user.name,
    email: 'sarah.manager@loganfreights.co.za',
    phone: '+27 31 123 4567',
    employeeId: 'LF-MGR-001',
    department: 'Management',
    position: 'Operations Manager'
  });

  const [companyData, setCompanyData] = useState({
    name: 'Logan Freights Logistics CC',
    registrationNumber: '2015/123456/23',
    vatNumber: '4567891234',
    address: '123 Logan Road, Durban, KZN, 4001',
    contactEmail: 'info@loganfreights.co.za',
    website: 'www.loganfreights.co.za'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = () => {
    console.log('Profile updated:', profileData);
  };

  const handleCompanyUpdate = () => {
    console.log('Company info updated:', companyData);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Password changed');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSystemSettingsUpdate = () => {
    console.log('System settings updated:', systemSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-slate-900">Settings</h2>
        <p className="text-slate-600">Manage your account and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={profileData.employeeId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={profileData.position}
                  onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleProfileUpdate} className="bg-slate-900 hover:bg-slate-800">
              <Save className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Company Information
            </CardTitle>
            <CardDescription>Logan Freights Logistics CC details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyData.name}
                onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input
                  id="regNumber"
                  value={companyData.registrationNumber}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  value={companyData.vatNumber}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, vatNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={companyData.address}
                onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={companyData.contactEmail}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={companyData.website}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={handleCompanyUpdate} className="bg-slate-900 hover:bg-slate-800">
              <Save className="w-4 h-4 mr-2" />
              Update Company Info
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password for security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handlePasswordChange} className="bg-slate-900 hover:bg-slate-800">
            <Shield className="w-4 h-4 mr-2" />
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5" />
            System Settings
          </CardTitle>
          <CardDescription>Configure system behavior and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoApproval">Auto-Approval for Low-Risk Claims</Label>
                <p className="text-sm text-slate-500">Automatically approve claims under R500 with no fraud flags</p>
              </div>
              <Switch
                id="autoApproval"
                checked={systemSettings.autoApproval}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, autoApproval: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-slate-500">Receive email alerts for new claims and fraud detection</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={systemSettings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weeklyReports">Weekly Summary Reports</Label>
                <p className="text-sm text-slate-500">Receive weekly expense and compliance reports</p>
              </div>
              <Switch
                id="weeklyReports"
                checked={systemSettings.weeklyReports}
                onCheckedChange={(checked) => 
                  setSystemSettings(prev => ({ ...prev, weeklyReports: checked }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fraud Detection Sensitivity</Label>
              <div className="flex space-x-2">
                {['low', 'medium', 'high'].map((level) => (
                  <Button
                    key={level}
                    variant={systemSettings.fraudSensitivity === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSystemSettings(prev => ({ ...prev, fraudSensitivity: level }))}
                    className={systemSettings.fraudSensitivity === level ? 'bg-slate-900 hover:bg-slate-800' : ''}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={systemSettings.sessionTimeout}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                min="15"
                max="120"
              />
            </div>
          </div>

          <Button onClick={handleSystemSettingsUpdate} className="bg-slate-900 hover:bg-slate-800">
            <Save className="w-4 h-4 mr-2" />
            Update System Settings
          </Button>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Account Information</CardTitle>
          <CardDescription>Your account details and system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Account Status:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Role:</span>
                <Badge variant="outline">Manager</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Access Level:</span>
                <Badge variant="outline">Full Access</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Last Login:</span>
                <span className="text-slate-900">Today, 08:30 AM</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">System Version:</span>
                <span className="text-slate-900">v2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Database Status:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Online</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Backup Status:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Current</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Support Level:</span>
                <Badge variant="outline">Premium</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}