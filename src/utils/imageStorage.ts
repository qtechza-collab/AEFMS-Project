import { supabase } from './supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  claimId?: string;
  description?: string;
}

/**
 * Logan Freights Image Storage Service
 * Handles receipt and document uploads to Supabase Storage
 */
class ImageStorageService {
  private readonly bucketName = 'receipts';
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File, 
    userId: string, 
    claimId?: string,
    description?: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = claimId 
        ? `${userId}/claims/${claimId}/${fileName}`
        : `${userId}/general/${fileName}`;

      console.log('📤 Uploading file to Logan Freights storage:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload error:', error);
        return { 
          success: false, 
          error: `Upload failed: ${error.message}` 
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      // Save metadata to database
      if (claimId) {
        await this.saveImageMetadata({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          uploadedBy: userId,
          claimId,
          description
        }, filePath, urlData.publicUrl);
      }

      console.log('✅ File uploaded successfully:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      };

    } catch (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: File[],
    userId: string,
    claimId?: string,
    description?: string
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, userId, claimId, description)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error'
      };
    }
  }

  /**
   * Get files for a specific claim
   */
  async getClaimFiles(claimId: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('receipt_images')
        .select('*')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, files: data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`
      };
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Supported types: JPG, PNG, WebP, PDF`
      };
    }

    return { valid: true };
  }

  /**
   * Save image metadata to database
   */
  private async saveImageMetadata(
    metadata: ImageMetadata,
    filePath: string,
    publicUrl: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('receipt_images')
        .insert({
          claim_id: metadata.claimId,
          file_name: metadata.fileName,
          file_path: filePath,
          file_url: publicUrl,
          file_size: metadata.fileSize,
          file_type: metadata.fileType,
          uploaded_by: metadata.uploadedBy,
          uploaded_at: metadata.uploadedAt,
          description: metadata.description
        });

      if (error) {
        console.error('Failed to save image metadata:', error);
      }
    } catch (error) {
      console.error('Error saving image metadata:', error);
    }
  }

  /**
   * Generate presigned URL for secure access
   */
  async getPresignedUrl(filePath: string, expiresIn: number = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, url: data.signedUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const imageStorage = new ImageStorageService();

// Export utility functions
export const uploadReceiptImage = (file: File, userId: string, claimId?: string) => 
  imageStorage.uploadFile(file, userId, claimId);

export const uploadMultipleReceipts = (files: File[], userId: string, claimId?: string) => 
  imageStorage.uploadMultipleFiles(files, userId, claimId);

export const deleteReceiptImage = (filePath: string) => 
  imageStorage.deleteFile(filePath);

export const getClaimImages = (claimId: string) => 
  imageStorage.getClaimFiles(claimId);