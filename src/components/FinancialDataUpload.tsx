import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { dataService } from '../utils/supabaseDataService';

interface FinancialData {
  revenue?: number;
  expenses?: number;
  net_profit?: number;
  gross_profit?: number;
  operating_expenses?: number;
  tax_expense?: number;
  cost_of_sales?: number;
  administrative_expenses?: number;
  other_income?: number;
  finance_costs?: number;
}

interface FinancialDataUploadProps {
  onUploadComplete?: (financial: any) => void;
}

export function FinancialDataUpload({ onUploadComplete }: FinancialDataUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fiscalYear, setFiscalYear] = useState<string>('');
  const [period, setPeriod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [financialData, setFinancialData] = useState<FinancialData>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const periods = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select an Excel file (.xlsx, .xls) or CSV file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setUploadSuccess(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFinancialDataChange = (field: keyof FinancialData, value: string) => {
    const numericValue = value ? parseFloat(value) : undefined;
    setFinancialData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const validateForm = (): boolean => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return false;
    }

    if (!fiscalYear) {
      toast.error('Please select a fiscal year');
      return false;
    }

    if (!period) {
      toast.error('Please select a period');
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;

    setIsUploading(true);
    try {
      const result = await dataService.uploadFinancialData(
        selectedFile!,
        parseInt(fiscalYear),
        period,
        financialData,
        notes
      );

      setUploadSuccess(true);
      toast.success('Financial data uploaded successfully');
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }

      // Reset form
      setSelectedFile(null);
      setFiscalYear('');
      setPeriod('');
      setNotes('');
      setFinancialData({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload financial data');
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Financial Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div>
            <Label htmlFor="financial-file">Financial Spreadsheet</Label>
            <div className="mt-2">
              <input
                id="financial-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {!selectedFile ? (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Excel (.xlsx, .xls) or CSV files, up to 10MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Period Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fiscal-year">Fiscal Year</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manual Financial Data Entry */}
          <div>
            <Label className="text-base font-medium">Financial Data (Optional)</Label>
            <p className="text-sm text-gray-500 mb-4">
              You can manually enter key financial figures here, or leave blank if the data is only in the spreadsheet.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="revenue">Revenue (ZAR)</Label>
                <Input
                  id="revenue"
                  type="number"
                  placeholder="0.00"
                  value={financialData.revenue || ''}
                  onChange={(e) => handleFinancialDataChange('revenue', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="expenses">Total Expenses (ZAR)</Label>
                <Input
                  id="expenses"
                  type="number"
                  placeholder="0.00"
                  value={financialData.expenses || ''}
                  onChange={(e) => handleFinancialDataChange('expenses', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="gross-profit">Gross Profit (ZAR)</Label>
                <Input
                  id="gross-profit"
                  type="number"
                  placeholder="0.00"
                  value={financialData.gross_profit || ''}
                  onChange={(e) => handleFinancialDataChange('gross_profit', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="net-profit">Net Profit (ZAR)</Label>
                <Input
                  id="net-profit"
                  type="number"
                  placeholder="0.00"
                  value={financialData.net_profit || ''}
                  onChange={(e) => handleFinancialDataChange('net_profit', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="operating-expenses">Operating Expenses (ZAR)</Label>
                <Input
                  id="operating-expenses"
                  type="number"
                  placeholder="0.00"
                  value={financialData.operating_expenses || ''}
                  onChange={(e) => handleFinancialDataChange('operating_expenses', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="tax-expense">Tax Expense (ZAR)</Label>
                <Input
                  id="tax-expense"
                  type="number"
                  placeholder="0.00"
                  value={financialData.tax_expense || ''}
                  onChange={(e) => handleFinancialDataChange('tax_expense', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Summary Display */}
          {(financialData.revenue || financialData.expenses || financialData.net_profit) && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Financial Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {financialData.revenue && (
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(financialData.revenue)}
                    </p>
                  </div>
                )}
                {financialData.expenses && (
                  <div>
                    <p className="text-gray-600">Expenses</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(financialData.expenses)}
                    </p>
                  </div>
                )}
                {financialData.net_profit && (
                  <div>
                    <p className="text-gray-600">Net Profit</p>
                    <p className={`font-semibold ${financialData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialData.net_profit)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this financial data upload..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Success Alert */}
          {uploadSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Financial data uploaded successfully! The data is now available in the system.
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="min-w-32"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Financial Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Upload Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900">Supported File Formats:</h4>
              <p>Excel files (.xlsx, .xls) and CSV files are supported.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">File Requirements:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Maximum file size: 10MB</li>
                <li>Include all relevant financial data in the spreadsheet</li>
                <li>Use clear column headers for easy identification</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Data Integration:</h4>
              <p>
                Uploaded financial data will be integrated with expense claims for comprehensive 
                financial reporting and IFRS compliance tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}