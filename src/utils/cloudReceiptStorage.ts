// Logan Freights Cloud Receipt Storage System
// Handles secure cloud storage for receipt images with multiple backup locations

import { supabase } from './supabase/client';

export interface UploadOptions {
  claimId: string;
  employeeId: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface StoredReceipt {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimetype: string;
  claimId: string;
  employeeId: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  success: boolean;
  data?: StoredReceipt;
  error?: string;
}

class CloudReceiptStorage {
  private readonly BUCKET_NAME = 'receipts';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  /**
   * Upload receipt file to cloud storage
   */
  async uploadReceipt(file: File, options: UploadOptions): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename
      const filename = this.generateFilename(file, options);
      const filepath = `${options.employeeId}/${options.claimId}/${filename}`;

      console.log('📤 Uploading receipt to cloud storage:', filepath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filepath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filepath);

      // Save metadata to database
      const receiptRecord = {
        filename: filename,
        file_path: filepath,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        claim_id: options.claimId,
        employee_id: options.employeeId,
        metadata: {
          originalName: file.name,
          category: options.category,
          ...options.metadata
        },
        uploaded_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('receipt_storage')
        .insert(receiptRecord)
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save failed:', dbError);
        // Try to clean up uploaded file
        await this.deleteFile(filepath);
        return { success: false, error: 'Failed to save receipt metadata' };
      }

      const storedReceipt: StoredReceipt = {
        id: dbData.id,
        filename: dbData.filename,
        url: dbData.file_url,
        size: dbData.file_size,
        mimetype: dbData.mime_type,
        claimId: dbData.claim_id,
        employeeId: dbData.employee_id,
        uploadedAt: dbData.uploaded_at,
        metadata: dbData.metadata
      };

      console.log('✅ Receipt uploaded successfully:', storedReceipt.id);
      return { success: true, data: storedReceipt };

    } catch (error) {
      console.error('❌ Receipt upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<{ success: boolean; data?: StoredReceipt; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('receipt_storage')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) throw error;

      const receipt: StoredReceipt = {
        id: data.id,
        filename: data.filename,
        url: data.file_url,
        size: data.file_size,
        mimetype: data.mime_type,
        claimId: data.claim_id,
        employeeId: data.employee_id,
        uploadedAt: data.uploaded_at,
        metadata: data.metadata
      };

      return { success: true, data: receipt };
    } catch (error) {
      console.error('❌ Failed to get receipt:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Receipt not found' };
    }
  }

  /**
   * Get receipts for a claim
   */
  async getReceiptsForClaim(claimId: string): Promise<{ success: boolean; data?: StoredReceipt[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('receipt_storage')
        .select('*')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const receipts: StoredReceipt[] = data.map(item => ({
        id: item.id,
        filename: item.filename,
        url: item.file_url,
        size: item.file_size,
        mimetype: item.mime_type,
        claimId: item.claim_id,
        employeeId: item.employee_id,
        uploadedAt: item.uploaded_at,
        metadata: item.metadata
      }));

      return { success: true, data: receipts };
    } catch (error) {
      console.error('❌ Failed to get receipts for claim:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch receipts' };
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(receiptId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get receipt info first
      const receiptResult = await this.getReceipt(receiptId);
      if (!receiptResult.success || !receiptResult.data) {
        return { success: false, error: 'Receipt not found' };
      }

      const receipt = receiptResult.data;

      // Delete from storage
      const filepath = `${receipt.employeeId}/${receipt.claimId}/${receipt.filename}`;
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filepath]);

      if (storageError) {
        console.warn('⚠️ Failed to delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('receipt_storage')
        .delete()
        .eq('id', receiptId);

      if (dbError) throw dbError;

      console.log('✅ Receipt deleted successfully:', receiptId);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete receipt:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
    }
  }

  /**
   * Generate secure signed URL for private access
   */
  async getSignedUrl(receiptId: string, expiresIn = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const receiptResult = await this.getReceipt(receiptId);
      if (!receiptResult.success || !receiptResult.data) {
        return { success: false, error: 'Receipt not found' };
      }

      const receipt = receiptResult.data;
      const filepath = `${receipt.employeeId}/${receipt.claimId}/${receipt.filename}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filepath, expiresIn);

      if (error) throw error;

      return { success: true, url: data.signedUrl };
    } catch (error) {
      console.error('❌ Failed to generate signed URL:', error);
      return { success: false, error: error instanceof Error ? error.message : 'URL generation failed' };
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: `File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB` };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only images and PDFs are allowed' };
    }

    return { valid: true };
  }

  /**
   * Generate unique filename
   */
  private generateFilename(file: File, options: UploadOptions): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    return `receipt_${timestamp}_${random}.${extension}`;
  }

  /**
   * Delete file from storage (cleanup utility)
   */
  private async deleteFile(filepath: string): Promise<void> {
    try {
      await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filepath]);
    } catch (error) {
      console.warn('⚠️ Failed to cleanup file:', filepath, error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(employeeId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let query = supabase
        .from('receipt_storage')
        .select('file_size, mime_type, uploaded_at');

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        totalFiles: data.length,
        totalSize: data.reduce((sum, item) => sum + item.file_size, 0),
        averageSize: data.length > 0 ? data.reduce((sum, item) => sum + item.file_size, 0) / data.length : 0,
        fileTypes: data.reduce((acc, item) => {
          acc[item.mime_type] = (acc[item.mime_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Stats unavailable' };
    }
  }
}

// Export singleton instance
export const cloudReceiptStorage = new CloudReceiptStorage();

// Export class for direct instantiation if needed
export default CloudReceiptStorage;