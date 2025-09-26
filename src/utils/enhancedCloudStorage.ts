import { supabase } from './supabase/client';

export interface CloudStorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface UploadResult {
  success: boolean;
  file?: CloudStorageFile;
  error?: string;
}

export interface UploadProgress {
  progress: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

/**
 * Enhanced Cloud Storage Service for Logan Freights
 * Advanced file management with Supabase Storage integration
 */
class EnhancedCloudStorageService {
  private readonly bucketName = 'logan-freights-files';

  /**
   * Upload file to cloud storage
   */
  async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      onProgress?.({
        progress: 0,
        stage: 'uploading',
        message: 'Starting upload...'
      });

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      onProgress?.({
        progress: 10,
        stage: 'uploading',
        message: 'Validating file...'
      });

      // Generate unique filename
      const fileName = this.generateFileName(file.name, path);
      const filePath = `${path}/${fileName}`;

      onProgress?.({
        progress: 20,
        stage: 'uploading',
        message: 'Uploading to storage...'
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      onProgress?.({
        progress: 80,
        stage: 'processing',
        message: 'Processing file...'
      });

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      onProgress?.({
        progress: 90,
        stage: 'processing',
        message: 'Finalizing...'
      });

      // Create file record
      const cloudFile: CloudStorageFile = {
        id: data.id || this.generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: filePath,
        publicUrl: publicUrlData.publicUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          originalName: file.name,
          uploadPath: path,
          userId: 'current-user' // Should be passed from context
        }
      };

      onProgress?.({
        progress: 100,
        stage: 'complete',
        message: 'Upload complete!'
      });

      return {
        success: true,
        file: cloudFile
      };
    } catch (error) {
      onProgress?.({
        progress: 0,
        stage: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download file from cloud storage
   */
  async downloadFile(filePath: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error || !data) {
        throw new Error(`Download failed: ${error?.message || 'No data received'}`);
      }

      return {
        success: true,
        blob: data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string = ''): Promise<{ success: boolean; files?: CloudStorageFile[]; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(path, {
          limit: 100,
          offset: 0
        });

      if (error) {
        throw new Error(`List failed: ${error.message}`);
      }

      const files: CloudStorageFile[] = (data || []).map(item => ({
        id: item.id || this.generateId(),
        name: item.name,
        size: item.metadata?.size || 0,
        type: item.metadata?.mimetype || 'unknown',
        url: `${path}/${item.name}`,
        publicUrl: this.getPublicUrl(`${path}/${item.name}`),
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
        metadata: item.metadata
      }));

      return {
        success: true,
        files
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files'
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Allowed: JPEG, PNG, WebP, PDF, CSV, Excel'
      };
    }

    return { valid: true };
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalName: string, path: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.split('.').slice(0, -1).join('.');
    
    return `${baseName}_${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // This would need to be implemented with a Supabase function
      // For now, return mock data
      return {
        success: true,
        data: {
          totalFiles: 0,
          totalSize: 0,
          usedSpace: '0 MB',
          availableSpace: '1 GB',
          utilizationRate: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage stats'
      };
    }
  }

  /**
   * Bulk upload files
   */
  async uploadMultipleFiles(
    files: File[],
    path: string,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<{ success: boolean; results?: UploadResult[]; error?: string }> {
    try {
      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const result = await this.uploadFile(file, path, (progress) => {
          onProgress?.(i, progress);
        });

        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount === files.length,
        results,
        error: successCount < files.length ? 
          `${files.length - successCount} files failed to upload` : 
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
   * Create signed URL for secure downloads
   */
  async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data) {
        throw new Error(`Signed URL creation failed: ${error?.message || 'No data received'}`);
      }

      return {
        success: true,
        url: data.signedUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create signed URL'
      };
    }
  }
}

// Export singleton instance
export const enhancedCloudStorage = new EnhancedCloudStorageService();

// Export utility functions
export const uploadFile = (file: File, path: string, onProgress?: (progress: UploadProgress) => void) =>
  enhancedCloudStorage.uploadFile(file, path, onProgress);
export const downloadFile = (filePath: string) => enhancedCloudStorage.downloadFile(filePath);
export const deleteFile = (filePath: string) => enhancedCloudStorage.deleteFile(filePath);
export const listFiles = (path?: string) => enhancedCloudStorage.listFiles(path);
export const getPublicUrl = (filePath: string) => enhancedCloudStorage.getPublicUrl(filePath);
export const validateFile = (file: File) => enhancedCloudStorage.validateFile(file);
export const getStorageStats = () => enhancedCloudStorage.getStorageStats();
export const uploadMultipleFiles = (files: File[], path: string, onProgress?: any) =>
  enhancedCloudStorage.uploadMultipleFiles(files, path, onProgress);
export const createSignedUrl = (filePath: string, expiresIn?: number) =>
  enhancedCloudStorage.createSignedUrl(filePath, expiresIn);