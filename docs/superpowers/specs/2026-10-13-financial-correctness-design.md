# Financial Correctness Design Document

**Date:** 2026-10-13
**Status:** Approved for Implementation

---

## Executive Summary

This design addresses fundamental financial modeling problems in the spend tracker:
- Credit card payments counted as spending (double-counting)
- Refunds inflating income reports
- No tracking of reimbursements
- No pending/posted distinction
- No account model for transfers

The solution introduces an account-based model with proper transaction types, linking, and status tracking.

---

## 1. Database Schema Changes

### 1.1 New `accounts` Table

```sql
CREATE TYPE public.account_type AS ENUM (
  'checking', 'savings', 'credit_card', 'investment', 'cash', 'other'
);

CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own accounts" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.accounts FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
```

### 1.2 Extended `transactions` Table

```sql
-- Add new columns to transactions
ALTER TABLE public.transactions ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted'));
ALTER TABLE public.transactions ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income', 'transfer', 'refund', 'reimbursement'));
ALTER TABLE public.transactions ADD COLUMN linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN transfer_pair_id UUID; -- For transfer pairs, set on both sides
ALTER TABLE public.transactions ADD COLUMN income_category TEXT; -- For income: 'salary', 'interest', 'dividends', 'refund', 'reimbursement', 'other'
ALTER TABLE public.transactions ADD COLUMN reimbursement_expected_date DATE; -- For reimbursement type

-- Update existing type column to be transaction_type (keep for backward compat during migration)
-- We'll add a CHECK that type matches transaction_type for legacy rows

CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_transaction_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_linked_transaction_id ON public.transactions(linked_transaction_id);
CREATE INDEX idx_transactions_transfer_pair_id ON public.transactions(transfer_pair_id);
```

### 1.3 Migration Strategy

1. Create `accounts` table
2. Add new columns to `transactions` with defaults
3. Create default "Checking" account for each user
4. Migrate existing transactions: set `account_id` to default checking, `status` = 'posted', `transaction_type` = `type`
5. Add NOT NULL constraints after backfill
6. Create triggers for balance updates

### 1.4 Balance Update Trigger

```sql
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amount_change NUMERIC := 0;
BEGIN
  -- Calculate balance change based on transaction type and account type
  IF TG_OP = 'INSERT' THEN
    CASE NEW.transaction_type
      WHEN 'expense' THEN
        amount_change := -NEW.amount;
      WHEN 'income' THEN
        amount_change := NEW.amount;
      WHEN 'transfer' THEN
        -- Transfer: negative on source account, positive on destination
        -- The pair handles both sides; this trigger fires for each row
        IF NEW.transfer_pair_id IS NOT NULL THEN
          -- Determine if this is source or destination by checking the pair
          -- For simplicity, we use a convention: source account gets negative
          -- This is set by the application when creating the pair
        END IF;
      WHEN 'refund' THEN
        amount_change := NEW.amount; -- Refund adds money back
      WHEN 'reimbursement' THEN
        amount_change := NEW.amount; -- Reimbursement adds money
    END CASE;
    
    IF NEW.account_id IS NOT NULL AND amount_change != 0 THEN
      UPDATE public.accounts
      SET balance = balance + amount_change, updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle balance changes on update (recompute delta)
    -- For simplicity, we recalc by reversing old and applying new
    -- This is complex; alternatively, disallow updating amount/type/account on posted transactions
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the balance change
    CASE OLD.transaction_type
      WHEN 'expense' THEN amount_change := OLD.amount;
      WHEN 'income' THEN amount_change := -OLD.amount;
      WHEN 'refund' THEN amount_change := -OLD.amount;
      WHEN 'reimbursement' THEN amount_change := -OLD.amount;
      WHEN 'transfer' THEN
        -- Transfer deletion handled by pair deletion
    END CASE;
    
    IF OLD.account_id IS NOT NULL AND amount_change != 0 THEN
      UPDATE public.accounts
      SET balance = balance + amount_change, updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();
```

---

## 2. Transaction Type Semantics

| Type | Description | Balance Effect | Linked To | Income Report |
|------|-------------|----------------|-----------|---------------|
| `expense` | Regular spending | -amount on account | — | No |
| `income` | Salary, interest, dividends | +amount on account | — | Yes (if income_category in true income) |
| `transfer` | Move money between accounts | -amount on source, +amount on dest | transfer_pair_id (both sides) | No |
| `refund` | Money returned for purchase | +amount on account | linked_transaction_id (original expense) | No (separate refund report) |
| `reimbursement` | Money received for expense paid | +amount on account | linked_transaction_id (original expense) | No (separate reimbursement report) |

