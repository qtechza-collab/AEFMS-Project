import { receiptCaptureService } from './receiptCapture';
import { imageStorage } from './imageStorage';

export interface ReceiptUploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  autoProcess: boolean;
  enableOCR: boolean;
}

export interface UploadResult {
  success: boolean;
  receiptId?: string;
  extractedData?: any;
  error?: string;
}

/**
 * Logan Freights Receipt Upload Service
 */
class ReceiptUploadService {
  
  private defaultConfig: ReceiptUploadConfig = {
    maxFileSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    autoProcess: true,
    enableOCR: true
  };

  async uploadReceipt(
    file: File,
    userId: string,
    claimId?: string,
    config?: Partial<ReceiptUploadConfig>
  ): Promise<UploadResult> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };
      
      // Validate file
      const validation = this.validateFile(file, finalConfig);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Use receipt capture service for upload
      const result = await receiptCaptureService.captureReceipt(file, userId, claimId);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        receiptId: result.receipt?.id,
        extractedData: result.receipt?.extractedData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async uploadMultipleReceipts(
    files: File[],
    userId: string,
    claimId?: string,
    config?: Partial<ReceiptUploadConfig>
  ): Promise<{ success: boolean; results?: UploadResult[]; error?: string }> {
    try {
      const results: UploadResult[] = [];

      for (const file of files) {
        const result = await this.uploadReceipt(file, userId, claimId, config);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        results,
        error: successCount === 0 ? 'All uploads failed' : 
               successCount < results.length ? 'Some uploads failed' : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multiple upload failed'
      };
    }
  }

  private validateFile(file: File, config: ReceiptUploadConfig): { valid: boolean; error?: string } {
    if (file.size > config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${config.maxFileSize / 1024 / 1024}MB limit`
      };
    }

    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not supported`
      };
    }

    return { valid: true };
  }

  getUploadProgress(): number {
    // Implementation for upload progress tracking
    return 0;
  }
}

export const receiptUploadService = new ReceiptUploadService();