import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Trash2,
  Download,
  Camera
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { imageStorage } from '../utils/imageStorage';
import { cloudReceiptStorage } from '../utils/cloudReceiptStorage';
import { ImageViewer } from './ImageViewer';

interface ReceiptUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in bytes
  acceptedFileTypes?: string[];
  userId: string;
  claimId?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: string;
}

export function ReceiptUpload({ 
  onUploadComplete, 
  maxFiles = 5, 
  maxSizePerFile = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  userId,
  claimId
}: ReceiptUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isValidFileType = (file: File): boolean => {
    return acceptedFileTypes.includes(file.type);
  };

  const isValidFileSize = (file: File): boolean => {
    return file.size <= maxSizePerFile;
  };

  const processFiles = async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach(file => {
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Invalid file type`);
      } else if (!isValidFileSize(file)) {
        errors.push(`${file.name}: File too large (max ${formatFileSize(maxSizePerFile)})`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join(', '));
    }

    if (validFiles.length === 0) return;

    await uploadFiles(validFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadPromises = filesToUpload.map(async (file, index) => {
      try {
        // Update progress for individual files
        const baseProgress = (index / filesToUpload.length) * 100;
        setUploadProgress(baseProgress);
        
        // Enhanced cloud upload with multiple backup locations
        const cloudResult = await cloudReceiptStorage.uploadReceipt(file, {
          claimId: claimId || `temp_${Date.now()}`,
          employeeId: userId,
          generateThumbnail: file.type.startsWith('image/'),
          enableOCR: file.type.startsWith('image/'),
          backupToMultipleLocations: true
        });

        let uploadedFile: UploadedFile | null = null;

        if (cloudResult.success && cloudResult.data) {
          // Use cloud storage result
          uploadedFile = {
            id: cloudResult.data.id,
            name: file.name,
            size: file.size,
            type: file.type,
            url: cloudResult.data.cloudUrl || cloudResult.data.localUrl || '',
            path: cloudResult.data.cloudUrl || cloudResult.data.localUrl || '',
            uploadedAt: cloudResult.data.uploadedAt
          };

          // Show OCR results if available
          if (cloudResult.data.ocrData && cloudResult.data.ocrData.detectedFields) {
            toast.success(`Receipt uploaded with OCR data detected`, {
              description: `Vendor: ${cloudResult.data.ocrData.detectedFields.vendor || 'N/A'}, Amount: ${cloudResult.data.ocrData.detectedFields.currency || 'R'} ${cloudResult.data.ocrData.detectedFields.amount || 'N/A'}`,
              duration: 7000
            });
          }
        } else {
          // Fallback to original image storage
          console.log('Cloud upload failed, falling back to legacy storage:', cloudResult.error);
          const fallbackResult = await imageStorage.uploadImage(file, userId, claimId);
          
          if (fallbackResult.success && fallbackResult.url && fallbackResult.path) {
            uploadedFile = {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              size: file.size,
              type: file.type,
              url: fallbackResult.url,
              path: fallbackResult.path,
              uploadedAt: new Date().toISOString()
            };
          }
        }

        if (uploadedFile) {
          // Update progress
          const progressIncrement = ((index + 1) / filesToUpload.length) * 100;
          setUploadProgress(progressIncrement);
          return uploadedFile;
        } else {
          toast.error(`Failed to upload ${file.name}: ${cloudResult.error || 'Unknown error'}`);
          return null;
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null) as UploadedFile[];
      
      if (successfulUploads.length > 0) {
        const updatedFiles = [...files, ...successfulUploads];
        setFiles(updatedFiles);
        onUploadComplete?.(updatedFiles);
        
        // Enhanced success notification with cloud backup info
        const cloudBackedUp = successfulUploads.filter(f => !f.url.startsWith('local://') && !f.url.startsWith('data:')).length;
        const localOnly = successfulUploads.length - cloudBackedUp;
        
        let message = `Successfully uploaded ${successfulUploads.length} file(s)`;
        if (cloudBackedUp > 0 && localOnly > 0) {
          message += ` (${cloudBackedUp} cloud, ${localOnly} local backup)`;
        } else if (cloudBackedUp > 0) {
          message += ` with cloud backup`;
        } else {
          message += ` (local storage)`;
        }
        
        toast.success(message, {
          description: 'Files are automatically backed up to multiple locations for redundancy',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Upload batch error:', error);
      toast.error('Some files failed to upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = async (fileToRemove: UploadedFile) => {
    try {
      // Delete from storage
      const deleted = await imageStorage.deleteImage(fileToRemove.path);
      
      if (deleted) {
        const updatedFiles = files.filter(file => file.id !== fileToRemove.id);
        setFiles(updatedFiles);
        onUploadComplete?.(updatedFiles);
        toast.success('File removed successfully');
      } else {
        toast.error('Failed to remove file from storage');
      }
    } catch (error) {
      console.error('Remove file error:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDrag = (e: React.DragEvent, active: boolean) => {
    e.preventDefault();
    setDragActive(active);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const viewImage = (file: UploadedFile) => {
    setSelectedImage(file);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Receipt Upload
          </CardTitle>
          <CardDescription>
            Upload receipt images or PDF documents. Max {maxFiles} files, {formatFileSize(maxSizePerFile)} each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : uploading 
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onClick={!uploading ? openFileDialog : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFileTypes.join(',')}
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <div className="space-y-2">
                  <p className="text-slate-600">Uploading files...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-sm text-slate-500">{Math.round(uploadProgress)}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-gray-400">
                  {dragActive ? <Upload className="w-full h-full" /> : <Camera className="w-full h-full" />}
                </div>
                <div>
                  <p className="text-slate-900 mb-1">
                    {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500">
                    PNG, JPG, WEBP or PDF up to {formatFileSize(maxSizePerFile)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-slate-900">Uploaded Files ({files.length})</h4>
              <div className="space-y-2">
                {files.map((file) => {
                  const isImage = file.type.startsWith('image/');
                  
                  return (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded border flex items-center justify-center">
                          {isImage ? (
                            <ImageIcon className="w-5 h-5 text-blue-500" />
                          ) : (
                            <File className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 truncate">{file.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <span>{formatFileSize(file.size)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {file.type.split('/')[1].toUpperCase()}
                            </Badge>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {isImage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewImage(file)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Limits Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Upload Guidelines:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Maximum {maxFiles} files per claim</li>
                <li>Each file must be under {formatFileSize(maxSizePerFile)}</li>
                <li>Supported formats: JPEG, PNG, WEBP, PDF</li>
                <li>Clear, readable images work best for OCR processing</li>
              </ul>
            </AlertDescription>
          </Alert>

          {files.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-slate-600">
                  {files.length} file{files.length !== 1 ? 's' : ''} uploaded successfully
                </span>
              </div>
              <Badge variant="outline">
                Total: {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          filename={selectedImage.name}
          title={`Receipt - ${selectedImage.name}`}
          metadata={{
            claimId: claimId,
            uploadedBy: userId,
            uploadDate: selectedImage.uploadedAt,
            fileSize: selectedImage.size
          }}
        />
      )}
    </>
  );
}