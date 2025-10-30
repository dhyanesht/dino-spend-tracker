import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import CategoryGroupDialog from './CategoryGroupDialog';
import { useCategoryGroups, useAddCategoryGroup, useUpdateCategoryGroup, useDeleteCategoryGroup, useGroupMappings, useBatchUpdateGroupMappings, CategoryGroup } from '@/hooks/useCategoryGroups';
import { useSubcategories } from '@/hooks/useCategories';

const CategoryGroupManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const { data: groups = [], isLoading: groupsLoading } = useCategoryGroups();
  const { data: mappings = [], isLoading: mappingsLoading } = useGroupMappings();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const addGroupMutation = useAddCategoryGroup();
  const updateGroupMutation = useUpdateCategoryGroup();
  const deleteGroupMutation = useDeleteCategoryGroup();
  const batchUpdateMappings = useBatchUpdateGroupMappings();

  // Map groups to their categories
  const groupsWithCategories = useMemo(() => {
    return groups.map(group => {
      const groupMappings = mappings.filter(m => m.group_id === group.id);
      const categoryIds = groupMappings.map(m => m.category_id);
      const categories = subcategories.filter(cat => categoryIds.includes(cat.id));
      return {
        ...group,
        categories: categories.map(c => c.name),
        categoryIds,
      };
    });
  }, [groups, mappings, subcategories]);

  const handleCreateGroup = () => {
    setDialogMode('create');
    setSelectedGroup(null);
    setNewGroup({
      name: '',
      description: '',
      color: '#3B82F6',
    });
    setIsDialogOpen(true);
  };

  const handleEditGroup = (group: CategoryGroup) => {
    setDialogMode('edit');
    setSelectedGroup(group);
    setNewGroup({
      name: group.name,
      description: group.description || '',
      color: group.color,
    });
    setIsDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (dialogMode === 'create') {
      await addGroupMutation.mutateAsync(newGroup);
    } else if (selectedGroup) {
      await updateGroupMutation.mutateAsync({
        id: selectedGroup.id,
        updates: newGroup,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroupMutation.mutateAsync(groupId);
  };

  const handleToggleCategory = (groupId: string, categoryId: string, currentIds: string[]) => {
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter(id => id !== categoryId)
      : [...currentIds, categoryId];
    
    batchUpdateMappings.mutate({ group_id: groupId, category_ids: newIds });
  };

  if (groupsLoading || mappingsLoading || subcategoriesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Category Groups</h2>
          <p className="text-sm text-muted-foreground">
            Organize your categories into flexible groups for better reporting
          </p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="w-4 h-4 mr-2" />
          New Group
        </Button>
      </div>

      <div className="grid gap-4">
        {groupsWithCategories.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle>{group.name}</CardTitle>
                    <Badge variant="secondary">{group.categories.length} categories</Badge>
                  </div>
                  {group.description && (
                    <CardDescription className="mt-2">{group.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditGroup(group)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete the group "{group.name}" but will not affect your categories.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            {expandedGroup === group.id && (
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Assign Categories:</Label>
                  <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="space-y-2">
                      {subcategories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${group.id}-${category.id}`}
                            checked={group.categoryIds.includes(category.id)}
                            onCheckedChange={() => handleToggleCategory(group.id, category.id, group.categoryIds)}
                          />
                          <label
                            htmlFor={`${group.id}-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {category.name}
                            {category.parent_category && (
                              <span className="text-muted-foreground ml-2">
                                ({category.parent_category})
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {groups.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No category groups yet. Create one to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CategoryGroupDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onSave={handleSaveGroup}
        isAdding={addGroupMutation.isPending || updateGroupMutation.isPending}
        mode={dialogMode}
      />
    </div>
  );
};

export default CategoryGroupManager;