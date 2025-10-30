
import React, { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useParentCategories, useSubcategories } from '@/hooks/useCategories';
import { useCategoryGroups, useGroupMappings } from '@/hooks/useCategoryGroups';
import { ChartSkeleton } from '@/components/ui/enhanced-skeleton';
import { NoTrendsEmpty } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  getMonthlyTrends, 
  getCategoryComparisonData, 
  getYearOverYearData, 
  calculateSpendingInsights,
  getParentCategoryComparison,
  getParentCategoryTableData,
  getBudgetPerformanceData
} from '@/utils/trendsDataUtils';
import { 
  getGroupComparison, 
  getGroupTableData, 
  getBudgetPerformanceByGroup 
} from '@/utils/groupTrendsDataUtils';
import TrendsControls from './TrendsControls';
import MonthlyTrendsChart from './MonthlyTrendsChart';
import CategoryComparisonChart from './CategoryComparisonChart';
import YearOverYearChart from './YearOverYearChart';
import TrendsInsights from './TrendsInsights';
import ParentCategoryComparison from './ParentCategoryComparison';
import ParentCategoryTable from './ParentCategoryTable';
import BudgetPerformanceChart from './BudgetPerformanceChart';

const TrendsAnalysis = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [useGroups, setUseGroups] = useState(false);
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: parentCategories = [], isLoading: parentCategoriesLoading } = useParentCategories();
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useSubcategories();
  const { data: groups = [], isLoading: groupsLoading } = useCategoryGroups();
  const { data: mappings = [], isLoading: mappingsLoading } = useGroupMappings();

  if (transactionsLoading || parentCategoriesLoading || subcategoriesLoading || groupsLoading || mappingsLoading) {
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
  
  // Get data based on whether we're using groups or parent categories
  const parentComparison = useGroups && groups.length > 0
    ? getGroupComparison(expenseTransactions, groups, mappings, allCategories)
    : getParentCategoryComparison(expenseTransactions, parentCategories, subcategories);
  
  const tableDataResult = useGroups && groups.length > 0
    ? getGroupTableData(expenseTransactions, groups, mappings, allCategories, 6)
    : getParentCategoryTableData(expenseTransactions, parentCategories, subcategories, 6);
  
  const budgetPerformance = useGroups && groups.length > 0
    ? getBudgetPerformanceByGroup(expenseTransactions, groups, mappings, allCategories)
    : getBudgetPerformanceData(expenseTransactions, parentCategories, subcategories);

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

      {groups.length > 0 && (
        <div className="flex items-center space-x-2 p-4 bg-card rounded-lg border">
          <Switch
            id="use-groups"
            checked={useGroups}
            onCheckedChange={setUseGroups}
          />
          <Label htmlFor="use-groups" className="cursor-pointer">
            View by Category Groups instead of Parent Categories
          </Label>
        </div>
      )}

      <ParentCategoryComparison data={parentComparison} />

      <ParentCategoryTable data={tableDataResult.tableData} monthColumns={tableDataResult.monthColumns} />

      <BudgetPerformanceChart data={budgetPerformance} />

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
