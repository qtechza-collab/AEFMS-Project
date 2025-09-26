import { supabase } from './supabase/client';
import { enhancedCloudStorage } from './enhancedCloudStorage';

export interface ProfileUploadResult {
  success: boolean;
  profileUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface BulkUploadResult {
  success: boolean;
  results?: Array<{
    userId: string;
    success: boolean;
    profileUrl?: string;
    error?: string;
  }>;
  error?: string;
}

export interface ProfileImageInfo {
  id: string;
  userId: string;
  originalUrl: string;
  thumbnailUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    hashedFingerprint?: string;
  };
}

/**
 * Logan Freights Enterprise Profile Upload Service
 * Advanced profile image management for enterprise users
 */
class EnterpriseProfileUploadService {
  
  private readonly profileBucket = 'logan-freights-profiles';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly thumbnailSize = { width: 150, height: 150 };

  /**
   * Upload profile image for user
   */
  async uploadProfileImage(
    file: File,
    userId: string,
    uploadedBy: string
  ): Promise<ProfileUploadResult> {
    try {
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename
      const fileName = this.generateProfileFileName(userId, file.name);
      const filePath = `profiles/${userId}/${fileName}`;

      // Upload original image
      const uploadResult = await enhancedCloudStorage.uploadFile(file, `profiles/${userId}`);
      if (!uploadResult.success || !uploadResult.file) {
        return { success: false, error: uploadResult.error || 'Upload failed' };
      }

      // Generate thumbnail
      const thumbnailFile = await this.generateThumbnail(file);
      const thumbnailPath = `profiles/${userId}/thumb_${fileName}`;
      
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbUpload = await enhancedCloudStorage.uploadFile(thumbnailFile, `profiles/${userId}`);
        if (thumbUpload.success && thumbUpload.file) {
          thumbnailUrl = thumbUpload.file.publicUrl;
        }
      }

      // Get image metadata
      const metadata = await this.getImageMetadata(file);

      // Save profile image record
      const { data, error: dbError } = await supabase
        .from('profile_images')
        .insert({
          user_id: userId,
          original_url: uploadResult.file.publicUrl,
          thumbnail_url: thumbnailUrl,
          file_name: fileName,
          file_size: file.size,
          uploaded_by: uploadedBy,
          metadata,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Update user profile photo
      await supabase
        .from('users')
        .update({
          profile_photo: uploadResult.file.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return {
        success: true,
        profileUrl: uploadResult.file.publicUrl,
        thumbnailUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Profile upload failed'
      };
    }
  }

  /**
   * Bulk upload profile images for multiple users
   */
  async bulkUploadProfiles(
    uploads: Array<{ file: File; userId: string }>,
    uploadedBy: string
  ): Promise<BulkUploadResult> {
    try {
      const results = [];

      for (const upload of uploads) {
        const result = await this.uploadProfileImage(upload.file, upload.userId, uploadedBy);
        results.push({
          userId: upload.userId,
          success: result.success,
          profileUrl: result.profileUrl,
          error: result.error
        });
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      return {
        success: successCount === totalCount,
        results,
        error: successCount < totalCount ? 
          `${totalCount - successCount} uploads failed` : 
          undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk upload failed'
      };
    }
  }

  /**
   * Get profile image history for user
   */
  async getProfileImageHistory(userId: string): Promise<{ success: boolean; data?: ProfileImageInfo[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profile_images')
        .select(`
          *,
          users!profile_images_uploaded_by_fkey(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const images: ProfileImageInfo[] = (data || []).map(img => ({
        id: img.id,
        userId: img.user_id,
        originalUrl: img.original_url,
        thumbnailUrl: img.thumbnail_url,
        fileName: img.file_name,
        fileSize: img.file_size,
        uploadedAt: img.created_at,
        uploadedBy: img.users?.name || 'Unknown',
        metadata: img.metadata
      }));

      return { success: true, data: images };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile image history'
      };
    }
  }

  /**
   * Delete profile image
   */
  async deleteProfileImage(imageId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get image details
      const { data: image, error: imageError } = await supabase
        .from('profile_images')
        .select('*')
        .eq('id', imageId)
        .eq('user_id', userId)
        .single();

      if (imageError || !image) {
        throw new Error('Profile image not found');
      }

      // Delete files from storage
      const originalPath = this.extractPathFromUrl(image.original_url);
      const thumbnailPath = this.extractPathFromUrl(image.thumbnail_url);

      if (originalPath) {
        await enhancedCloudStorage.deleteFile(originalPath);
      }
      if (thumbnailPath) {
        await enhancedCloudStorage.deleteFile(thumbnailPath);
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('profile_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      // Update user profile photo if this was the current one
      const { data: user } = await supabase
        .from('users')
        .select('profile_photo')
        .eq('id', userId)
        .single();

      if (user?.profile_photo === image.original_url) {
        await supabase
          .from('users')
          .update({
            profile_photo: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete profile image'
      };
    }
  }

  /**
   * Set profile image as current
   */
  async setCurrentProfileImage(imageId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: image, error: imageError } = await supabase
        .from('profile_images')
        .select('original_url')
        .eq('id', imageId)
        .eq('user_id', userId)
        .single();

      if (imageError || !image) {
        throw new Error('Profile image not found');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          profile_photo: image.original_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set current profile image'
      };
    }
  }

  /**
   * Get profile upload statistics
   */
  async getUploadStatistics(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: stats, error } = await supabase
        .from('profile_images')
        .select('file_size, created_at, uploaded_by');

      if (error) throw error;

      const totalUploads = stats?.length || 0;
      const totalSize = stats?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;
      const averageSize = totalUploads > 0 ? totalSize / totalUploads : 0;

      // Uploads by month
      const monthlyUploads = new Map<string, number>();
      (stats || []).forEach(img => {
        const date = new Date(img.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyUploads.set(monthKey, (monthlyUploads.get(monthKey) || 0) + 1);
      });

      // Top uploaders
      const uploaderCounts = new Map<string, number>();
      (stats || []).forEach(img => {
        uploaderCounts.set(img.uploaded_by, (uploaderCounts.get(img.uploaded_by) || 0) + 1);
      });

      const statistics = {
        totalUploads,
        totalSize,
        averageSize: Math.round(averageSize),
        monthlyUploads: Array.from(monthlyUploads.entries()).map(([month, count]) => ({ month, count })),
        topUploaders: Array.from(uploaderCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([uploader, count]) => ({ uploader, count }))
      };

      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get upload statistics'
      };
    }
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`
      };
    }

    if (!this.allowedFormats.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file format. Only JPEG, PNG, and WebP are allowed'
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique profile filename
   */
  private generateProfileFileName(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop() || 'jpg';
    return `profile_${userId}_${timestamp}.${extension}`;
  }

  /**
   * Generate thumbnail from image file
   */
  private async generateThumbnail(file: File): Promise<File | null> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { width, height } = this.calculateThumbnailDimensions(
          img.width,
          img.height,
          this.thumbnailSize.width,
          this.thumbnailSize.height
        );

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(thumbnailFile);
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */
  private calculateThumbnailDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;

    let width = maxWidth;
    let height = maxWidth / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Get image metadata
   */
  private async getImageMetadata(file: File): Promise<any> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          format: file.type,
          hashedFingerprint: this.generateImageHash(file)
        });
      };
      img.onerror = () => {
        resolve({
          width: 0,
          height: 0,
          format: file.type
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate simple image hash for duplicate detection
   */
  private generateImageHash(file: File): string {
    // Simple hash based on file size and name
    return btoa(`${file.size}_${file.name}_${file.lastModified}`).substring(0, 16);
  }

  /**
   * Extract file path from storage URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.profileBucket);
      if (bucketIndex >= 0 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cleanup old profile images
   */
  async cleanupOldProfiles(userId: string, keepCount: number = 5): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const historyResult = await this.getProfileImageHistory(userId);
      if (!historyResult.success || !historyResult.data) {
        throw new Error(historyResult.error || 'Failed to get profile history');
      }

      const images = historyResult.data;
      if (images.length <= keepCount) {
        return { success: true, deletedCount: 0 };
      }

      const imagesToDelete = images.slice(keepCount);
      let deletedCount = 0;

      for (const image of imagesToDelete) {
        const deleteResult = await this.deleteProfileImage(image.id, userId);
        if (deleteResult.success) {
          deletedCount++;
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup old profiles'
      };
    }
  }
}

// Export singleton instance
export const enterpriseProfileUploadService = new EnterpriseProfileUploadService();

// Export utility functions
export const uploadProfileImage = (file: File, userId: string, uploadedBy: string) =>
  enterpriseProfileUploadService.uploadProfileImage(file, userId, uploadedBy);
export const bulkUploadProfiles = (uploads: any[], uploadedBy: string) =>
  enterpriseProfileUploadService.bulkUploadProfiles(uploads, uploadedBy);
export const getProfileImageHistory = (userId: string) =>
  enterpriseProfileUploadService.getProfileImageHistory(userId);
export const deleteProfileImage = (imageId: string, userId: string) =>
  enterpriseProfileUploadService.deleteProfileImage(imageId, userId);
export const setCurrentProfileImage = (imageId: string, userId: string) =>
  enterpriseProfileUploadService.setCurrentProfileImage(imageId, userId);
export const getUploadStatistics = () =>
  enterpriseProfileUploadService.getUploadStatistics();
export const cleanupOldProfiles = (userId: string, keepCount?: number) =>
  enterpriseProfileUploadService.cleanupOldProfiles(userId, keepCount);