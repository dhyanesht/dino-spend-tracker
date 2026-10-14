import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { isRefund } from "@/lib/transactionMath";
import { formatCurrency } from "@/lib/utils";

const groupByOriginal = (txns: Transaction[]) => {
  const by: Record<string, { refunded: number; rows: Transaction[] }> = {};
  txns.filter(isRefund).forEach((t) => {
    const key = t.linked_transaction_id || "unknown";
    if (!by[key]) by[key] = { refunded: 0, rows: [] };
    by[key].refunded += Number(t.amount);
    by[key].rows.push(t);
  });
  return by;
};

export const RefundReport = () => {
  const { data = [] } = useTransactions();
  const by = groupByOriginal(data);
  const items = Object.entries(by);
  const total = items.reduce((s, [, v]) => s + v.refunded, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refunds</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Original ID</TableHead>
              <TableHead>Total Refunded</TableHead>
              <TableHead>Refunds</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={3}>No refunds</TableCell></TableRow>
            )}
            {items.map(([key, v]) => (
              <TableRow key={key}>
                <TableCell className="font-mono text-xs">{key}</TableCell>
                <TableCell>{formatCurrency(v.refunded)}</TableCell>
                <TableCell>{v.rows.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-sm">Total: {formatCurrency(total)}</p>
      </CardContent>
    </Card>
  );
};

