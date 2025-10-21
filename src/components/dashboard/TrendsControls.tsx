
import React from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TrendsControlsProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: any[];
}

const TrendsControls = ({ 
  timeRange, 
  setTimeRange, 
  selectedCategory, 
  setSelectedCategory, 
  categories 
}: TrendsControlsProps) => {
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  return (
    <Card className="p-6">
      <div className="flex gap-3 justify-end">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {sortedCategories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                  {category.parent_category && (
                    <span className="text-muted-foreground text-xs ml-1">({category.parent_category})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>
    </Card>
  );
};

export default TrendsControls;
