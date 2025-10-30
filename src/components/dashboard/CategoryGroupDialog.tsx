import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CategoryGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newGroup: {
    name: string;
    description: string;
    color: string;
  };
  setNewGroup: (group: any) => void;
  onSave: () => void;
  isAdding: boolean;
  mode: 'create' | 'edit';
}

const CategoryGroupDialog: React.FC<CategoryGroupDialogProps> = ({
  isOpen,
  onOpenChange,
  newGroup,
  setNewGroup,
  onSave,
  isAdding,
  mode,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Category Group' : 'Edit Category Group'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Housing"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., rent, mortgage, utilities"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="color"
                type="color"
                value={newGroup.color}
                onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={newGroup.color}
                onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onSave}
            disabled={isAdding || !newGroup.name.trim()}
          >
            {mode === 'create' ? 'Create Group' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryGroupDialog;