import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileImage, 
  AlertCircle,
  Eye,
  Calendar,
  FileText,
  User
} from 'lucide-react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename?: string;
  title?: string;
  metadata?: {
    uploadDate?: string;
    fileSize?: number;
    uploadedBy?: string;
    description?: string;
    claimId?: string;
    amount?: string;
    expenseDate?: string;
  };
}

export function ImageViewer({ 
  isOpen, 
  onClose, 
  imageUrl, 
  filename, 
  title,
  metadata 
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename || 'receipt.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const resetImageState = () => {
    setZoom(100);
    setRotation(0);
    setIsLoading(true);
    setHasError(false);
  };

  React.useEffect(() => {
    if (isOpen) {
      resetImageState();
    }
  }, [isOpen, imageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-slate-900 flex items-center text-lg truncate">
                <FileImage className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="truncate">{title || filename || 'Receipt View'}</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                View and download receipt image
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-4 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6 lg:pt-4 min-h-[600px] lg:min-h-[calc(95vh-120px)] max-h-[calc(95vh-120px)]">
          {/* Image Display Area */}
          <div className="flex-1 lg:flex-[3] relative bg-slate-50 rounded-lg overflow-hidden min-h-[400px] lg:min-h-0 border border-slate-200 shadow-sm">
            {/* Toolbar */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1 bg-white rounded-lg p-1.5 sm:p-2 shadow-lg border border-slate-200 backdrop-blur-sm bg-white/95">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600 px-2">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-slate-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center p-3 sm:p-4 overflow-auto scroll-smooth">
              {isLoading && (
                <div className="flex flex-col items-center space-y-3 p-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-1">Loading image...</p>
                    <p className="text-xs text-slate-400">Please wait while we load your receipt</p>
                  </div>
                </div>
              )}

              {hasError && (
                <div className="flex flex-col items-center space-y-4 text-center p-8 max-w-sm mx-auto">
                  <AlertCircle className="w-16 h-16 text-slate-400" />
                  <div className="space-y-2">
                    <h3 className="text-slate-700 text-lg">Unable to load image</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      The image file may be corrupted, unavailable, or there might be a network issue. 
                      You can try loading it again or download the file directly.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHasError(false);
                        setIsLoading(true);
                      }}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleDownload}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && !hasError && (
                <img
                  src={imageUrl}
                  alt={title || filename || 'Receipt image'}
                  className="max-w-none max-h-none object-contain transition-all duration-300 ease-in-out shadow-sm"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  loading="eager"
                  decoding="async"
                />
              )}
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-3 sm:space-y-4 overflow-y-auto max-h-[300px] lg:max-h-full">
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 mb-4 flex items-center text-base font-medium">
                <FileText className="w-4 h-4 mr-2 text-slate-600" />
                File Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Filename</p>
                  <p className="text-sm text-slate-900 break-all font-medium">{filename || 'Unknown'}</p>
                </div>
                
                {metadata?.fileSize && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">File Size</p>
                    <p className="text-sm text-slate-900 font-medium">{formatFileSize(metadata.fileSize)}</p>
                  </div>
                )}

                {metadata?.uploadDate && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Upload Date</p>
                    <p className="text-sm text-slate-900 flex items-center font-medium">
                      <Calendar className="w-3 h-3 mr-1.5 text-slate-500" />
                      {new Date(metadata.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {metadata?.uploadedBy && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Uploaded By</p>
                    <p className="text-sm text-slate-900 flex items-center font-medium">
                      <User className="w-3 h-3 mr-1.5 text-slate-500" />
                      {metadata.uploadedBy}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {metadata && (metadata.claimId || metadata.amount || metadata.expenseDate || metadata.description) && (
              <div className="bg-white rounded-lg p-4 sm:p-5 border border-slate-200 shadow-sm">
                <h3 className="text-slate-900 mb-4 flex items-center text-base font-medium">
                  <Eye className="w-4 h-4 mr-2 text-slate-600" />
                  Expense Details
                </h3>
                <div className="space-y-4">
                  {metadata.claimId && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Claim ID</p>
                      <Badge variant="outline" className="text-xs font-medium">
                        {metadata.claimId}
                      </Badge>
                    </div>
                  )}

                  {metadata.amount && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Amount</p>
                      <p className="text-base text-slate-900 font-semibold">R {metadata.amount}</p>
                    </div>
                  )}

                  {metadata.expenseDate && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Expense Date</p>
                      <p className="text-sm text-slate-900 font-medium">
                        {new Date(metadata.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {metadata.description && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-slate-900 leading-relaxed">{metadata.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4 sm:p-5 border border-slate-100">
              <h3 className="text-slate-900 mb-3 text-base font-medium">Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full justify-start hover:bg-slate-100 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImageState}
                  className="w-full justify-start hover:bg-slate-100 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Reset View
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}