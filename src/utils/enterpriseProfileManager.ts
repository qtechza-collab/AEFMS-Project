import { supabase } from './supabase/client';
import { imageStorage } from './imageStorage';
import type { User } from '../App';

export interface ProfileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ProfileImageMetadata {
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  isActive: boolean;
}

/**
 * Logan Freights Enterprise Profile Manager
 * Handles advanced profile image management with cloud storage integration
 */
class EnterpriseProfileManager {
  private readonly bucketName = 'profile-images';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB for profile images
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Upload and set user profile image
   */
  async uploadProfileImage(
    file: File, 
    user: User,
    replaceExisting: boolean = true
  ): Promise<ProfileUploadResult> {
    try {
      console.log('📸 Starting profile image upload for user:', user.name);

      // Validate file
      const validation = this.validateProfileImage(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Delete existing profile image if replacing
      if (replaceExisting) {
        await this.deleteExistingProfileImage(user.id);
      }

      // Upload to storage using imageStorage service
      const uploadResult = await imageStorage.uploadFile(
        file, 
        user.id, 
        undefined, // No claim ID for profile images
        'Profile Image'
      );

      if (!uploadResult.success) {
        return { 
          success: false, 
          error: uploadResult.error || 'Upload failed' 
        };
      }

      // Update user profile with new image URL
      const updateResult = await this.updateUserProfileImage(
        user.id, 
        uploadResult.url!
      );

      if (!updateResult.success) {
        // Cleanup uploaded file if database update fails
        if (uploadResult.path) {
          await imageStorage.deleteFile(uploadResult.path);
        }
        return { 
          success: false, 
          error: updateResult.error || 'Failed to update profile' 
        };
      }

      // Save metadata
      await this.saveProfileImageMetadata({
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        isActive: true
      }, uploadResult.path!, uploadResult.url!);

      console.log('✅ Profile image uploaded successfully:', uploadResult.url);

      return {
        success: true,
        url: uploadResult.url
      };

    } catch (error) {
      console.error('❌ Profile image upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Delete user's current profile image
   */
  async deleteProfileImage(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete from storage
      await this.deleteExistingProfileImage(userId);

      // Remove from user profile
      const { error } = await supabase
        .from('users')
        .update({ profile_photo: null })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Mark metadata as inactive
      await supabase
        .from('profile_images')
        .update({ is_active: false })
        .eq('user_id', userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's profile image history
   */
  async getProfileImageHistory(userId: string): Promise<{ 
    success: boolean; 
    images?: ProfileImageMetadata[]; 
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('profile_images')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const images: ProfileImageMetadata[] = (data || []).map(item => ({
        userId: item.user_id,
        fileName: item.file_name,
        fileSize: item.file_size,
        fileType: item.file_type,
        uploadedAt: item.uploaded_at,
        isActive: item.is_active
      }));

      return { success: true, images };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate optimized profile image variants
   */
  async generateImageVariants(
    originalUrl: string, 
    userId: string
  ): Promise<{ 
    success: boolean; 
    variants?: { thumbnail: string; medium: string; large: string }; 
    error?: string 
  }> {
    try {
      // In a real implementation, this would use image processing service
      // For now, return the original URL for all variants
      console.log('📷 Generating image variants for user:', userId);
      
      const variants = {
        thumbnail: `${originalUrl}?width=64&height=64&fit=crop`,
        medium: `${originalUrl}?width=128&height=128&fit=crop`,
        large: `${originalUrl}?width=256&height=256&fit=crop`
      };

      // Save variant metadata
      await supabase
        .from('profile_image_variants')
        .upsert({
          user_id: userId,
          thumbnail_url: variants.thumbnail,
          medium_url: variants.medium,
          large_url: variants.large,
          created_at: new Date().toISOString()
        });

      return { success: true, variants };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate variants'
      };
    }
  }

  /**
   * Validate profile image file
   */
  private validateProfileImage(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `Profile image must be smaller than ${this.maxFileSize / 1024 / 1024}MB`
      };
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Profile image must be JPG, PNG, or WebP format'
      };
    }

    // Check image dimensions (basic validation)
    return { valid: true };
  }

  /**
   * Update user profile with new image URL
   */
  private async updateUserProfileImage(
    userId: string, 
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          profile_photo: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database update failed'
      };
    }
  }

  /**
   * Delete existing profile image from storage
   */
  private async deleteExistingProfileImage(userId: string): Promise<void> {
    try {
      // Get current profile image path
      const { data: userData } = await supabase
        .from('users')
        .select('profile_photo')
        .eq('id', userId)
        .single();

      if (userData?.profile_photo) {
        // Extract file path from URL (simplified)
        const urlParts = userData.profile_photo.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${userId}/profile/${fileName}`;
        
        // Delete from storage
        await imageStorage.deleteFile(filePath);
      }

      // Mark old images as inactive
      await supabase
        .from('profile_images')
        .update({ is_active: false })
        .eq('user_id', userId);

    } catch (error) {
      console.warn('Warning: Could not delete existing profile image:', error);
    }
  }

  /**
   * Save profile image metadata
   */
  private async saveProfileImageMetadata(
    metadata: ProfileImageMetadata,
    filePath: string,
    publicUrl: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profile_images')
        .insert({
          user_id: metadata.userId,
          file_name: metadata.fileName,
          file_path: filePath,
          file_url: publicUrl,
          file_size: metadata.fileSize,
          file_type: metadata.fileType,
          uploaded_at: metadata.uploadedAt,
          is_active: metadata.isActive
        });

      if (error) {
        console.error('Failed to save profile image metadata:', error);
      }
    } catch (error) {
      console.error('Error saving profile image metadata:', error);
    }
  }

  /**
   * Compress image before upload (client-side)
   */
  async compressImage(
    file: File, 
    maxWidth: number = 512, 
    maxHeight: number = 512, 
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Return original if compression fails
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => resolve(file); // Return original if loading fails
      img.src = URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const enterpriseProfileManager = new EnterpriseProfileManager();

// Export utility functions
export const uploadProfileImage = (file: File, user: User) => 
  enterpriseProfileManager.uploadProfileImage(file, user);

export const deleteProfileImage = (userId: string) => 
  enterpriseProfileManager.deleteProfileImage(userId);

export const getProfileImageHistory = (userId: string) => 
  enterpriseProfileManager.getProfileImageHistory(userId);

export const compressProfileImage = (file: File) => 
  enterpriseProfileManager.compressImage(file);