### 2.1 Transfer Pair Creation

When user records a credit card payment:
1. Create transaction A: `transaction_type='transfer'`, `account_id=checking`, `amount=$500`, `transfer_pair_id=<new_uuid>`
2. Create transaction B: `transaction_type='transfer'`, `account_id=credit_card`, `amount=$500`, `transfer_pair_id=<same_uuid>`
3. Both have `status='posted'`

### 2.2 Refund Linking

When refund received:
1. Create transaction: `transaction_type='refund'`, `account_id=<original_account>`, `amount=$50`, `linked_transaction_id=<original_expense_id>`, `income_category='refund'`
2. Original expense remains unchanged (audit trail)
3. Multiple refunds allowed; sum validated ≤ original amount

### 2.3 Reimbursement Linking

When reimbursement received:
1. Create transaction: `transaction_type='reimbursement'`, `account_id=<receiving_account>`, `amount=$100`, `linked_transaction_id=<original_expense_id>`, `reimbursement_expected_date=<date>`
2. Original expense flagged as reimbursed (UI shows badge)

---

## 3. Reporting Logic Changes

### 3.1 Spending Calculations (Expense Overview, Trends)

**Only include:** `transaction_type = 'expense'` AND `status = 'posted'`

**Exclude:** `transfer`, `refund`, `reimbursement`, `income`

### 3.2 Income Calculations

**True Income:** `transaction_type = 'income'` AND `income_category IN ('salary', 'interest', 'dividends', 'other')` AND `status = 'posted'`

**Refunds:** `transaction_type = 'refund'` — separate report

**Reimbursements:** `transaction_type = 'reimbursement'` — separate report

**Transfers:** Never in income

### 3.3 Net Cash Flow

```
Net Cash Flow = True Income - Expenses + Refunds + Reimbursements
```

(Transfers cancel out: -source +dest = 0 net)

### 3.4 Account Balances

Real-time from `accounts.balance` column (maintained by trigger)

### 3.5 Pending Transactions

- Default: excluded from all totals
- UI toggle: "Include pending" to show projected balances
- Pending transfers: both sides pending until both posted

---

## 4. CSV Import Enhancements

### 4.1 Account Detection

- Add account column mapping in CSV importer
- Auto-detect from CSV headers: 'account', 'account name', 'card'
- Default to user's primary checking account

### 4.2 Transfer Detection (Credit Card Payments)

- Detect negative amounts in credit card CSVs (payments to card)
- Detect positive amounts in checking CSVs with description "PAYMENT" / "PYMT"
- Post-import: show "Unmatched Transfers" panel for user to pair

### 4.3 Refund Detection

- Detect "REFUND" / "RETURN" / "CREDIT" in description
- Suggest linking to recent expense at same merchant

### 4.4 Status Handling

- Add status column mapping
- Default: 'posted'
- Some banks include pending flag

---

## 5. UI/UX Changes

### 5.1 Transaction Dialog (SmartTransactionDialog)

- Add account selector (required)
- Add transaction type selector (expense/income/transfer/refund/reimbursement)
- For transfer: show two account selectors (from/to)
- For refund/reimbursement: show link to original transaction picker
- Add status selector (pending/posted)

### 5.2 Transactions List

- Add account filter
- Add transaction type filter
- Add status filter
- Show linked transaction indicator
- Show transfer pair indicator

### 5.3 Reports

- Expense Overview: only expenses
- Income Report: only true income (categorized)
- Refund Report: new page/component
- Reimbursement Report: new page/component
- Net Worth / Cash Flow: new dashboard card

### 5.4 Accounts Management

- New "Accounts" tab in Categories section
- CRUD for accounts
- Show current balance
- Set primary account

---

## 6. API / Edge Function Changes

### 6.1 Categorize Transactions

- No changes needed (categorizes expenses only)

### 6.2 New: Seed Default Accounts

Edge function to create default accounts for new users:
- Checking
- Savings
- Credit Card
- Cash

---

## 7. Validation Rules

### 7.1 Zod Schemas (client)

