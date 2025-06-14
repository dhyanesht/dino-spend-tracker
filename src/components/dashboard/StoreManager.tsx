import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Save, X, Delete } from 'lucide-react';
import { useStores, useUpdateStore } from '@/hooks/useStores';
import { useSubcategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { extractStoreName, findBestStoreMatch } from '@/hooks/useStores';

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
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [testDescription, setTestDescription] = useState('');
  const [testResult, setTestResult] = useState<{
    extracted: string;
    match: any;
  } | null>(null);
  const [editColor, setEditColor] = useState<string>('#3B82F6');

  const { data: stores = [], isLoading } = useStores();
  const { data: subcategories = [] } = useSubcategories();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  // Import the update category hook
  const { useUpdateCategory } = require('@/hooks/useCategories');
  const updateCategory = useUpdateCategory();

  // Update color picker value when editing category changes
  React.useEffect(() => {
    if (editingId && editCategory) {
      const cat = subcategories.find(c => c.name === editCategory);
      setEditColor(cat?.color || '#3B82F6');
    }
  }, [editingId, editCategory, subcategories]);

  const handleEdit = (storeId: string, currentCategory: string, currentName: string) => {
    setEditingId(storeId);
    setEditCategory(currentCategory);
    setEditName(currentName);
    const cat = subcategories.find(c => c.name === currentCategory);
    setEditColor(cat?.color || '#3B82F6');
  };

  const handleSave = async (storeId: string) => {
    try {
      await updateStore.mutateAsync({
        id: storeId,
        name: editName,
        category_name: editCategory,
      });
      // Update subcategory color
      const cat = subcategories.find(c => c.name === editCategory);
      if (cat && cat.color !== editColor) {
        await updateCategory.mutateAsync({ id: cat.id, color: editColor });
      }
      toast.success('Store updated successfully!');
      setEditingId(null);
      setEditCategory('');
      setEditName('');
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('Failed to update store');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditCategory('');
    setEditName('');
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
      setDeleteTarget(null); // (still needed here)
    }
  };

  const handleTestDescription = () => {
    const extracted = extractStoreName(testDescription);
    const match = findBestStoreMatch(testDescription, stores);
    setTestResult({
      extracted,
      match,
    });
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
              <TableHead>Colour</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length > 0 ? (
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">
                    {editingId === store.id ? (
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="border px-2 py-1 rounded w-full text-base"
                        autoFocus
                      />
                    ) : (
                      <span>{store.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === store.id ? (
                      <Select value={editCategory} onValueChange={value => setEditCategory(value)}>
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
                    {editingId === store.id ? (
                      <input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 bg-transparent hover:cursor-pointer"
                        aria-label="Select category colour"
                      />
                    ) : (
                      (() => {
                        const cat = subcategories.find(c => c.name === store.category_name);
                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-5 h-5 rounded"
                              style={{ backgroundColor: cat?.color || '#3B82F6', border: '1px solid #CCC' }}
                              aria-label={`Category colour: ${cat?.color || '#3B82F6'}`}
                            />
                            <span className="text-slate-500 text-xs">{cat?.color || '#3B82F6'}</span>
                          </div>
                        );
                      })()
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
                            disabled={updateStore.isPending || updateCategory.isPending}
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
                            onClick={() => handleEdit(store.id, store.category_name, store.name)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <AlertDialog
                            open={!!deleteTarget && deleteTarget.id === store.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setDeleteTarget({ id: store.id, name: store.name });
                              } else {
                                // Do NOT clear here; let the action/cancel do it
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
                                <AlertDialogCancel
                                  disabled={deleteStore.isPending}
                                  onClick={() => setDeleteTarget(null)}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deleteStore.isPending}
                                  onClick={handleDelete}
                                >
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

      {/* Test transaction matching UI */}
      <div className="my-8 p-4 rounded-lg border bg-card dark:bg-card border-border">
        <h3 className="font-semibold mb-2">Test Store Matching</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            value={testDescription}
            onChange={e => setTestDescription(e.target.value)}
            placeholder="Enter a transaction description (e.g. LYFT *RIDE SUN 2AM 8552800278)"
            className="border px-3 py-2 rounded w-full md:w-96 text-base bg-background dark:bg-background text-foreground"
          />
          <Button
            onClick={handleTestDescription}
            type="button"
            variant="default"
            className="md:ml-2"
            disabled={!testDescription.trim()}
          >
            Check
          </Button>
        </div>

        {testResult && (
          <div className="mt-3 space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Extracted Store Name:</span>
              <div className="font-mono break-all">{testResult.extracted}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Matching Store:</span>
              {testResult.match ? (
                <div className="font-mono text-green-700 dark:text-green-400">
                  {testResult.match.name}
                  {testResult.match.category_name && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      (Category: {testResult.match.category_name})
                    </span>
                  )}
                </div>
              ) : (
                <div className="font-mono text-red-600 dark:text-red-400">No Match Found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StoreManager;
