import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
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
  User,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  Shield,
  Flag,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface ReviewAction {
  id: string;
  action: 'approved' | 'rejected' | 'request_changes';
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: string;
  comments?: string;
  timestamp: string;
}

interface EnhancedImageViewerProps {
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
    status?: 'pending' | 'approved' | 'rejected' | 'under_review';
    uploaderId?: string;
    uploaderRole?: string;
  };
  currentUser?: {
    id: string;
    name: string;
    role: 'employee' | 'employer' | 'hr' | 'administrator';
    hierarchyLevel?: number;
  };
  onReview?: (action: 'approved' | 'rejected' | 'request_changes', comments?: string) => Promise<void>;
  canReview?: boolean;
  reviewHistory?: ReviewAction[];
}

export function EnhancedImageViewer({ 
  isOpen, 
  onClose, 
  imageUrl, 
  filename, 
  title,
  metadata,
  currentUser,
  onReview,
  canReview = false,
  reviewHistory = []
}: EnhancedImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'request_changes'>('approved');
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const handleSubmitReview = async () => {
    if (!onReview || !currentUser) return;

    if (reviewAction === 'rejected' && !reviewComments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await onReview(reviewAction, reviewComments);
      toast.success(`Image ${reviewAction} successfully`);
      setShowReviewPanel(false);
      setReviewComments('');
      onClose();
    } catch (error) {
      console.error('Review submission failed:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
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
    setShowReviewPanel(false);
    setReviewComments('');
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'under_review':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canUserReview = () => {
    if (!currentUser || !metadata) return false;
    
    // User cannot review their own uploads
    if (currentUser.id === metadata.uploaderId) return false;
    
    // Check hierarchy - reviewers must have appropriate role
    const roleHierarchy = {
      'employee': 1,
      'employer': 2,
      'hr': 3,
      'administrator': 4
    };
    
    const currentUserLevel = roleHierarchy[currentUser.role];
    const uploaderLevel = metadata.uploaderRole ? roleHierarchy[metadata.uploaderRole as keyof typeof roleHierarchy] : 1;
    
    return currentUserLevel > uploaderLevel && canReview;
  };

  useEffect(() => {
    if (isOpen) {
      resetImageState();
    }
  }, [isOpen, imageUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-slate-900 flex items-center text-lg truncate">
                <FileImage className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="truncate">{title || filename || 'Receipt View'}</span>
                {metadata?.status && (
                  <Badge variant="outline" className={`ml-3 ${getStatusColor(metadata.status)}`}>
                    {getStatusIcon(metadata.status)}
                    <span className="ml-1">{metadata.status.toUpperCase()}</span>
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center">
                <span>Hierarchical image review system</span>
                {canUserReview() && (
                  <Badge variant="outline" className="ml-2 text-blue-700 bg-blue-50">
                    <Shield className="w-3 h-3 mr-1" />
                    Review Access
                  </Badge>
                )}
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

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 pt-4 h-[calc(95vh-120px)] overflow-hidden">
          {/* Image Display Area */}
          <div className="lg:col-span-3 relative bg-slate-50 rounded-lg overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-1 bg-white rounded-lg p-2 shadow-md border border-slate-200">
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

            {/* Review Actions */}
            {canUserReview() && metadata?.status === 'pending' && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  onClick={() => setShowReviewPanel(!showReviewPanel)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Review Image
                </Button>
              </div>
            )}

            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              {isLoading && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                  <p className="text-sm text-slate-500">Loading image...</p>
                </div>
              )}

              {hasError && (
                <div className="flex flex-col items-center space-y-2 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400" />
                  <h3 className="text-slate-600">Unable to load image</h3>
                  <p className="text-sm text-slate-500">
                    The image file may be corrupted or unavailable
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHasError(false);
                      setIsLoading(true);
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {!isLoading && !hasError && (
                <img
                  src={imageUrl}
                  alt={title || filename || 'Receipt'}
                  className="max-w-none max-h-none object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>
          </div>

          {/* Metadata and Review Panel */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto min-h-0 max-h-full">
            {/* File Details */}
            <div className="bg-white rounded-lg p-4 border">
              <h3 className="text-slate-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                File Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Filename</p>
                  <p className="text-sm text-slate-900 break-all">{filename || 'Unknown'}</p>
                </div>
                
                {metadata?.fileSize && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">File Size</p>
                    <p className="text-sm text-slate-900">{formatFileSize(metadata.fileSize)}</p>
                  </div>
                )}

                {metadata?.uploadDate && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Upload Date</p>
                    <p className="text-sm text-slate-900 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(metadata.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {metadata?.uploadedBy && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Uploaded By</p>
                    <p className="text-sm text-slate-900 flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      {metadata.uploadedBy}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Expense Details */}
            {metadata && (metadata.claimId || metadata.amount || metadata.expenseDate || metadata.description) && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="text-slate-900 mb-3 flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  Expense Details
                </h3>
                <div className="space-y-3">
                  {metadata.claimId && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Claim ID</p>
                      <Badge variant="outline" className="text-xs">
                        {metadata.claimId}
                      </Badge>
                    </div>
                  )}

                  {metadata.amount && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Amount</p>
                      <p className="text-slate-900">R {metadata.amount}</p>
                    </div>
                  )}

                  {metadata.expenseDate && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Expense Date</p>
                      <p className="text-sm text-slate-900">
                        {new Date(metadata.expenseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {metadata.description && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Description</p>
                      <p className="text-sm text-slate-900">{metadata.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Panel */}
            {showReviewPanel && canUserReview() && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-slate-900 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Review Image
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="review-action">Review Decision</Label>
                    <Select value={reviewAction} onValueChange={(value: any) => setReviewAction(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Approve
                          </div>
                        </SelectItem>
                        <SelectItem value="request_changes">
                          <div className="flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2 text-yellow-600" />
                            Request Changes
                          </div>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <div className="flex items-center">
                            <XCircle className="w-4 h-4 mr-2 text-red-600" />
                            Reject
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="review-comments">
                      Comments {reviewAction === 'rejected' && <span className="text-red-600">*</span>}
                    </Label>
                    <Textarea
                      id="review-comments"
                      placeholder={
                        reviewAction === 'approved' ? 'Optional approval comments...' :
                        reviewAction === 'rejected' ? 'Please explain why this is being rejected...' :
                        'What changes are needed?...'
                      }
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview || (reviewAction === 'rejected' && !reviewComments.trim())}
                      className="flex-1"
                    >
                      {isSubmittingReview ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      Submit Review
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewPanel(false)}
                      disabled={isSubmittingReview}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Review History */}
            {reviewHistory.length > 0 && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="text-slate-900 mb-3 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Review History
                </h3>
                <div className="space-y-3">
                  {reviewHistory.map((review) => (
                    <div key={review.id} className="border-l-4 border-blue-200 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-900">{review.reviewer_name}</span>
                        <Badge variant="outline" className={getStatusColor(review.action)}>
                          {review.action.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">{review.reviewer_role} • {new Date(review.timestamp).toLocaleDateString()}</p>
                      {review.comments && (
                        <p className="text-sm text-slate-700 mt-1">{review.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-slate-900 mb-2">Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetImageState}
                  className="w-full justify-start"
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
