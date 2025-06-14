
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PieChart, List, TrendingUp, DollarSign, Calendar, Upload } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Overview', icon: PieChart },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'categories', label: 'Categories', icon: Calendar },
  { id: 'import', label: 'Import', icon: Upload },
];

export const BottomTabBar = ({ activeTab, onTabChange }: BottomTabBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50 md:hidden">
      <div className="grid grid-cols-3 gap-1 p-2">
        {tabs.slice(0, 3).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-1 ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium truncate">{tab.label}</span>
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1 p-2 pt-0">
        {tabs.slice(3).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-1 ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium truncate">{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
