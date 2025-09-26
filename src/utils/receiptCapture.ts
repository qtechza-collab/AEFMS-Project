import { imageStorage } from './imageStorage';
import { supabase } from './supabase/client';

export interface ReceiptData {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  extractedData?: ExtractedReceiptData;
}

export interface ExtractedReceiptData {
  amount?: number;
  currency?: string;
  date?: string;
  merchant?: string;
  category?: string;
  description?: string;
  confidence: number;
}

export interface CaptureResult {
  success: boolean;
  receipt?: ReceiptData;
  error?: string;
}

/**
 * Logan Freights Receipt Capture Service
 * Advanced receipt capture with OCR and data extraction
 */
class ReceiptCaptureService {
  
  /**
   * Capture receipt from file upload
   */
  async captureReceipt(
    file: File, 
    userId: string, 
    claimId?: string
  ): Promise<CaptureResult> {
    try {
      // Upload receipt image
      const uploadResult = await imageStorage.uploadFile(file, userId, claimId, 'Receipt');
      
      if (!uploadResult.success || !uploadResult.url) {
        return {
          success: false,
          error: uploadResult.error || 'Upload failed'
        };
      }

      // Create receipt record
      const receiptData: ReceiptData = {
        id: `receipt_${Date.now()}`,
        fileName: file.name,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Extract data from receipt (if OCR is available)
      try {
        const extractedData = await this.extractReceiptData(file);
        receiptData.extractedData = extractedData;
      } catch (ocrError) {
        console.warn('OCR extraction failed:', ocrError);
        // Continue without extracted data
      }

      return {
        success: true,
        receipt: receiptData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Receipt capture failed'
      };
    }
  }

  /**
   * Extract data from receipt using OCR (simplified)
   */
  private async extractReceiptData(file: File): Promise<ExtractedReceiptData> {
    // In a real implementation, this would use OCR services like:
    // - Google Cloud Vision API
    // - Amazon Textract
    // - Azure Computer Vision
    
    // For now, return mock extracted data with low confidence
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          amount: undefined, // Would be extracted from OCR
          currency: 'ZAR',
          date: new Date().toISOString().split('T')[0],
          merchant: undefined,
          category: undefined,
          description: 'Receipt uploaded - manual entry required',
          confidence: 0.3 // Low confidence indicates manual review needed
        });
      }, 1000); // Simulate processing time
    });
  }

  /**
   * Get receipts for a claim
   */
  async getClaimReceipts(claimId: string): Promise<{ success: boolean; data?: ReceiptData[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('receipt_images')
        .select('*')
        .eq('claim_id', claimId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      const receipts: ReceiptData[] = (data || []).map(receipt => ({
        id: receipt.id,
        fileName: receipt.file_name,
        fileUrl: receipt.file_url,
        fileSize: receipt.file_size,
        uploadedAt: receipt.uploaded_at,
        extractedData: receipt.extracted_data ? {
          amount: receipt.extracted_data.amount,
          currency: receipt.extracted_data.currency,
          date: receipt.extracted_data.date,
          merchant: receipt.extracted_data.merchant,
          category: receipt.extracted_data.category,
          description: receipt.extracted_data.description,
          confidence: receipt.extracted_data.confidence || 0
        } : undefined
      }));

      return { success: true, data: receipts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get receipts'
      };
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(receiptId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get receipt details first
      const { data: receipt, error: receiptError } = await supabase
        .from('receipt_images')
        .select('file_path')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;

      // Delete from storage
      if (receipt.file_path) {
        await imageStorage.deleteFile(receipt.file_path);
      }

      // Delete from database
      const { error } = await supabase
        .from('receipt_images')
        .delete()
        .eq('id', receiptId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete receipt'
      };
    }
  }

  /**
   * Update extracted data for receipt
   */
  async updateExtractedData(
    receiptId: string, 
    extractedData: Partial<ExtractedReceiptData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('receipt_images')
        .update({
          extracted_data: extractedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', receiptId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update extracted data'
      };
    }
  }

  /**
   * Validate receipt file
   */
  validateReceiptFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please use JPG, PNG, WebP, or PDF'
      };
    }

    return { valid: true };
  }

  /**
   * Process bulk receipt upload
   */
  async processBulkReceipts(
    files: File[], 
    userId: string, 
    claimId?: string
  ): Promise<{ success: boolean; results?: CaptureResult[]; error?: string }> {
    try {
      const results: CaptureResult[] = [];

      for (const file of files) {
        const result = await this.captureReceipt(file, userId, claimId);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      return {
        success: successCount === totalCount,
        results,
        error: successCount < totalCount ? 
          `${totalCount - successCount} of ${totalCount} receipts failed to upload` : 
          undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk receipt processing failed'
      };
    }
  }
}

// Export singleton instance
export const receiptCaptureService = new ReceiptCaptureService();

// Export utility functions
export const captureReceipt = (file: File, userId: string, claimId?: string) =>
  receiptCaptureService.captureReceipt(file, userId, claimId);
export const getClaimReceipts = (claimId: string) =>
  receiptCaptureService.getClaimReceipts(claimId);
export const deleteReceipt = (receiptId: string) =>
  receiptCaptureService.deleteReceipt(receiptId);
export const updateExtractedData = (receiptId: string, extractedData: Partial<ExtractedReceiptData>) =>
  receiptCaptureService.updateExtractedData(receiptId, extractedData);
export const validateReceiptFile = (file: File) =>
  receiptCaptureService.validateReceiptFile(file);
export const processBulkReceipts = (files: File[], userId: string, claimId?: string) =>
  receiptCaptureService.processBulkReceipts(files, userId, claimId);