import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { isReimbursement } from "@/lib/transactionMath";
import { formatCurrency } from "@/lib/utils";

export const ReimbursementReport = () => {
  const { data = [] } = useTransactions();
  const items = (data as Transaction[]).filter(isReimbursement);
  const total = items.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimbursements</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={4}>No reimbursements</TableCell></TableRow>
            )}
            {items.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.date}</TableCell>
                <TableCell className="font-mono text-xs">{t.linked_transaction_id}</TableCell>
                <TableCell>{t.reimbursement_expected_date || "-"}</TableCell>
                <TableCell>{formatCurrency(Number(t.amount))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-sm">Total: {formatCurrency(total)}</p>
      </CardContent>
    </Card>
  );
};

