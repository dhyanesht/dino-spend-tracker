
import React, { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useParentCategories, useSubcategories } from '@/hooks/useCategories';
import { ChartSkeleton } from '@/components/ui/enhanced-skeleton';
import { NoTrendsEmpty } from '@/components/ui/empty-state';
import { 
  getMonthlyTrends, 
  getCategoryComparisonData, 
  getYearOverYearData, 
  calculateSpendingInsights,
  getParentCategoryComparison,
  getParentCategoryTableData
} from '@/utils/trendsDataUtils';
import TrendsControls from './TrendsControls';
import MonthlyTrendsChart from './MonthlyTrendsChart';
import CategoryComparisonChart from './CategoryComparisonChart';
import YearOverYearChart from './YearOverYearChart';
import TrendsInsights from './TrendsInsights';
import ParentCategoryComparison from './ParentCategoryComparison';
import ParentCategoryTable from './ParentCategoryTable';

const TrendsAnalysis = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: parentCategories = [], isLoading: parentCategoriesLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();

  if (transactionsLoading || parentCategoriesLoading || subcategoriesLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  if (expenseTransactions.length < 3) {
    return <NoTrendsEmpty />;
  }

  const transactionsForAnalysis = selectedCategory === 'all'
    ? expenseTransactions
    : expenseTransactions.filter(t => t.category === selectedCategory);

  const allCategories = [...parentCategories, ...subcategories];
  const monthlyTrends = getMonthlyTrends(transactionsForAnalysis, timeRange);
  const categoryComparison = getCategoryComparisonData(expenseTransactions, allCategories, timeRange, selectedCategory);
  const yearOverYearData = getYearOverYearData(transactionsForAnalysis);
  const insights = calculateSpendingInsights(transactionsForAnalysis);
  const parentComparison = getParentCategoryComparison(expenseTransactions, parentCategories, subcategories);
  const { tableData, monthColumns } = getParentCategoryTableData(expenseTransactions, parentCategories, subcategories, 6);

  return (
    <div className="space-y-6">
      <TrendsInsights
        currentSpending={insights.currentSpending}
        spendingChange={insights.spendingChange}
        totalTransactions={transactions.length}
      />

      <TrendsControls
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={allCategories}
      />

      <ParentCategoryComparison data={parentComparison} />

      <ParentCategoryTable data={tableData} monthColumns={monthColumns} />

      <MonthlyTrendsChart
        data={monthlyTrends}
        selectedCategory={selectedCategory}
      />

      <CategoryComparisonChart
        data={categoryComparison.data}
        topCategories={categoryComparison.topCategories}
        selectedCategory={selectedCategory}
      />

      <YearOverYearChart
        data={yearOverYearData}
        selectedCategory={selectedCategory}
      />
    </div>
  );
};

export default TrendsAnalysis;
