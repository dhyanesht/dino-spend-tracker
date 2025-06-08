
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';

const CSVImporter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const { toast } = useToast();
  const addTransactionMutation = useAddTransaction();
  const { data: categories = [] } = useCategories();

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 3) continue;
      
      const transaction: any = {};
      headers.forEach((header, index) => {
        transaction[header] = values[index] || '';
      });
      
      // Try to map common CSV formats
      const description = transaction.description || transaction.memo || transaction.payee || transaction.merchant || values[0];
      const amount = Math.abs(parseFloat(transaction.amount || transaction.debit || transaction.withdrawal || values[1]));
      const date = transaction.date || transaction['transaction date'] || values[2];
      
      if (description && !isNaN(amount) && date) {
        // Simple category matching
        let category = 'Miscellaneous';
        const desc = description.toLowerCase();
        
        if (desc.includes('starbucks') || desc.includes('coffee') || desc.includes('restaurant')) {
          category = 'Food & Dining';
        } else if (desc.includes('gas') || desc.includes('uber') || desc.includes('lyft')) {
          category = 'Transportation';
        } else if (desc.includes('grocery') || desc.includes('market')) {
          category = 'Groceries';
        } else if (desc.includes('netflix') || desc.includes('movie') || desc.includes('entertainment')) {
          category = 'Entertainment';
        } else if (desc.includes('amazon') || desc.includes('shop')) {
          category = 'Shopping';
        }
        
        // Check if category exists in our database
        const existingCategory = categories.find(cat => cat.name === category);
        if (!existingCategory && categories.length > 0) {
          category = categories[0].name; // Default to first category
        }
        
        transactions.push({
          description,
          amount,
          category,
          date: new Date(date).toISOString().split('T')[0],
          type: 'expense' as const
        });
      }
    }
    
    return transactions;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const text = await file.text();
      const transactions = parseCSV(text);

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Import transactions to database
      let importedCount = 0;
      for (const transaction of transactions) {
        try {
          await addTransactionMutation.mutateAsync(transaction);
          importedCount++;
        } catch (error) {
          console.error('Failed to import transaction:', error);
        }
      }

      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploadResults({
          fileName: file.name,
          totalTransactions: transactions.length,
          newTransactions: importedCount,
          duplicates: transactions.length - importedCount,
          provider: 'CSV File',
          categorized: importedCount,
          needsReview: 0
        });
        setIsProcessing(false);
        toast({
          title: "CSV Import Successful",
          description: `Imported ${importedCount} transactions from ${file.name}`,
        });
      }, 1000);
    } catch (error) {
      setIsProcessing(false);
      toast({
        title: "Import Failed",
        description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive",
      });
    }
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
                Select a CSV file with columns for description, amount, and date
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
                <p>Expected format: Description, Amount, Date</p>
                <p>Supported formats: Chase, Bank of America, Wells Fargo, and more</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold">Processing CSV File</h3>
                <p className="text-slate-600">Analyzing transactions and importing to database...</p>
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
                    <span className="text-slate-600">Total Found:</span>
                    <p className="font-medium">{uploadResults.totalTransactions}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Successfully Imported:</span>
                    <p className="font-medium text-green-600">{uploadResults.newTransactions}</p>
                  </div>
                  {uploadResults.duplicates > 0 && (
                    <>
                      <div>
                        <span className="text-slate-600">Failed/Duplicates:</span>
                        <p className="font-medium text-orange-600">{uploadResults.duplicates}</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>

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
