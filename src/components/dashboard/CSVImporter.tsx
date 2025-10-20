
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAddMultipleTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useStores, useAddStore, findBestStoreMatch, extractStoreName } from '@/hooks/useStores';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';

interface ParsedTransaction {
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  storeName?: string;
  matchedStore?: boolean;
}

interface UnmatchedStore {
  name: string;
  category: string;
  count: number;
}

interface ColumnMapping {
  description: number | null;
  amount: number | null;
  category: number | null;
  date: number | null;
  type: number | null;
}

// Payment providers to remove from transaction descriptions
const PAYMENT_PROVIDERS_TO_REMOVE = [
  'GglPay',
  'ApplePay',
  'APPLE PAY',
  'GOOGLE PAY',
  'GPAY',
  'APPLEPAY',
  'GOOGLEPAY'
];

const cleanTransactionDescription = (description: string): string => {
  let cleaned = description;
  
  PAYMENT_PROVIDERS_TO_REMOVE.forEach(provider => {
    // Remove the provider name with case-insensitive matching
    // Also handle spaces and common separators around the provider name
    const regex = new RegExp(`\\b${provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '').trim();
    
    // Clean up multiple spaces and leading/trailing separators
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s\-*]+|[\s\-*]+$/g, '').trim();
  });
  
  return cleaned || description; // Return original if cleaning results in empty string
};

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
    unmatchedStores: UnmatchedStore[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addTransactionsMutation = useAddMultipleTransactions();
  const addStoreMutation = useAddStore();
  const { data: categories = [] } = useCategories();
  const { data: stores = [] } = useStores();
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
    const unmatchedStores: Map<string, UnmatchedStore> = new Map();

    console.log('Starting to parse transactions...');
    console.log('Available stores for matching:', stores.map(s => s.name));

    csvData.forEach((row, index) => {
      try {
        // Skip header row or empty rows
        if (index === 0 || row.length === 0) return;

        const rawDesc = row[description]?.trim();
        const desc = rawDesc ? cleanTransactionDescription(rawDesc) : '';
        const amountStr = row[amount]?.trim().replace(/[,$]/g, '');
        const dateStr = row[date]?.trim();
        const categoryStr = category !== null ? row[category]?.trim() : '';
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

        // Enhanced store matching and categorization
        console.log(`Processing row ${index + 1} with description: "${desc}"`);
        
        const extractedStoreName = extractStoreName(desc);
        console.log(`Extracted store name: "${extractedStoreName}"`);
        
        const matchedStore = findBestStoreMatch(desc, stores);
        
        let finalCategory = 'Other';
        let storeName = extractedStoreName;
        let matchedStoreFlag = false;

        if (matchedStore) {
          // Found a matching store, use its category
          console.log(`Found matching store: ${matchedStore.name} → ${matchedStore.category_name}`);
          finalCategory = matchedStore.category_name;
          storeName = matchedStore.name; // Use the stored name for consistency
          matchedStoreFlag = true;
        } else if (categoryStr) {
          // Manual category provided in CSV
          const foundCategory = categories.find(cat => 
            cat.name.toLowerCase() === categoryStr.toLowerCase()
          );
          finalCategory = foundCategory ? foundCategory.name : 'Other';
          console.log(`Using CSV category: ${finalCategory}`);
        } else {
          // No match found, track as unmatched store
          console.log(`No match found for "${extractedStoreName}", adding to unmatched stores`);
          if (storeName && !unmatchedStores.has(storeName)) {
            unmatchedStores.set(storeName, {
              name: storeName,
              category: 'Other',
              count: 1
            });
          } else if (storeName) {
            const existing = unmatchedStores.get(storeName)!;
            existing.count++;
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
          storeName,
          matchedStore: matchedStoreFlag,
        });

      } catch (error) {
        errors.push({
          row: index + 1,
          error: error instanceof Error ? error.message : 'Unknown parsing error',
          data: row
        });
      }
    });

    console.log('Parsing complete:');
    console.log(`- ${success.length} successful transactions`);
    console.log(`- ${errors.length} errors`);
    console.log(`- ${unmatchedStores.size} unmatched stores`);

    setParseResults({ 
      success, 
      errors, 
      unmatchedStores: Array.from(unmatchedStores.values())
    });
  };

  const handleCategoryChange = (storeName: string, newCategory: string) => {
    if (!parseResults) return;
    
    const updatedUnmatched = parseResults.unmatchedStores.map(store => 
      store.name === storeName ? { ...store, category: newCategory } : store
    );
    
    const updatedSuccess = parseResults.success.map(transaction => 
      transaction.storeName === storeName && !transaction.matchedStore
        ? { ...transaction, category: newCategory }
        : transaction
    );
    
    setParseResults({
      ...parseResults,
      unmatchedStores: updatedUnmatched,
      success: updatedSuccess
    });
  };

  const handleAiCategorization = async () => {
    if (!parseResults?.unmatchedStores.length) {
      toast({
        title: "No Transactions to Categorize",
        description: "All transactions are already categorized",
      });
      return;
    }

    setIsAiCategorizing(true);
    try {
      console.log('Starting AI categorization for', parseResults.unmatchedStores.length, 'stores');
      
      // Prepare transactions for AI
      const transactionsToCategorize = parseResults.unmatchedStores.map(store => ({
        storeName: store.name,
        description: parseResults.success.find(t => t.storeName === store.name)?.description || store.name
      }));

      console.log('Calling edge function with:', { 
        transactionCount: transactionsToCategorize.length,
        categoryCount: categories.length 
      });

      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: {
          transactions: transactionsToCategorize,
          categories: categories
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to call categorization function');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.categorizations && Array.isArray(data.categorizations)) {
        console.log('AI categorizations received:', data.categorizations);
        
        // Apply all AI categorizations at once (not in a loop to avoid state update issues)
        const categorizationMap = new Map<string, string>(
          data.categorizations.map((cat: { storeName: string; category: string }) => [cat.storeName, cat.category])
        );

        const updatedUnmatched = parseResults.unmatchedStores.map(store => ({
          ...store,
          category: categorizationMap.get(store.name) ?? store.category
        }));
        
        const updatedSuccess = parseResults.success.map(transaction => {
          const aiCategory = categorizationMap.get(transaction.storeName || '');
          if (aiCategory && !transaction.matchedStore) {
            return { ...transaction, category: aiCategory };
          }
          return transaction;
        });
        
        setParseResults({
          ...parseResults,
          unmatchedStores: updatedUnmatched,
          success: updatedSuccess
        });

        toast({
          title: "AI Categorization Complete",
          description: `Successfully categorized ${data.categorizations.length} stores using AI`,
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('AI categorization error:', error);
      toast({
        title: "AI Categorization Failed",
        description: error instanceof Error ? error.message : 'Failed to categorize transactions with AI',
        variant: "destructive",
      });
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const importTransactions = async () => {
    if (!parseResults?.success.length) return;

    setIsProcessing(true);
    try {
      // First, add any new store mappings
      const newStoresToAdd = parseResults.unmatchedStores.filter(store => store.category !== 'Other');
      
      for (const store of newStoresToAdd) {
        try {
          await addStoreMutation.mutateAsync({
            name: store.name,
            category_name: store.category,
          });
          console.log(`Added store mapping: ${store.name} → ${store.category}`);
        } catch (error) {
          console.error(`Failed to add store mapping for ${store.name}:`, error);
        }
      }

      // Then add the transactions
      const transactionsToAdd = parseResults.success.map(({ storeName, matchedStore, ...transaction }) => transaction);
      await addTransactionsMutation.mutateAsync(transactionsToAdd);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${parseResults.success.length} transactions${newStoresToAdd.length > 0 ? ` and ${newStoresToAdd.length} new store mappings` : ''}`,
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
        
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV Transactions with Smart Categorization</DialogTitle>
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
                      value={columnMapping.description?.toString() || 'none'} 
                      onValueChange={(value) => setColumnMapping(prev => ({ 
                        ...prev, 
                        description: value === 'none' ? null : parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a column</SelectItem>
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
                      value={columnMapping.amount?.toString() || 'none'} 
                      onValueChange={(value) => setColumnMapping(prev => ({ 
                        ...prev, 
                        amount: value === 'none' ? null : parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a column</SelectItem>
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
                      value={columnMapping.date?.toString() || 'none'} 
                      onValueChange={(value) => setColumnMapping(prev => ({ 
                        ...prev, 
                        date: value === 'none' ? null : parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a column</SelectItem>
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
                      value={columnMapping.category?.toString() || 'none'} 
                      onValueChange={(value) => setColumnMapping(prev => ({ 
                        ...prev, 
                        category: value === 'none' ? null : parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
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
                    {parseResults.unmatchedStores.length > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {parseResults.unmatchedStores.length} New Stores
                      </Badge>
                    )}
                  </div>

                  {/* Unmatched Stores Section */}
                  {parseResults.unmatchedStores.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-orange-600">New Stores Need Categorization:</h4>
                        <Button
                          onClick={handleAiCategorization}
                          disabled={isAiCategorizing}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isAiCategorizing ? 'AI Categorizing...' : 'AI Auto-Categorize'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm font-medium p-2 bg-gray-100 rounded">
                        <div>Store Name</div>
                        <div>Category</div>
                        <div>Transactions Count</div>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {parseResults.unmatchedStores.map((store, index) => (
                          <div key={index} className="grid grid-cols-3 gap-2 text-sm p-2 border-b">
                            <div className="font-medium">{store.name}</div>
                            <div>
                              <Select 
                                value={store.category} 
                                onValueChange={(value) => handleCategoryChange(store.name, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.name}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-center">{store.count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
