/**
 * Local definitions for Transaction and Category,
 * since they're not exported from '@/integrations/supabase/types'
 */
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  color: string;
  created_at: string;
  parent_category: string | null;
  monthly_budget: number | null;
}

export const getMonthlyTrends = (
  transactions: Transaction[],
  timeRange: string
) => {
  const months = [];
  const now = new Date();
  const lastYear = now.getFullYear() - 1;
  
  let monthCount = 6;
  if (timeRange === '3months') monthCount = 3;
  if (timeRange === '1year') monthCount = 12;

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(lastYear, now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    const monthTransactions = transactions.filter(t => 
      t.date.startsWith(monthKey)
    );
    
    const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    
    months.push({ month: monthName, total });
  }
  
  return months;
};

export const getCategoryComparisonData = (
  transactions: Transaction[],
  categories: Category[],
  timeRange: string,
  selectedCategory: string
) => {
  if (selectedCategory !== 'all') {
    return { data: [], topCategories: [] };
  }
  
  const months = [];
  const now = new Date();
  const lastYear = now.getFullYear() - 1;
  
  let monthCount = 6;
  if (timeRange === '3months') monthCount = 3;
  if (timeRange === '1year') monthCount = 12;

  // Get top 4 categories by total spending
  const categoryTotals = categories.map(cat => ({
    ...cat,
    total: transactions
      .filter(t => t.category === cat.name)
      .reduce((sum, t) => sum + Number(t.amount), 0)
  })).sort((a, b) => b.total - a.total).slice(0, 4);

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(lastYear, now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    const monthData: any = { month: monthName };
    
    categoryTotals.forEach(cat => {
      const categorySpent = transactions
        .filter(t => t.date.startsWith(monthKey) && t.category === cat.name)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      monthData[cat.name] = categorySpent;
    });
    
    months.push(monthData);
  }
  
  return { data: months, topCategories: categoryTotals };
};

export const getYearOverYearData = (transactions: Transaction[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData: { [month: string]: { 'This Year'?: number; 'Last Year'?: number } } = 
    monthNames.reduce((acc, month) => ({ ...acc, [month]: {} }), {});

  transactions.forEach(t => {
    const transactionDate = new Date(t.date);
    const year = transactionDate.getFullYear();
    
    if (year === currentYear || year === lastYear) {
      const month = transactionDate.getMonth();
      const monthName = monthNames[month];
      const key = year === currentYear ? 'This Year' : 'Last Year';
      
      if (!monthlyData[monthName][key]) {
        monthlyData[monthName][key] = 0;
      }
      monthlyData[monthName][key]! += Number(t.amount);
    }
  });

  return monthNames.map(month => ({
    month,
    'This Year': monthlyData[month]['This Year'] || 0,
    'Last Year': monthlyData[month]['Last Year'] || 0,
  }));
};

export const calculateSpendingInsights = (transactions: Transaction[]) => {
  const getCurrentMonthSpending = () => {
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    const currentMonth = `${lastYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getPreviousMonthSpending = () => {
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    const prevMonthDate = new Date(lastYear, now.getMonth() - 1, 1);
    const prevMonthKey = prevMonthDate.toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(prevMonthKey))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const currentSpending = getCurrentMonthSpending();
  const previousSpending = getPreviousMonthSpending();
  const spendingChange = previousSpending > 0 
    ? ((currentSpending - previousSpending) / previousSpending) * 100 
    : 0;

  return { currentSpending, previousSpending, spendingChange };
};

export const getParentCategoryComparison = (
  transactions: Transaction[],
  parentCategories: Category[],
  subcategories: Category[]
) => {
  const now = new Date();
  const lastYear = now.getFullYear() - 1;
  const twoYearsAgo = now.getFullYear() - 2;
  
  const currentMonth = `${lastYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previousMonth = new Date(lastYear, now.getMonth() - 1, 1);
  const previousMonthKey = previousMonth.toISOString().slice(0, 7);
  
  const currentYearMonth = currentMonth;
  const lastYearMonth = `${twoYearsAgo}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return parentCategories.map(parentCat => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === parentCat.name);
    const subcategoryNames = relatedSubcategories.map(sub => sub.name);

    const currentMonthSpending = transactions
      .filter(t => t.date.startsWith(currentMonth) && subcategoryNames.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const previousMonthSpending = transactions
      .filter(t => t.date.startsWith(previousMonthKey) && subcategoryNames.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentYearSpending = transactions
      .filter(t => t.date.startsWith(currentYearMonth) && subcategoryNames.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastYearSpending = transactions
      .filter(t => t.date.startsWith(lastYearMonth) && subcategoryNames.includes(t.category))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthOverMonth = previousMonthSpending > 0
      ? ((currentMonthSpending - previousMonthSpending) / previousMonthSpending) * 100
      : 0;

    const yearOverYear = lastYearSpending > 0
      ? ((currentYearSpending - lastYearSpending) / lastYearSpending) * 100
      : 0;

    return {
      parentCategory: parentCat.name,
      currentMonth: currentMonthSpending,
      previousMonth: previousMonthSpending,
      monthOverMonth,
      currentYear: currentYearSpending,
      previousYear: lastYearSpending,
      yearOverYear,
      color: parentCat.color
    };
  }).filter(cat => cat.currentMonth > 0 || cat.previousMonth > 0);
};

export const getParentCategoryTableData = (
  transactions: Transaction[],
  parentCategories: Category[],
  subcategories: Category[],
  monthCount: number = 6
) => {
  const now = new Date();
  const lastYear = now.getFullYear() - 1;
  const monthColumns: string[] = [];
  
  // Generate month columns
  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(lastYear, now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthColumns.push(monthName);
  }

  const tableData = parentCategories.map(parentCat => {
    const relatedSubcategories = subcategories.filter(sub => sub.parent_category === parentCat.name);
    const subcategoryNames = relatedSubcategories.map(sub => sub.name);

    const parentMonths: Record<string, number> = {};
    
    // Calculate spending for each month for parent
    for (let i = monthCount - 1; i >= 0; i--) {
      const date = new Date(lastYear, now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthSpending = transactions
        .filter(t => t.date.startsWith(monthKey) && subcategoryNames.includes(t.category))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      parentMonths[monthName] = monthSpending;
    }

    // Calculate spending for each subcategory
    const subcategoryData = relatedSubcategories.map(sub => {
      const subMonths: Record<string, number> = {};
      
      for (let i = monthCount - 1; i >= 0; i--) {
        const date = new Date(lastYear, now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        const monthSpending = transactions
          .filter(t => t.date.startsWith(monthKey) && t.category === sub.name)
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        subMonths[monthName] = monthSpending;
      }

      return {
        name: sub.name,
        months: subMonths
      };
    });

    return {
      parentCategory: parentCat.name,
      months: parentMonths,
      subcategories: subcategoryData
    };
  }).filter(cat => Object.values(cat.months).some(val => val > 0));

  return { tableData, monthColumns };
};
