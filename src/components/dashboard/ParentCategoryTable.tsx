import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ParentCategoryTableProps {
  data: Array<{
    parentCategory: string;
    months: Record<string, number>;
    subcategories: Array<{
      name: string;
      months: Record<string, number>;
    }>;
  }>;
  monthColumns: string[];
}

const ParentCategoryTable = ({ data, monthColumns }: ParentCategoryTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (categoryName: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">Category Spending by Month</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Category</TableHead>
              {monthColumns.map((month) => (
                <TableHead key={month} className="text-right">
                  {month}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((parent) => {
              const isExpanded = expandedRows.has(parent.parentCategory);
              const parentTotal = Object.values(parent.months).reduce((sum, val) => sum + val, 0);
              
              return (
                <React.Fragment key={parent.parentCategory}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(parent.parentCategory)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {parent.parentCategory}
                      </div>
                    </TableCell>
                    {monthColumns.map((month) => (
                      <TableCell key={month} className="text-right">
                        ${(parent.months[month] || 0).toFixed(2)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold">
                      ${parentTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && parent.subcategories.map((sub) => {
                    const subTotal = Object.values(sub.months).reduce((sum, val) => sum + val, 0);
                    return (
                      <TableRow key={sub.name} className="bg-muted/20">
                        <TableCell className="pl-12 text-sm text-muted-foreground">
                          {sub.name}
                        </TableCell>
                        {monthColumns.map((month) => (
                          <TableCell key={month} className="text-right text-sm">
                            ${(sub.months[month] || 0).toFixed(2)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right text-sm">
                          ${subTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default ParentCategoryTable;
