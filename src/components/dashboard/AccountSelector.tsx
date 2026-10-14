import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star } from 'lucide-react';
import { useAccounts, type Account } from '@/hooks/useAccounts';

interface AccountSelectorProps {
  value?: string;
  onChange: (id: string) => void;
  accounts?: Pick<Account, 'id' | 'name' | 'type' | 'balance' | 'is_active' | 'is_primary'>[];
  placeholder?: string;
  excludeId?: string;
  id?: string;
}

const fmt = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

/** Wrapper that loads accounts unless they are passed in (keeps the view testable). */
const AccountSelector = (props: AccountSelectorProps) =>
  props.accounts ? <AccountSelectorView {...props} accounts={props.accounts} /> : <AccountSelectorLoaded {...props} />;

const AccountSelectorLoaded = (props: AccountSelectorProps) => {
  const { data = [] } = useAccounts();
  return <AccountSelectorView {...props} accounts={data} />;
};

export const AccountSelectorView = ({ value, onChange, accounts = [], placeholder = 'Select account', excludeId, id }: AccountSelectorProps) => {
  const options = accounts.filter((a) => a.is_active && a.id !== excludeId);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            <span className="inline-flex items-center gap-1">
              {a.is_primary && <Star className="h-3 w-3 fill-primary text-primary" aria-label="Primary" />}
              {a.name}
              <span className="text-muted-foreground text-xs">· {fmt(Number(a.balance))}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AccountSelector;
