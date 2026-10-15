
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Subcategory {
  id: string;
  name: string;
  parent_category: string | null;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface TransactionFiltersProps {
  filters: {
    category: string;
    type: string;
    account: string;
    status: string;
    transactionType: string;
    includePending: boolean;
    term: string;
    date: DateRange | undefined;
    minAmount: string;
    maxAmount: string;
  };
  setters: {
    setCategory: (value: string) => void;
    setType: (value: string) => void;
    setAccount: (value: string) => void;
    setStatus: (value: string) => void;
    setTransactionType: (value: string) => void;
    setIncludePending: (value: boolean) => void;
    setTerm: (value: string) => void;
    setDate: (date: DateRange | undefined) => void;
    setMinAmount: (value: string) => void;
    setMaxAmount: (value: string) => void;
  };
  handleResetFilters: () => void;
  subcategories: Subcategory[];
  accounts: Account[];
  isMobile: boolean;
}

const TRANSACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'refund', label: 'Refund' },
  { value: 'reimbursement', label: 'Reimbursement' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'posted', label: 'Posted' },
  { value: 'pending', label: 'Pending' },
  { value: 'cleared', label: 'Cleared' },
];

const TransactionFilters = ({
  filters,
  setters,
  handleResetFilters,
  subcategories,
  accounts,
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

      <Select value={filters.account} onValueChange={setters.setAccount}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.transactionType} onValueChange={setters.setTransactionType}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Transaction Type" />
        </SelectTrigger>
        <SelectContent>
          {TRANSACTION_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={setters.setStatus}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 px-3 border rounded-md h-9">
        <Checkbox
          id="include-pending"
          checked={filters.includePending}
          onCheckedChange={(checked) => setters.setIncludePending(!!checked)}
        />
        <Label
          htmlFor="include-pending"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Include pending
        </Label>
      </div>

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
