
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Subcategory {
  id: string;
  name: string;
  parent_category: string | null;
  color: string;
}

interface TransactionFiltersProps {
  filters: {
    category: string;
    type: string;
    term: string;
    date: DateRange | undefined;
    minAmount: string;
    maxAmount: string;
  };
  setters: {
    setCategory: (value: string) => void;
    setType: (value: string) => void;
    setTerm: (value: string) => void;
    setDate: (date: DateRange | undefined) => void;
    setMinAmount: (value: string) => void;
    setMaxAmount: (value: string) => void;
  };
  handleResetFilters: () => void;
  subcategories: Subcategory[];
  isMobile: boolean;
}

const TransactionFilters = ({
  filters,
  setters,
  handleResetFilters,
  subcategories,
  isMobile,
}: TransactionFiltersProps) => {
  return (
    <div className="flex gap-3 flex-wrap">
      <Input
        placeholder="Search description..."
        value={filters.term}
        onChange={(e) => setters.setTerm(e.target.value)}
        className="w-48"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !filters.date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.date?.from ? (
              filters.date.to ? (
                <>
                  {format(filters.date.from, "LLL dd, y")} -{" "}
                  {format(filters.date.to, "LLL dd, y")}
                </>
              ) : (
                format(filters.date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={filters.date?.from}
            selected={filters.date}
            onSelect={setters.setDate}
            numberOfMonths={isMobile ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
      
      <Input
        type="number"
        placeholder="Min amount"
        value={filters.minAmount}
        onChange={(e) => setters.setMinAmount(e.target.value)}
        className="w-32"
      />
      <Input
        type="number"
        placeholder="Max amount"
        value={filters.maxAmount}
        onChange={(e) => setters.setMaxAmount(e.target.value)}
        className="w-32"
      />
      
      <Select value={filters.category} onValueChange={setters.setCategory}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
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
      
      <Select value={filters.type} onValueChange={setters.setType}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="income">Income</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" onClick={handleResetFilters}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  );
};

export default TransactionFilters;
