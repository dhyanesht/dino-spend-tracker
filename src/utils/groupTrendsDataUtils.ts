import { startOfMonth, subMonths, format, isAfter, isBefore } from 'date-fns';
import { CategoryGroup, CategoryGroupMapping } from '@/hooks/useCategoryGroups';

interface Transaction {
  date: string;
  amount: number;
  category: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  monthly_budget?: number;
  parent_category?: string | null;
}

// Get spending by group for comparison across time periods
export const getGroupComparison = (
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[]
) => {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

  return groups.map(group => {
    // Get category names in this group
    const groupCategoryIds = mappings
      .filter(m => m.group_id === group.id)
      .map(m => m.category_id);
    
    const groupCategoryNames = categories
      .filter(c => groupCategoryIds.includes(c.id))
      .map(c => c.name);

    // Filter transactions for this group
    const groupTransactions = transactions.filter(t =>
      groupCategoryNames.includes(t.category)
    );

    const currentMonth = groupTransactions
      .filter(t => isAfter(new Date(t.date), currentMonthStart))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastMonth = groupTransactions
      .filter(t => 
        isAfter(new Date(t.date), lastMonthStart) &&
        isBefore(new Date(t.date), currentMonthStart)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentYear = groupTransactions
      .filter(t => isAfter(new Date(t.date), currentYearStart))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const lastYear = groupTransactions
      .filter(t => 
        isAfter(new Date(t.date), lastYearStart) &&
        isBefore(new Date(t.date), lastYearEnd)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      parentCategory: group.name,
      currentMonth,
      previousMonth: lastMonth,
      monthOverMonth: lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0,
      currentYear,
      previousYear: lastYear,
      yearOverYear: lastYear > 0 ? ((currentYear - lastYear) / lastYear) * 100 : 0,
      color: group.color,
    };
  });
};

// Get monthly spending breakdown by group
export const getGroupTableData = (
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[],
  monthCount: number = 6
) => {
  const now = new Date();
  const months = Array.from({ length: monthCount }, (_, i) => {
    const date = subMonths(now, i);
    return {
      date,
      label: format(date, 'MMM yyyy'),
      start: startOfMonth(date),
      end: startOfMonth(subMonths(now, i - 1)),
    };
  }).reverse();

  const tableData = groups.map(group => {
    // Get category names in this group
    const groupCategoryIds = mappings
      .filter(m => m.group_id === group.id)
      .map(m => m.category_id);
    
    const groupCategoryNames = categories
      .filter(c => groupCategoryIds.includes(c.id))
      .map(c => c.name);

    const monthsRecord: Record<string, number> = {};
    months.forEach(month => {
      const amount = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return groupCategoryNames.includes(t.category) &&
                 isAfter(tDate, month.start) &&
                 isBefore(tDate, month.end);
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      monthsRecord[month.label] = amount;
    });

    return {
      parentCategory: group.name,
      months: monthsRecord,
      subcategories: [], // Groups don't have subcategories in this view
    };
  });

  const monthColumns = months.map(m => m.label);

  return { tableData, monthColumns };
};

// Get budget performance by group
export const getBudgetPerformanceByGroup = (
  transactions: Transaction[],
  groups: CategoryGroup[],
  mappings: CategoryGroupMapping[],
  categories: Category[]
) => {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  return groups.map(group => {
    // Get categories in this group
    const groupCategoryIds = mappings
      .filter(m => m.group_id === group.id)
      .map(m => m.category_id);
    
    const groupCategories = categories.filter(c => groupCategoryIds.includes(c.id));
    const groupCategoryNames = groupCategories.map(c => c.name);

    // Calculate total budget for this group
    const budget = groupCategories.reduce((sum, cat) => 
      sum + (cat.monthly_budget || 0), 0
    );

    // Calculate spent this month
    const spent = transactions
      .filter(t =>
        groupCategoryNames.includes(t.category) &&
        isAfter(new Date(t.date), currentMonthStart)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const percentage = budget > 0 ? (spent / budget) * 100 : 0;

    return {
      category: group.name,
      percentage,
      actual: spent,
      budget,
      color: group.color,
    };
  }).filter(g => g.budget > 0);
};