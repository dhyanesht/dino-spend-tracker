import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccounts, useAddAccount, useDeleteAccount, useSetPrimaryAccount, useUpdateAccount } from "@/hooks/useAccounts";
import { accountSchema } from "@/lib/validation";
import { formatCurrency } from "@/lib/utils";

const ACCOUNT_TYPES = ["checking","savings","credit_card","investment","cash","other"] as const;

export const AccountsManager = () => {
  const { data = [] } = useAccounts();
  const add = useAddAccount();
  const update = useUpdateAccount();
  const del = useDeleteAccount();
  const setPrimary = useSetPrimaryAccount();
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof ACCOUNT_TYPES[number]>("checking");
  const [isPrimary, setIsPrimary] = useState(false);

  const handleAdd = async () => {
    const parsed = accountSchema.safeParse({ name, type, is_primary: isPrimary });
    if (!parsed.success) return alert(parsed.error.issues[0]?.message || "Invalid");
    await add.mutateAsync(parsed.data);
    setName(""); setIsPrimary(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle>Accounts</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Checking" />
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v)=>setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <Checkbox id="primary" checked={isPrimary} onCheckedChange={(v)=>setIsPrimary(!!v)} />
            <Label htmlFor="primary">Primary</Label>
          </div>
          <Button onClick={handleAdd} disabled={add.isPending}>Add</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Balance</TableHead><TableHead>Primary</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a:any)=>(
              <TableRow key={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{formatCurrency(Number(a.balance)||0)}</TableCell>
                <TableCell>{a.is_primary ? "Yes" : "No"}</TableCell>
                <TableCell>{a.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="flex gap-1 flex-wrap">
                  {!a.is_primary && <Button size="sm" variant="outline" onClick={()=>setPrimary.mutate(a.id)}>Set Primary</Button>}
                  <Button size="sm" variant="outline" onClick={()=>update.mutate({ id: a.id, updates: { is_active: !a.is_active } })}>{a.is_active ? "Deactivate" : "Activate"}</Button>
                  <Button size="sm" variant="destructive" onClick={()=>del.mutate(a.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

