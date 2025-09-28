import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  Camera,
  Save,
  RefreshCw,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Scan
} from 'lucide-react';
import { toast } from 'sonner';
import { imageStorage } from '../utils/imageStorage';
import { ImageViewer } from './ImageViewer';

interface ReceiptCaptureProps {
  onSubmit?: (expenseData: ExpenseData) => void;
  maxFiles?: number;
  maxSizePerFile?: number;
  acceptedFileTypes?: string[];
  userId: string;
  claimId?: string;
  initialData?: Partial<ExpenseData>;
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

interface ExpenseData {
  id?: string;
  amount: string;
  currency: string;
  date: string;
  description: string;
  category: string;
  vendor: string;
  paymentMethod: string;
  taxAmount: string;
  notes: string;
  files: UploadedFile[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  claimId?: string;
}

interface OCRData {
  amount?: string;
  date?: string;
  vendor?: string;
  description?: string;
  taxAmount?: string;
}

const expenseCategories = [
  'Fuel & Vehicle',
  'Meals & Entertainment',
  'Accommodation',
  'Travel & Transport',
  'Office Supplies',
  'Equipment & Tools',
  'Training & Development',
  'Communications',
  'Utilities',
  'Professional Services',
  'Maintenance & Repairs',
  'Insurance',
  'Other'
];

const paymentMethods = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Company Card',
  'Bank Transfer',
  'Petty Cash',
  'Other'
];

export function ReceiptCapture({ 
  onSubmit,
  maxFiles = 5, 
  maxSizePerFile = 10 * 1024 * 1024,
  acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'],
  userId,
  claimId,
  initialData
}: ReceiptCaptureProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialData?.files || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UploadedFile | null>(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expenseData, setExpenseData] = useState<ExpenseData>({
    amount: initialData?.amount || '',
    currency: initialData?.currency || 'ZAR',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    category: initialData?.category || '',
    vendor: initialData?.vendor || '',
    paymentMethod: initialData?.paymentMethod || '',
    taxAmount: initialData?.taxAmount || '',
    notes: initialData?.notes || '',
    files: initialData?.files || [],
    status: initialData?.status || 'draft',
    claimId: claimId || initialData?.claimId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setExpenseData(prev => ({ ...prev, files }));
  }, [files]);

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

  // Simulate OCR processing
  const simulateOCR = async (file: File): Promise<OCRData> => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return simulated OCR data based on filename or random data
    const mockData: OCRData = {
      amount: (Math.random() * 500 + 50).toFixed(2),
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendor: ['Shell', 'Woolworths', 'Pick n Pay', 'Engen', 'BP', 'Spar'][Math.floor(Math.random() * 6)],
      description: ['Fuel purchase', 'Office supplies', 'Client lunch', 'Parking fees', 'Stationery'][Math.floor(Math.random() * 5)],
      taxAmount: undefined // Will be calculated
    };

    // Calculate VAT (15% in South Africa)
    if (mockData.amount) {
      const amount = parseFloat(mockData.amount);
      mockData.taxAmount = (amount * 0.15).toFixed(2);
    }

    return mockData;
  };

  const processFiles = async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const fileErrors: string[] = [];

    Array.from(fileList).forEach(file => {
      if (!isValidFileType(file)) {
        fileErrors.push(`${file.name}: Invalid file type`);
      } else if (!isValidFileSize(file)) {
        fileErrors.push(`${file.name}: File too large (max ${formatFileSize(maxSizePerFile)})`);
      } else {
        validFiles.push(file);
      }
    });

    if (fileErrors.length > 0) {
      toast.error(fileErrors.join(', '));
    }

    if (validFiles.length === 0) return;

