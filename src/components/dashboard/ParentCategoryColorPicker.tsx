
import React, { useState } from "react";
import { useUpdateCategory, Category } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  category: Category;
};

const ParentCategoryColorPicker: React.FC<Props> = ({ category }) => {
  const [color, setColor] = useState(category.color || "#3B82F6");
  const [editing, setEditing] = useState(false);
  const updateCategory = useUpdateCategory();

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateCategory.mutateAsync({ id: category.id, color });
      toast.success(`Color updated for "${category.name}"!`);
      setEditing(false);
    } catch (error) {
      toast.error("Failed to update category color");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={handleColorChange}
        className="w-10 h-10 border-none bg-transparent cursor-pointer"
        title="Pick a category color"
        style={{ minWidth: 40 }}
      />
      <Button
        size="sm"
        variant={editing ? "default" : "outline"}
        disabled={!editing || updateCategory.isPending}
        onClick={handleSave}
      >
        {updateCategory.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
};

export default ParentCategoryColorPicker;
