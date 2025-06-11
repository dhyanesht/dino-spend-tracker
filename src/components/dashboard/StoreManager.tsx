
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Save, X } from 'lucide-react';
import { useStores, useUpdateStore } from '@/hooks/useStores';
import { useSubcategories } from '@/hooks/useCategories';
import { toast } from 'sonner';

const StoreManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  
  const { data: stores = [], isLoading } = useStores();
  const { data: subcategories = [] } = useSubcategories();
  const updateStore = useUpdateStore();

  const handleEdit = (storeId: string, currentCategory: string) => {
    setEditingId(storeId);
    setEditCategory(currentCategory);
  };

  const handleSave = async (storeId: string) => {
    try {
      await updateStore.mutateAsync({
        id: storeId,
        category_name: editCategory,
      });
      toast.success('Store category updated successfully!');
      setEditingId(null);
      setEditCategory('');
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('Failed to update store category');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditCategory('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Store Category Mappings</h2>
        <p className="text-slate-600">
          Manage how stores are automatically categorized. These mappings will be used for future transactions.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length > 0 ? (
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>
                    {editingId === store.id ? (
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="w-48">
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
                    ) : (
                      <span>{store.category_name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(store.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {editingId === store.id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(store.id)}
                          disabled={updateStore.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(store.id, store.category_name)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                  No store mappings yet. Add transactions using the "Add Transaction" button to start building your store categories.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default StoreManager;