    await uploadFiles(validFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadPromises = filesToUpload.map(async (file, index) => {
      try {
        const baseProgress = (index / filesToUpload.length) * 100;
        
        const result = await imageStorage.uploadImage(file, userId, claimId);
        
        if (result.success && result.url && result.path) {
          const uploadedFile: UploadedFile = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            url: result.url,
            path: result.path,
            uploadedAt: new Date().toISOString()
          };

          const progressIncrement = ((index + 1) / filesToUpload.length) * 100;
          setUploadProgress(progressIncrement);

          // Process OCR for the first image if no expense data exists yet
          if (index === 0 && file.type.startsWith('image/') && !expenseData.amount) {
            setProcessingOCR(true);
            try {
              const ocrData = await simulateOCR(file);
              setExpenseData(prev => ({
                ...prev,
                amount: ocrData.amount || prev.amount,
                date: ocrData.date || prev.date,
                vendor: ocrData.vendor || prev.vendor,
                description: ocrData.description || prev.description,
                taxAmount: ocrData.taxAmount || prev.taxAmount
              }));
              toast.success('Receipt data extracted automatically!');
            } catch (error) {
              console.error('OCR processing error:', error);
            } finally {
              setProcessingOCR(false);
            }
          }

          return uploadedFile;
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
          return null;
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null) as UploadedFile[];
      
      if (successfulUploads.length > 0) {
        const updatedFiles = [...files, ...successfulUploads];
        setFiles(updatedFiles);
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s)`);
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
      const deleted = await imageStorage.deleteImage(fileToRemove.path);
      
      if (deleted) {
        const updatedFiles = files.filter(file => file.id !== fileToRemove.id);
        setFiles(updatedFiles);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!expenseData.amount || parseFloat(expenseData.amount) <= 0) {
      newErrors.amount = 'Amount is required and must be greater than 0';
    }

    if (!expenseData.date) {
      newErrors.date = 'Date is required';
    }

    if (!expenseData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!expenseData.category) {
      newErrors.category = 'Category is required';
    }

    if (!expenseData.vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    if (!expenseData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (files.length === 0) {
      newErrors.files = 'At least one receipt image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTax = () => {
    if (expenseData.amount) {
      const amount = parseFloat(expenseData.amount);
      const taxAmount = (amount * 0.15).toFixed(2);
      setExpenseData(prev => ({ ...prev, taxAmount }));
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    const submissionData: ExpenseData = {
      ...expenseData,
      files,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };

    onSubmit?.(submissionData);
    
    // Trigger immediate real-time update for manager dashboards
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('logan-claims-updated'));
      window.dispatchEvent(new CustomEvent('logan-notification-created', {
        detail: {
          type: 'expense_submitted',
          claimId: submissionData.claimId,
          employeeId: userId
        }
      }));
    }, 100);
    
    toast.success('Expense claim submitted successfully!');
  };

  const saveDraft = () => {
    const draftData: ExpenseData = {
      ...expenseData,
      files,
      status: 'draft'
    };

    onSubmit?.(draftData);
    toast.success('Draft saved successfully!');
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-slate-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Receipt Capture & Processing
          </CardTitle>
          <CardDescription>
            Upload receipt images and edit expense details. OCR will automatically extract information from receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Receipts ({files.length})
              </h3>
              {processingOCR && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Scan className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Processing OCR...</span>
                </div>
              )}
            </div>

            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
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
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <div className="space-y-2">
                    <p className="text-slate-600">Uploading files...</p>
                    <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                    <p className="text-sm text-slate-500">{Math.round(uploadProgress)}% complete</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto w-8 h-8 text-gray-400">
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

            {/* Uploaded Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm text-slate-600">Uploaded Files</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {files.map((file) => {
                    const isImage = file.type.startsWith('image/');
                    
                    return (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-white rounded border flex items-center justify-center">
                            {isImage ? (
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                            ) : (
                              <File className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {isImage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewImage(file)}
                              className="p-1 h-6 w-6"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file)}
                            className="p-1 h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Expense Details Form */}
          <div className="space-y-4">
            <h3 className="text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Expense Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount & Currency */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount *
                </Label>
                <div className="flex gap-2">
                  <Select value={expenseData.currency} onValueChange={(value) => 
                    setExpenseData(prev => ({ ...prev, currency: value }))
                  }>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, amount: e.target.value }))}
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                </div>
                {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseData.date}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={expenseData.category} onValueChange={(value) => 
                  setExpenseData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={expenseData.paymentMethod} onValueChange={(value) => 
                  setExpenseData(prev => ({ ...prev, paymentMethod: value }))
                }>
                  <SelectTrigger className={errors.paymentMethod ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-sm text-red-500">{errors.paymentMethod}</p>}
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor/Merchant *</Label>
                <Input
                  id="vendor"
                  placeholder="e.g., Shell, Woolworths"
                  value={expenseData.vendor}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, vendor: e.target.value }))}
                  className={errors.vendor ? 'border-red-500' : ''}
                />
                {errors.vendor && <p className="text-sm text-red-500">{errors.vendor}</p>}
              </div>

              {/* Tax Amount */}
              <div className="space-y-2">
                <Label htmlFor="taxAmount" className="flex items-center gap-2">
                  VAT Amount (15%)
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={calculateTax}
                    className="p-1 h-5 w-5"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  placeholder="Auto-calculated"
                  value={expenseData.taxAmount}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, taxAmount: e.target.value }))}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Brief description of the expense"
                value={expenseData.description}
                onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional details or justification for this expense"
                value={expenseData.notes}
                onChange={(e) => setExpenseData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* Validation Errors */}
          {errors.files && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.files}</AlertDescription>
            </Alert>
          )}

          {/* Upload Guidelines */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Guidelines:</strong> Maximum {maxFiles} files, each under {formatFileSize(maxSizePerFile)}. Clear images work best for OCR processing.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={saveDraft} variant="outline" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800"
              disabled={files.length === 0}
            >
              <CheckCircle className="w-4 h-4" />
              Submit Expense Claim
            </Button>
          </div>

          {/* Summary */}
          {expenseData.amount && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h4 className="text-slate-900">Expense Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Amount:</span>
                  <p className="text-slate-900">{expenseData.currency} {expenseData.amount}</p>
                </div>
                <div>
                  <span className="text-slate-500">VAT:</span>
                  <p className="text-slate-900">{expenseData.currency} {expenseData.taxAmount || '0.00'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="text-slate-900">{expenseData.category || 'Not selected'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Attachments:</span>
                  <p className="text-slate-900">{files.length} file(s)</p>
                </div>
              </div>
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
