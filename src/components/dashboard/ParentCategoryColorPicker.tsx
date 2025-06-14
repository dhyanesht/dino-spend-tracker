
import React, { useState } from "react";
import { Category, useUpdateCategory } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { toast } from "sonner";

type Props = {
  category: Category;
  editable?: boolean; // allow explicit disabling if needed
};

const ParentCategoryColorPicker: React.FC<Props> = ({ category, editable = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [color, setColor] = useState(category.color || "#3B82F6");
  const [pendingColor, setPendingColor] = useState(category.color || "#3B82F6");
  const [dirty, setDirty] = useState(false);

  const updateCategory = useUpdateCategory();

  // Open editor with current color
  const openEditor = () => {
    setPendingColor(color);
    setDirty(false);
    setIsOpen(true);
  };

  // Handle color input changes
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingColor(e.target.value);
    setDirty(e.target.value !== color);
  };

  // Save color
  const handleSave = async () => {
    try {
      await updateCategory.mutateAsync({ id: category.id, color: pendingColor });
      setColor(pendingColor);
      toast.success(`Color updated for "${category.name}".`);
      setIsOpen(false);
    } catch {
      toast.error("Failed to update category color");
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setPendingColor(color);
    setDirty(false);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Swatch + palette icon launches popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="relative p-0 h-8 w-8 rounded-full flex items-center justify-center hover:ring-2 hover:ring-blue-500 group"
            onClick={openEditor}
            title="Edit category color"
            tabIndex={editable ? 0 : -1}
            disabled={!editable}
            aria-label="Edit color"
          >
            <span
              className="block w-6 h-6 rounded-full border border-gray-300 transition group-hover:ring-2 group-hover:ring-blue-300"
              style={{ background: color }}
            />
            <Palette
              size={18}
              className="absolute bottom-0 right-0 bg-white rounded-full text-blue-500 transition-opacity opacity-80 group-hover:opacity-100"
              style={{ boxShadow: "0 0 4px 0 rgba(0,0,0,0.07)" }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-52 space-y-3 p-4 flex flex-col items-center"
        >
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={pendingColor}
              onChange={handleColorChange}
              className="w-10 h-10 border-none bg-transparent cursor-pointer"
              aria-label="Pick color"
            />
            <span
              className="w-7 h-7 rounded-full border"
              style={{ background: pendingColor }}
              title={pendingColor}
            />
            <span className="text-xs text-gray-500">{pendingColor}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm"
              disabled={!dirty || updateCategory.isPending}
              onClick={handleSave}
              className="px-3"
            >{updateCategory.isPending ? "Saving..." : "Save"}</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateCategory.isPending}
              className="px-3"
            >Cancel</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ParentCategoryColorPicker;