```typescript
// Extended transaction schema
const transactionSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(1_000_000).finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().min(1), // Required for expense; optional for others
  type: z.enum(['expense', 'income']), // Legacy compat
  transaction_type: z.enum(['expense', 'income', 'transfer', 'refund', 'reimbursement']).default('expense'),
  account_id: z.string().uuid(),
  status: z.enum(['pending', 'posted']).default('posted'),
  linked_transaction_id: z.string().uuid().nullable().optional(),
  transfer_pair_id: z.string().uuid().nullable().optional(),
  income_category: z.enum(['salary', 'interest', 'dividends', 'refund', 'reimbursement', 'other']).optional(),
  reimbursement_expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).refine(data => {
  // Validation rules per transaction_type
  if (data.transaction_type === 'expense' && !data.category) return false;
  if (data.transaction_type === 'transfer' && !data.transfer_pair_id) return false;
  if (data.transaction_type === 'refund' && !data.linked_transaction_id) return false;
  if (data.transaction_type === 'reimbursement' && !data.linked_transaction_id) return false;
  if (data.transaction_type === 'income' && !data.income_category) return false;
  return true;
}, { message: "Missing required fields for transaction type" });
```

### 7.2 Database Triggers

- `validate_transaction_category`: Updated to allow parent category for non-expense types? No — keep subcategory-only for expenses. For other types, category may be optional or use different validation.
- New trigger: `validate_transaction_integrity` for cross-field validation

---

## 8. Backward Compatibility

### 8.1 Legacy `type` Column

- Keep `type` column for read compatibility
- On insert: set `type = transaction_type` for expense/income; `type = 'expense'` for transfer/refund/reimbursement (so legacy queries see them as expenses? No — better: `type = transaction_type` but legacy code only checks expense/income)
- Actually: map `transfer`→`expense`, `refund`→`income`, `reimbursement`→`income` for legacy `type` column
- New code uses `transaction_type` exclusively

### 8.2 Existing Reports

- All existing reports filter on `type = 'expense'` — this will now include transfers/refunds/reimbursements incorrectly
- **Fix:** Update all report queries to use `transaction_type = 'expense'` instead of `type = 'expense'`
- Add migration to set `transaction_type` from `type` for existing rows

---

## 9. Acceptance Criteria

### 9.1 Credit Card Payment (Transfer)

- [ ] User creates checking account and credit card account
- [ ] User records $500 transfer from checking to credit card
- [ ] Checking balance decreases by $500
- [ ] Credit card balance increases by $500 (less negative)
- [ ] Expense Overview shows $0 for this transfer
- [ ] Net worth unchanged

### 9.2 Refund

- [ ] User has $100 expense at "Target"
- [ ] User records $30 refund linked to that expense
- [ ] Account balance increases by $30
- [ ] Expense Overview still shows $100 for Target
- [ ] Refund report shows $30
- [ ] Net spending = $70

### 9.3 Multiple Partial Refunds

- [ ] User has $120 expense
- [ ] Records $50 refund, then $40 refund (same original)
- [ ] Both allowed (sum $90 ≤ $120)
- [ ] Third $50 refund rejected (would exceed $120)

### 9.4 Reimbursement

- [ ] User pays $200 for team lunch (expense)
- [ ] Marks as reimbursable
- [ ] Later receives $200 reimbursement
- [ ] Links reimbursement to original expense
- [ ] Expense Overview shows $200
- [ ] Reimbursement report shows $200
- [ ] Net personal spending = $0

### 9.5 Pending Transactions

- [ ] User imports pending transactions
- [ ] They don't appear in Expense Overview by default
- [ ] Toggle "Include pending" shows projected totals
- [ ] When marked posted, they appear in totals

### 9.6 CSV Import

- [ ] Import detects credit card payment (negative amount)
- [ ] Creates unmatched transfer entry
- [ ] User matches to checking account payment
- [ ] Both sides created with same transfer_pair_id

### 9.7 Historical Data

- [ ] After migration, all existing reports show same numbers
- [ ] No double-counting introduced
- [ ] Account balances computable from transaction history

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Balance trigger bugs | Incorrect account balances | Comprehensive tests; allow manual balance correction |
| Migration data loss | User loses transaction history | Dry-run migration; backup before push |
| Transfer pair inconsistency | One side missing | Application-level validation; DB constraint on pair completeness |
| Refund over-original | Refund exceeds purchase | App validation + DB check trigger |
| Performance on large datasets | Slow balance recalculation | Trigger is O(1) per transaction; indexes on account_id |

---

## 11. Out of Scope (Future Work)

- Multi-currency support
- Investment account tracking (cost basis, gains)
- Recurring transactions / subscriptions
- Bill reminders
- Shared/household accounts
- Plaid integration for automatic balance sync