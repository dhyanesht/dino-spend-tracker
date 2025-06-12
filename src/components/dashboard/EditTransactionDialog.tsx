
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { useSubcategories } from '@/hooks/useCategories';
import { useUpdateTransaction } from '@/hooks/useTransactions';
import { Transaction } from '@/hooks/useTransactions';
import { toast } from 'sonner';

interface EditTransactionDialogProps {
  transaction: Transaction;
}

const EditTransactionDialog = ({ transaction }: EditTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [type, setType] = useState<'expense' | 'income'>(transaction.type);
  const [date, setDate] = useState(transaction.date);

  const { data: subcategories = [] } = useSubcategories();
  const updateTransaction = useUpdateTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        description,
        amount: parseFloat(amount),
        category,
        type,
        date
      });
      
      toast.success('Transaction updated successfully');
      setOpen(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const handleTypeChange = (value: string) => {
    setType(value as 'expense' | 'income');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
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
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subcategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                    {cat.parent_category && (
                      <span className="text-slate-500 text-sm"> ({cat.parent_category})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={updateTransaction.isPending} className="flex-1">
              {updateTransaction.isPending ? 'Updating...' : 'Update Transaction'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;
