import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const MonthPicker = ({ selectedMonth, onMonthChange }: MonthPickerProps) => {
  const goToPrevMonth = () => {
    const prev = new Date(selectedMonth);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(selectedMonth);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  const goToCurrentMonth = () => {
    onMonthChange(new Date());
  };

  const isCurrentMonth =
    selectedMonth.getMonth() === new Date().getMonth() &&
    selectedMonth.getFullYear() === new Date().getFullYear();

  const isFutureMonth = selectedMonth > new Date();

  const label = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={goToPrevMonth} aria-label="Previous month">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-lg font-semibold min-w-[160px] text-center">{label}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        disabled={isFutureMonth}
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
          Today
        </Button>
      )}
    </div>
  );
};

export default MonthPicker;
