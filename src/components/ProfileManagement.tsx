import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Camera, 
  Upload, 
  Lock, 
  Eye, 
  EyeOff, 
  Save,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield
} from 'lucide-react';
import type { User as UserType } from '../App';
import { api } from '../utils/api';

interface ProfileManagementProps {
  user: UserType;
  setUser: (user: UserType) => void;
}

export function ProfileManagement({ user, setUser }: ProfileManagementProps) {
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('profile_photo', file);
      formData.append('user_id', user.id);

      const response = await api.uploadProfilePhoto(formData);

      if (response.success) {
        const updatedUser = { ...user, profile_photo: response.data.profile_photo_url };
        setUser(updatedUser);
        localStorage.setItem('efm_user', JSON.stringify(updatedUser));
        toast.success('Profile photo updated successfully!');
      } else {
        toast.error('Failed to upload profile photo');
      }
    } catch (error) {
      console.error('Profile photo upload error:', error);
      toast.error('Failed to upload profile photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await api.updatePassword({
        user_id: user.id,
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });

      if (response.success) {
        toast.success('Password updated successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setIsEditingPassword(false);
      } else {
        toast.error(response.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleProfilePhotoUpload(file);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'employer': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Manage your profile settings and account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Photo Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user.profile_photo} />
                <AvatarFallback className="text-xl bg-slate-900 text-white">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="secondary"
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={triggerFileInput}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-slate-900 text-xl">{user.name}</h3>
              <p className="text-slate-600">@{user.username}</p>
              <Badge 
                variant="secondary" 
                className={`mt-2 ${getRoleBadgeColor(user.role)}`}
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-slate-900">{user.email}</p>
                </div>
              </div>
              
              {user.employee_id && (
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Employee ID</p>
                    <p className="text-slate-900">{user.employee_id}</p>
                  </div>
                </div>
              )}

              {user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="text-slate-900">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {user.department && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Department</p>
                    <p className="text-slate-900">{user.department}</p>
                  </div>
                </div>
              )}

              {user.position && (
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Position</p>
                    <p className="text-slate-900">{user.position}</p>
                  </div>
                </div>
              )}

              {user.created_at && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="text-slate-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Update your password and security preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditingPassword ? (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-slate-900">Password</h4>
                <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsEditingPassword(true)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 8 characters)"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditingPassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  disabled={isUpdatingPassword}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {isUpdatingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
