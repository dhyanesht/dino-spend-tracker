
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAddMultipleTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

interface ParsedTransaction {
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
}

interface ColumnMapping {
  description: number | null;
  amount: number | null;
  category: number | null;
  date: number | null;
  type: number | null;
}

const CSVImporter = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    description: null,
    amount: null,
    category: null,
    date: null,
    type: null,
  });
  const [parseResults, setParseResults] = useState<{
    success: ParsedTransaction[];
    errors: { row: number; error: string; data: string[] }[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addTransactionsMutation = useAddMultipleTransactions();
  const { data: categories = [] } = useCategories();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file (.csv extension required)",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => {
          // Handle CSV parsing with proper quote handling
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        }).filter(row => row.some(cell => cell.length > 0));

        if (rows.length === 0) {
          throw new Error("CSV file is empty or contains no valid data");
        }

        setCsvData(rows);
        setColumnMapping({
          description: null,
          amount: null,
          category: null,
          date: null,
          type: null,
        });
        setParseResults(null);
        setIsDialogOpen(true);

        toast({
          title: "CSV Loaded Successfully",
          description: `Found ${rows.length} rows. Please map the columns to proceed.`,
        });
      } catch (error) {
        toast({
          title: "CSV Parse Error",
          description: `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const parseTransactions = () => {
    if (!csvData.length) return;

    const { description, amount, category, date, type } = columnMapping;
    
    if (description === null || amount === null || date === null) {
      toast({
        title: "Missing Required Mappings",
        description: "Description, Amount, and Date columns are required",
        variant: "destructive",
      });
      return;
    }

    const success: ParsedTransaction[] = [];
    const errors: { row: number; error: string; data: string[] }[] = [];
    const categoryNames = categories.map(cat => cat.name.toLowerCase());

    csvData.forEach((row, index) => {
      try {
        // Skip header row or empty rows
        if (index === 0 || row.length === 0) return;

        const desc = row[description]?.trim();
        const amountStr = row[amount]?.trim().replace(/[,$]/g, '');
        const dateStr = row[date]?.trim();
        const categoryStr = category !== null ? row[category]?.trim() : 'Other';
        const typeStr = type !== null ? row[type]?.trim().toLowerCase() : 'expense';

        if (!desc || !amountStr || !dateStr) {
          errors.push({
            row: index + 1,
            error: "Missing required fields (description, amount, or date)",
            data: row
          });
          return;
        }

        const parsedAmount = parseFloat(amountStr);
        if (isNaN(parsedAmount)) {
          errors.push({
            row: index + 1,
            error: `Invalid amount: "${amountStr}"`,
            data: row
          });
          return;
        }

        // Parse date (support multiple formats)
        let parsedDate: Date;
        try {
          // Try common date formats
          if (dateStr.includes('/')) {
            const [month, day, year] = dateStr.split('/');
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else if (dateStr.includes('-')) {
            parsedDate = new Date(dateStr);
          } else {
            throw new Error('Unsupported date format');
          }

          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch {
          errors.push({
            row: index + 1,
            error: `Invalid date format: "${dateStr}". Expected MM/DD/YYYY or YYYY-MM-DD`,
            data: row
          });
          return;
        }

        // Auto-match category or default to 'Other'
        let finalCategory = 'Other';
        if (categoryStr) {
          const matchedCategory = categories.find(cat => 
            cat.name.toLowerCase() === categoryStr.toLowerCase() ||
            cat.name.toLowerCase().includes(categoryStr.toLowerCase())
          );
          if (matchedCategory) {
            finalCategory = matchedCategory.name;
          }
        }

        // Determine transaction type
        let finalType: 'expense' | 'income' = 'expense';
        if (typeStr.includes('income') || typeStr.includes('credit') || parsedAmount < 0) {
          finalType = 'income';
        }

        success.push({
          description: desc,
          amount: Math.abs(parsedAmount),
          category: finalCategory,
          date: parsedDate.toISOString().split('T')[0],
          type: finalType,
        });

      } catch (error) {
        errors.push({
          row: index + 1,
          error: error instanceof Error ? error.message : 'Unknown parsing error',
          data: row
        });
      }
    });

    setParseResults({ success, errors });
  };

  const importTransactions = async () => {
    if (!parseResults?.success.length) return;

    setIsProcessing(true);
    try {
      await addTransactionsMutation.mutateAsync(parseResults.success);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${parseResults.success.length} transactions`,
      });
      
      setIsDialogOpen(false);
      setCsvData([]);
      setParseResults(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: `Failed to import transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV Transactions</DialogTitle>
          </DialogHeader>
          
          {csvData.length > 0 && (
            <div className="space-y-6">
              {/* Column Mapping */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Map CSV Columns</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Description Column *</Label>
                    <Select 
                      value={columnMapping.description?.toString() || ''} 
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, description: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvData[0]?.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Column {index + 1}: {header || `Column ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Amount Column *</Label>
                    <Select 
                      value={columnMapping.amount?.toString() || ''} 
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, amount: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvData[0]?.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Column {index + 1}: {header || `Column ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Date Column *</Label>
                    <Select 
                      value={columnMapping.date?.toString() || ''} 
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, date: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvData[0]?.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Column {index + 1}: {header || `Column ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Category Column (Optional)</Label>
                    <Select 
                      value={columnMapping.category?.toString() || ''} 
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, category: value ? parseInt(value) : null }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {csvData[0]?.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Column {index + 1}: {header || `Column ${index + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={parseTransactions} className="w-full">
                  Parse Transactions
                </Button>
              </div>

              {/* Parse Results */}
              {parseResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="default" className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {parseResults.success.length} Valid
                    </Badge>
                    {parseResults.errors.length > 0 && (
                      <Badge variant="destructive" className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {parseResults.errors.length} Errors
                      </Badge>
                    )}
                  </div>

                  {parseResults.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-600">Parsing Errors:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {parseResults.errors.map((error, index) => (
                          <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-4 border-red-400">
                            <div className="font-medium">Row {error.row}: {error.error}</div>
                            <div className="text-gray-600">Data: {error.data.join(', ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parseResults.success.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600">Preview (First 5 transactions):</h4>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-5 gap-2 text-sm font-medium p-2 bg-gray-100 rounded">
                          <div>Description</div>
                          <div>Amount</div>
                          <div>Category</div>
                          <div>Date</div>
                          <div>Type</div>
                        </div>
                        {parseResults.success.slice(0, 5).map((transaction, index) => (
                          <div key={index} className="grid grid-cols-5 gap-2 text-sm p-2 border-b">
                            <div className="truncate">{transaction.description}</div>
                            <div>${transaction.amount.toFixed(2)}</div>
                            <div className="truncate">{transaction.category}</div>
                            <div>{transaction.date}</div>
                            <div className="capitalize">{transaction.type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={importTransactions} 
                    disabled={parseResults.success.length === 0 || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? 'Importing...' : `Import ${parseResults.success.length} Transactions`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CSVImporter;
