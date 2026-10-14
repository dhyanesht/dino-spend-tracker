import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, RefreshCcw, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  trueIncome: number;
  expenses: number;
  refunds: number;
  reimbursements: number;
  netCashFlow: number;
  includePending: boolean;
}

export const CashFlowCard = ({ trueIncome, expenses, refunds, reimbursements, netCashFlow, includePending }: Props) => (
  <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">Cash Flow (Net)</CardTitle>
      <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-3">{formatCurrency(netCashFlow)}</div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />True Income</span>
          <span className="font-medium text-green-600">{formatCurrency(trueIncome)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowDownRight className="h-3 w-3" />Expenses</span>
          <span className="font-medium text-red-600">{formatCurrency(expenses)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><RefreshCcw className="h-3 w-3" />Refunds</span>
          <span className="font-medium text-emerald-600">+{formatCurrency(refunds)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Reimbursements</span>
          <span className="font-medium text-blue-600">+{formatCurrency(reimbursements)}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Pending: {includePending ? "included" : "excluded"}</p>
    </CardContent>
  </Card>
);

