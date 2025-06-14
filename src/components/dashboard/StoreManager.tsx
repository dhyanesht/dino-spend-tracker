
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Save, X, Delete } from 'lucide-react';
import { useStores, useUpdateStore } from '@/hooks/useStores';
import { useSubcategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Custom hook for deleting a store
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
}

const StoreManager = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);

  const { data: stores = [], isLoading } = useStores();
  const { data: subcategories = [] } = useSubcategories();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStore.mutateAsync(deleteTarget.id);
      toast.success(`Deleted store "${deleteTarget.name}"`);
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    } finally {
      setDeleteTarget(null);
    }
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
                    <div className="flex items-center gap-2">
                      {editingId === store.id ? (
                        <>
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
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(store.id, store.category_name)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog
                            open={!!deleteTarget && deleteTarget.id === store.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setDeleteTarget({ id: store.id, name: store.name });
                              } else {
                                setDeleteTarget(null);
                              }
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                disabled={deleteStore.isPending}
                                aria-label={`Delete ${store.name}`}
                                onClick={() => setDeleteTarget({ id: store.id, name: store.name })}
                              >
                                <Delete className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Store "{store.name}"?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this store mapping? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleteStore.isPending}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction disabled={deleteStore.isPending} onClick={handleDelete}>
                                  {deleteStore.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
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
