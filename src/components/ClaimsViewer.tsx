import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  FileText, 
  Download, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  X,
  Calendar,
  DollarSign,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

export interface Claim {
  id: string;
  employee_id: string;
  employee_name: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  receipt_url?: string;
  receipt_filename?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  manager_comments?: string;
  tax_amount?: number;
  fraud_score?: number;
  fraud_flags?: string[];
  is_flagged?: boolean;
}

interface ClaimsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  claim: Claim | null;
  onApprove?: (claimId: string) => void;
  onReject?: (claimId: string, reason: string) => void;
  canManage?: boolean;
  showFraudDetails?: boolean;
}

export function ClaimsViewer({ 
  isOpen, 
  onClose, 
  claim, 
  onApprove, 
  onReject, 
  canManage = false,
  showFraudDetails = false 
}: ClaimsViewerProps) {
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  useEffect(() => {
    if (isOpen && claim) {
      setImageZoom(1);
      setImageRotation(0);
      setRejectionReason('');
    }
  }, [isOpen, claim]);

  if (!claim) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getFraudRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `R ${amount.toFixed(2)}`;
  };

  const handleApprove = async () => {
    if (onApprove && claim.id) {
      try {
        await onApprove(claim.id);
        toast.success('Claim approved successfully');
        onClose();
      } catch (error) {
        toast.error('Failed to approve claim');
      }
    }
  };

  const handleReject = async () => {
    if (onReject && claim.id && rejectionReason.trim()) {
      try {
        await onReject(claim.id, rejectionReason);
        toast.success('Claim rejected successfully');
        setShowRejectionDialog(false);
        onClose();
      } catch (error) {
        toast.error('Failed to reject claim');
      }
    }
  };

  const downloadReceipt = () => {
    if (claim.receipt_url) {
      const link = document.createElement('a');
      link.href = claim.receipt_url;
      link.download = claim.receipt_filename || `receipt-${claim.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  };

  const isPDF = (url: string) => {
    return /\.pdf$/i.test(url);
  };

  const isOfficeDocument = (url: string) => {
    return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url);
  };

  const isTextFile = (url: string) => {
    return /\.(txt|csv|json|xml)$/i.test(url);
  };

  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'xls':
      case 'xlsx': return 'Excel Spreadsheet';
      case 'ppt':
      case 'pptx': return 'PowerPoint Presentation';
      case 'txt': return 'Text File';
      case 'csv': return 'CSV File';
      case 'json': return 'JSON File';
      case 'xml': return 'XML File';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp': return 'Image File';
      default: return 'Document';
    }
  };

  const getPreviewUrl = (url: string) => {
    if (isPDF(url)) {
      return url;
    }
    if (isOfficeDocument(url)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Expense Claim Details - #{claim.id}
            </DialogTitle>
            <DialogDescription>
              View detailed information, receipt preview, and manage approval status for this expense claim.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-6 h-[calc(90vh-8rem)]">
            {/* Left Panel - Claim Details */}
            <div className="w-1/3 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>Claim Information</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(claim.status)}
                      <Badge className={getStatusColor(claim.status)}>
                        {claim.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{claim.employee_name}</p>
                      <p className="text-xs text-gray-500">Employee ID: {claim.employee_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(claim.amount, claim.currency)}
                      </p>
                      {claim.tax_amount && (
                        <p className="text-xs text-gray-500">
                          Tax: {formatCurrency(claim.tax_amount, claim.currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <p className="text-sm">{claim.category}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm">Expense Date: {new Date(claim.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(claim.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-gray-700">{claim.description}</p>
                  </div>

                  {claim.manager_comments && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-1">Manager Comments</p>
                        <p className="text-sm text-gray-700">{claim.manager_comments}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Fraud Detection Panel */}
              {(showFraudDetails || claim.is_flagged) && (
                <Card className={claim.is_flagged ? 'border-red-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${claim.is_flagged ? 'text-red-600' : 'text-gray-500'}`} />
                      Fraud Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Risk Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (claim.fraud_score || 0) >= 70 ? 'bg-red-500' :
                              (claim.fraud_score || 0) >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${claim.fraud_score || 0}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getFraudRiskColor(claim.fraud_score || 0)}`}>
                          {claim.fraud_score || 0}%
                        </span>
                      </div>
                    </div>

                    {claim.fraud_flags && claim.fraud_flags.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Detected Issues</p>
                        {claim.fraud_flags.map((flag, index) => (
                          <Badge key={index} variant="destructive" className="mr-1 mb-1">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {canManage && claim.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApprove}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => setShowRejectionDialog(true)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>

            {/* Right Panel - Receipt Viewer */}
            <div className="flex-1 border-l border-gray-200 pl-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Receipt</h3>
                <div className="flex items-center gap-2">
                  {claim.receipt_url && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                        disabled={imageZoom <= 0.5}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                        disabled={imageZoom >= 3}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImageRotation((imageRotation + 90) % 360)}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadReceipt}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center overflow-auto">
                {claim.receipt_url ? (
                  <ScrollArea className="w-full h-full">
                    <div className="p-4 flex justify-center">
                      {isImage(claim.receipt_url) ? (
                        <img
                          src={claim.receipt_url}
                          alt="Receipt"
                          className="max-w-full h-auto transition-all duration-200"
                          style={{
                            transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                            transformOrigin: 'center center'
                          }}
                          onLoad={() => setIsImageLoading(false)}
                          onError={() => {
                            setIsImageLoading(false);
                            toast.error('Failed to load receipt image');
                          }}
                        />
                      ) : isPDF(claim.receipt_url) ? (
                        <iframe
                          src={getPreviewUrl(claim.receipt_url)}
                          className="w-full h-[600px] border-0 rounded-lg"
                          title="Receipt PDF"
                          onError={() => toast.error('PDF preview unavailable, please download to view')}
                        />
                      ) : isOfficeDocument(claim.receipt_url) ? (
                        <div className="w-full h-[600px]">
                          <iframe
                            src={getPreviewUrl(claim.receipt_url)}
                            className="w-full h-full border-0 rounded-lg"
                            title={`${getFileType(claim.receipt_url)} Preview`}
                            onError={() => {
                              toast.error('Document preview unavailable, please download to view');
                            }}
                          />
                          <div className="mt-2 text-center">
                            <p className="text-sm text-gray-600">
                              {getFileType(claim.receipt_url)} - Online Preview
                            </p>
                          </div>
                        </div>
                      ) : isTextFile(claim.receipt_url) ? (
                        <div className="w-full max-h-[600px] overflow-auto">
                          <div className="bg-white p-4 rounded-lg border">
                            <div className="mb-2 text-sm text-gray-600 border-b pb-2">
                              {getFileType(claim.receipt_url)} Preview
                            </div>
                            <iframe
                              src={claim.receipt_url}
                              className="w-full h-[500px] border-0"
                              title="Text File Preview"
                              style={{ background: 'white' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center w-full">
                          <div className="bg-white p-6 rounded-lg border shadow-sm max-w-md mx-auto">
                            <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                            <h3 className="font-medium text-gray-900 mb-2">
                              {getFileType(claim.receipt_url)}
                            </h3>
                            <p className="text-gray-600 mb-1">
                              {claim.receipt_filename || 'Receipt Document'}
                            </p>
                            <p className="text-sm text-gray-500 mb-4">
                              File available for download
                            </p>
                            <div className="space-y-2">
                              <Button onClick={downloadReceipt} className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Download to View
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => window.open(claim.receipt_url, '_blank')}
                                className="w-full"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Open in New Tab
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No receipt uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense claim. This information will be sent to the employee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for rejection</label>
              <textarea
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this claim..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectionDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Reject Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}