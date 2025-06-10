
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface NavigationBreadcrumbProps {
  items: BreadcrumbItem[];
}

const NavigationBreadcrumb = ({ items }: NavigationBreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-white rounded-lg border">
      <Home className="w-4 h-4 text-gray-500" />
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          {item.onClick ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={item.onClick}
              className="h-auto p-1 text-blue-600 hover:text-blue-800"
            >
              {item.label}
            </Button>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default NavigationBreadcrumb;
