
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useSubcategories } from '@/hooks/useCategories';
import { useStoreByName, useAddStore } from '@/hooks/useStores';
import { toast } from 'sonner';

const SmartTransactionDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [storeName, setStoreName] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategorySelection, setShowCategorySelection] = useState(false);

  const { data: subcategories = [] } = useSubcategories();
  const { data: storeData } = useStoreByName(storeName);
  const addTransaction = useAddTransaction();
  const addStore = useAddStore();

  // Watch for store lookup results
  React.useEffect(() => {
    if (storeData) {
      setSuggestedCategory(storeData.category_name);
      setSelectedCategory(storeData.category_name);
      setShowCategorySelection(false);
    } else if (storeName && storeName.length > 2) {
      setSuggestedCategory('');
      setSelectedCategory('');
      setShowCategorySelection(true);
    } else {
      setShowCategorySelection(false);
    }
  }, [storeData, storeName]);

  const handleSubmit = async () => {
    if (!description || !amount || !selectedCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // If this is a new store, save the store-category mapping
      if (!storeData && storeName && selectedCategory) {
        await addStore.mutateAsync({
          name: storeName,
          category_name: selectedCategory,
        });
        toast.success('Store category mapping saved for future use!');
      }

      // Add the transaction
      await addTransaction.mutateAsync({
        description: description,
        amount: Number(amount),
        category: selectedCategory,
        date: date,
        type: 'expense',
      });

      toast.success('Transaction added successfully!');
      setDescription('');
      setAmount('');
      setStoreName('');
      setSelectedCategory('');
      setSuggestedCategory('');
      setShowCategorySelection(false);
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Smart Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g., Costco, Amazon, Starbucks"
            />
            {suggestedCategory && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Auto-categorized as: {suggestedCategory}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you buy?"
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {showCategorySelection && (
            <div>
              <Label htmlFor="category">Select Category for "{storeName}"</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                      {category.parent_category && (
                        <span className="text-slate-500 text-sm"> ({category.parent_category})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-600 mt-1">
                This will be remembered for future transactions at {storeName}
              </p>
            </div>
          )}
          {suggestedCategory && (
            <div>
              <Label htmlFor="categoryOverride">Category (auto-detected)</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                      {category.parent_category && (
                        <span className="text-slate-500 text-sm"> ({category.parent_category})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={addTransaction.isPending || addStore.isPending}
          >
            {addTransaction.isPending || addStore.isPending ? 'Adding...' : 'Add Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartTransactionDialog;
