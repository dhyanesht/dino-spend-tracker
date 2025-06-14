
import { Transaction, Category } from '@/integrations/supabase/types';

export const getMonthlyTrends = (
  transactions: Transaction[],
  timeRange: string
) => {
  const months = [];
  const now = new Date();
  
  let monthCount = 6;
  if (timeRange === '3months') monthCount = 3;
  if (timeRange === '1year') monthCount = 12;

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
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
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions
      .filter(t => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const getPreviousMonthSpending = () => {
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = prevMonth.toISOString().slice(0, 7);
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
