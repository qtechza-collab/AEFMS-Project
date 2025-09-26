import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Download, ZoomIn, ZoomOut, RotateCw, Eye, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ReceiptFile {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  upload_type?: string;
  created_at?: string;
}

interface EnhancedReceiptViewerProps {
  files: ReceiptFile[];
  isOpen: boolean;
  onClose: () => void;
  claimId?: string;
  claimAmount?: number;
  claimDescription?: string;
}

export function EnhancedReceiptViewer({
  files,
  isOpen,
  onClose,
  claimId,
  claimAmount,
  claimDescription
}: EnhancedReceiptViewerProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentFile = files[currentFileIndex];

  useEffect(() => {
    if (isOpen) {
      setCurrentFileIndex(0);
      setZoom(1);
      setRotation(0);
      setImageError(false);
    }
  }, [isOpen]);

  const handleDownload = async (file: ReceiptFile) => {
    try {
      setLoading(true);
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${file.filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImage = (fileType: string): boolean => {
    return fileType.startsWith('image/');
  };

  const isPDF = (fileType: string): boolean => {
    return fileType === 'application/pdf';
  };

  const nextFile = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setZoom(1);
      setRotation(0);
      setImageError(false);
    }
  };

  const prevFile = () => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
      setZoom(1);
      setRotation(0);
      setImageError(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
  };

  if (!files || files.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Receipt Viewer
              </DialogTitle>
              {claimAmount && (
                <Badge variant="secondary" className="text-lg font-semibold">
                  R{claimAmount.toLocaleString()}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {claimDescription && (
            <p className="text-sm text-muted-foreground">{claimDescription}</p>
          )}
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* File List Sidebar */}
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <div className="space-y-2">
              {files.map((file, index) => (
                <Card
                  key={file.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    index === currentFileIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setCurrentFileIndex(index);
                    setZoom(1);
                    setRotation(0);
                    setImageError(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {isImage(file.file_type) ? (
                          <ImageIcon className="h-8 w-8 text-blue-500" />
                        ) : isPDF(file.file_type) ? (
                          <FileText className="h-8 w-8 text-red-500" />
                        ) : (
                          <FileText className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={file.filename}>
                          {file.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {file.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </span>
                        </div>
                        {file.created_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Main Viewer */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevFile}
                  disabled={currentFileIndex === 0}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  {currentFileIndex + 1} of {files.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextFile}
                  disabled={currentFileIndex === files.length - 1}
                >
                  Next
                </Button>
              </div>

              {currentFile && (
                <div className="flex items-center gap-2">
                  {isImage(currentFile.file_type) && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">
                        {Math.round(zoom * 100)}%
                      </span>
                      <Button variant="outline" size="sm" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleRotate}>
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={resetView}>
                        Reset
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(currentFile)}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {loading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              )}
            </div>

            {/* File Display Area */}
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
              {currentFile && (
                <div className="h-full flex items-center justify-center p-4">
                  {isImage(currentFile.file_type) ? (
                    <div
                      className="max-w-full max-h-full overflow-auto"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-in-out'
                      }}
                    >
                      {!imageError ? (
                        <img
                          src={currentFile.file_url}
                          alt={currentFile.filename}
                          className="max-w-full max-h-full object-contain shadow-lg rounded"
                          onError={() => setImageError(true)}
                          onLoad={() => setImageError(false)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-2">Failed to load image</p>
                          <p className="text-sm text-gray-500">{currentFile.filename}</p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => handleDownload(currentFile)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : isPDF(currentFile.file_type) ? (
                    <div className="w-full h-full">
                      <iframe
                        src={currentFile.file_url}
                        className="w-full h-full border-0 rounded"
                        title={currentFile.filename}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <FileText className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">Preview not available</p>
                      <p className="text-sm text-gray-500 mb-4">{currentFile.filename}</p>
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(currentFile)}
                        disabled={loading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {loading ? 'Downloading...' : 'Download File'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}