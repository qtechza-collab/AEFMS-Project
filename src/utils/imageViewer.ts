import { supabase } from './supabase/client';

export interface ImageViewerConfig {
  showThumbnails: boolean;
  allowZoom: boolean;
  allowRotation: boolean;
  showMetadata: boolean;
  downloadEnabled: boolean;
}

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  dimensions: { width: number; height: number };
  uploadedAt: string;
  extractedText?: string;
}

/**
 * Logan Freights Image Viewer Service
 */
class ImageViewerService {
  
  async getImageMetadata(imageUrl: string): Promise<{ success: boolean; metadata?: ImageMetadata; error?: string }> {
    try {
      // Extract metadata from image
      const metadata = await this.extractMetadata(imageUrl);
      return { success: true, metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metadata'
      };
    }
  }

  private async extractMetadata(imageUrl: string): Promise<ImageMetadata> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          fileName: 'image.jpg',
          fileSize: 0,
          dimensions: { width: img.width, height: img.height },
          uploadedAt: new Date().toISOString()
        });
      };
      img.onerror = () => {
        resolve({
          fileName: 'image.jpg',
          fileSize: 0,
          dimensions: { width: 0, height: 0 },
          uploadedAt: new Date().toISOString()
        });
      };
      img.src = imageUrl;
    });
  }
}

export const imageViewerService = new ImageViewerService();