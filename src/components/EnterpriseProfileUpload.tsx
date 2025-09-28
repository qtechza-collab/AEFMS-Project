/**
 * Enterprise Profile Upload Component
 * Advanced profile image management with cloud storage
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  Upload,
  Camera,
  Trash2,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cloud,
  HardDrive,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { enterpriseProfileManager } from '../utils/enterpriseProfileManager';
import { type User } from '../App';

interface EnterpriseProfileUploadProps {
  user: User;
  onProfileUpdate: (updates: Partial<User>) => void;
}

export function EnterpriseProfileUpload({ user, onProfileUpdate }: EnterpriseProfileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [profileImage, setProfileImage] = useState<{
    url?: string;
    thumbnailUrl?: string;
    hasBackup: boolean;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadProfileImage();
    
    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail.userId === user.id) {
        loadProfileImage();
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
    };
  }, [user.id]);

  const loadProfileImage = async () => {
    try {
      const imageData = await enterpriseProfileManager.getUserProfileImage(user.id);
      setProfileImage(imageData);
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    handleImageUpload(file);
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Validating image...');

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image size must be less than 10MB');
      }

      setUploadProgress(25);
      setUploadStatus('Preparing upload...');

      // Upload to cloud storage
      const result = await enterpriseProfileManager.uploadProfileImage({
        file,
        userId: user.id,
        userRole: user.role
      });

      setUploadProgress(75);
      setUploadStatus('Updating profile...');

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update user profile
      const updates: Partial<User> = {
        profile_photo: result.url,
        profile_thumbnail: result.thumbnailUrl
      };

      onProfileUpdate(updates);

      setUploadProgress(100);
      setUploadStatus('Upload completed!');

      // Reload profile image
      await loadProfileImage();

      toast.success('Profile image updated successfully');

      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      setUploadStatus(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      const result = await enterpriseProfileManager.deleteProfileImage(user.id);
      
      if (result.success) {
        onProfileUpdate({
          profile_photo: undefined,
          profile_thumbnail: undefined
        });
        
        await loadProfileImage();
        toast.success('Profile image removed successfully');
      } else {
        throw new Error(result.error || 'Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove profile image');
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getDisplayUrl = () => {
    if (profileImage?.url) {
      return profileImage.url;
    }
    
    return enterpriseProfileManager.getProfileDisplayUrl(user);
  };

  const getStorageStatus = () => {
    if (!profileImage?.url) {
      return { type: 'none', label: 'No Image', icon: User, color: 'gray' };
    }
    
    if (profileImage.hasBackup) {
      return { type: 'local', label: 'Local Backup', icon: HardDrive, color: 'yellow' };
    }
    
    return { type: 'cloud', label: 'Cloud Storage', icon: Cloud, color: 'green' };
  };

  const storageStatus = getStorageStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span>Profile Image</span>
        </CardTitle>
        <CardDescription>
          Upload and manage your profile image. Images are stored securely in the cloud with local backup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Profile Image */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={getDisplayUrl()} alt={user.name} />
              <AvatarFallback className="bg-slate-100 text-slate-600">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            {/* Storage Status Badge */}
            <Badge 
              variant="outline" 
              className={`absolute -bottom-2 -right-2 text-xs ${
                storageStatus.color === 'green' ? 'border-green-200 bg-green-50 text-green-700' :
                storageStatus.color === 'yellow' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                'border-gray-200 bg-gray-50 text-gray-700'
              }`}
            >
              <storageStatus.icon className="w-3 h-3 mr-1" />
              {storageStatus.label}
            </Badge>
          </div>

          <div className="text-center">
            <h3 className="text-lg">{user.name}</h3>
            <p className="text-sm text-slate-500">{user.position} - {user.department}</p>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />
          
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-slate-400" />
            </div>
            
            <div>
              <p className="text-sm">
                <span className="text-blue-600 hover:text-blue-700 cursor-pointer">
                  Click to upload
                </span>
                {' '}or drag and drop
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PNG, JPG, WebP or GIF up to 10MB
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={loadProfileImage}
            disabled={isUploading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={openFileDialog}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Button>
            
            {profileImage?.url && (
              <Button
                variant="outline"
                onClick={handleDeleteImage}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* Storage Information */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-900 mb-2">Storage Information</h4>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Primary Storage:</span>
              <div className="flex items-center space-x-1">
                <Cloud className="w-3 h-3" />
                <span>B4A Cloud Service</span>
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Backup Storage:</span>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3 h-3" />
                <span>Local Browser Storage</span>
                {profileImage?.hasBackup ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-gray-400" />
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Images are automatically uploaded to cloud storage with local backup for reliability.
              Your profile image will be available when you return to the system.
            </div>
          </div>
        </div>

        {/* Tips */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Tips:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Use a square image (1:1 ratio) for best results</li>
              <li>Minimum resolution: 150x150 pixels</li>
              <li>Profile images are automatically resized and optimized</li>
              <li>Images are stored securely and only visible to authorized users</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
