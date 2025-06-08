
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CSVImporter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate file processing
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // Simulate processing results
          setTimeout(() => {
            setUploadResults({
              fileName: file.name,
              totalTransactions: 127,
              newTransactions: 115,
              duplicates: 12,
              provider: 'Chase Bank',
              categorized: 98,
              needsReview: 17
            });
            setIsProcessing(false);
            toast({
              title: "CSV Import Successful",
              description: `Imported 115 new transactions from ${file.name}`,
            });
          }, 1000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetImporter = () => {
    setUploadProgress(0);
    setIsProcessing(false);
    setUploadResults(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Financial Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {!uploadResults && !isProcessing && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Your CSV File</h3>
              <p className="text-slate-600 mb-4">
                Select a CSV file from your bank or credit card provider
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild className="cursor-pointer">
                  <span>Choose File</span>
                </Button>
              </label>
              <div className="mt-4 text-sm text-slate-500">
                <p>Supported formats: Chase, Bank of America, Wells Fargo, Discover, and more</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">Processing CSV File</h3>
                <p className="text-slate-600">Analyzing transactions and detecting provider...</p>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-center text-sm text-slate-500">{uploadProgress}% complete</p>
            </div>
          )}

          {uploadResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Import Successful!</span>
              </div>

              <Card className="p-4">
                <h4 className="font-semibold mb-3">Import Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">File:</span>
                    <p className="font-medium">{uploadResults.fileName}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Provider:</span>
                    <p className="font-medium">{uploadResults.provider}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Total Transactions:</span>
                    <p className="font-medium">{uploadResults.totalTransactions}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">New Transactions:</span>
                    <p className="font-medium text-green-600">{uploadResults.newTransactions}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Duplicates Ignored:</span>
                    <p className="font-medium text-orange-600">{uploadResults.duplicates}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Auto-Categorized:</span>
                    <p className="font-medium text-blue-600">{uploadResults.categorized}</p>
                  </div>
                </div>
              </Card>

              {uploadResults.needsReview > 0 && (
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-2 text-orange-700 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Needs Your Review</span>
                  </div>
                  <p className="text-sm text-orange-600">
                    {uploadResults.needsReview} transactions need category assignment. 
                    Would you like to review them now?
                  </p>
                  <Button size="sm" className="mt-3">Review Transactions</Button>
                </Card>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  View Dashboard
                </Button>
                <Button variant="outline" onClick={resetImporter}>
                  Import Another File
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImporter;
