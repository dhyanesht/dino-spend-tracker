# Categorization Rules Specification

**Source of truth:** `src/lib/validation.ts`, `supabase/migrations/20251020041945...sql`, `supabase/functions/categorize-transactions/index.ts`, `src/components/dashboard/CSVImporter.tsx`, `src/hooks/useCategories.ts`

---

## Subcategory-Only Rule

### Rule Statement

> A transaction's `category` field must reference a **subcategory** (i.e., a `categories` row where `parent_category IS NOT NULL`). Parent categories (`parent_category IS NULL`) are forbidden.

**References:** `ADR-007` (`scaling_up/adr.md:121-134`), `validate_transaction_category()` trigger.

### Enforcement Layers

| Layer | Mechanism | Source |
|-------|-----------|--------|
| Database | `validate_transaction_category()` trigger (BEFORE INSERT + BEFORE UPDATE) | `supabase/migrations/20251020041945...sql:2-31` |
| Client (CSV import) | Explicit check: `categories.find(cat => cat.name === matchedStore.category_name).parent_category === null` | `CSVImporter.tsx:333-336` |
| Client (manual category change) | Same pattern in `handleCategoryChange` | `CSVImporter.tsx:472-480` |
| Client (AI categorization) | Filter out parent categories: `cat.parent_category !== null` required | `CSVImporter.tsx:552-556` |

### Trigger Logic (DB-level)

```sql
CREATE OR REPLACE FUNCTION public.validate_transaction_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.categories
    WHERE name = NEW.category
      AND parent_category IS NULL
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Transactions cannot be assigned to parent categories. Please use a subcategory instead.';
  END IF;
  RETURN NEW;
END;
$$;
```

**Fires on:**
- `BEFORE INSERT ON transactions FOR EACH ROW`
- `BEFORE UPDATE ON transactions FOR EACH ROW WHEN (OLD.category IS DISTINCT FROM NEW.category)`

### Test Oracles

#### Oracle C-01: Parent category rejected on INSERT
```
Given: category "Food & Dining" exists with parent_category = NULL for user U
When: INSERT INTO transactions (user_id, description, amount, category, date, type)
      VALUES (U, 'Lunch', 15.00, 'Food & Dining', '2024-01-15', 'expense')
Then: RAISE EXCEPTION (transaction NOT inserted)
```

#### Oracle C-02: Subcategory accepted on INSERT
```
Given: category "Groceries" exists with parent_category = "Everyday" for user U
When: INSERT INTO transactions (user_id, description, amount, category, date, type)
      VALUES (U, 'Costco', 50.00, 'Groceries', '2024-01-15', 'expense')
Then: Row is inserted successfully
```

#### Oracle C-03: Parent category rejected on UPDATE
```
Given: a transaction with category "Groceries"
When: UPDATE transactions SET category = 'Food & Dining' WHERE id = <id>
Then: RAISE EXCEPTION
And: category remains "Groceries"
```

#### Oracle C-04: Category update to same value does not fire trigger
```
Given: a transaction with category "Groceries"
When: UPDATE transactions SET description = 'Updated desc' WHERE id = <id>
Then: Trigger does NOT fire (OLD.category IS DISTINCT FROM NEW.category is false)
```

#### Oracle C-05: Non-existent category is NOT rejected by trigger
```
Given: category "NonExistent" does not exist in categories table
When: INSERT INTO transactions ... category = 'NonExistent'
Then: Trigger does NOT raise (no matching parent_category = NULL row found)
And: Transaction IS inserted (the category name is stored as free text, no FK)
```

> **Risk:** This means typos in category names silently create orphaned transactions. The client Zod schema only checks `category: z.string().min(1)` — it does not validate against the categories table.

---

## Store Mapping Categorization Rules

**Source:** `src/hooks/useStores.ts:95-173` (`findBestStoreMatch`)

### Matching Priority

1. Exact case-insensitive match on store name
2. Substring containment: store name ⊂ description (store name > 3 chars)
3. Substring containment: description ⊂ store name (description > 3 chars)
4. Fuzzy Levenshtein match (weighted 60% full + 40% prefix, threshold > 0.75)
5. Keyword matching fallback

### Client-Side Store Category Validation

When a store match is found during CSV import:

```typescript
// CSVImporter.tsx:333-353
const matchedCategory = categories.find(cat => cat.name === matchedStore.category_name);
if (matchedCategory?.parent_category === null) {
  // Parent category → reject, treat as unmatched
}
```

**Invariant:** If the matched store's `category_name` resolves to a parent category, the match is **rejected** and the store is added to the "unmatched" set for AI categorization or manual assignment.

### Test Oracle C-06: Store with parent category falls back to unmatched
```
Given: store "Amazon" maps to category_name = "Shopping" (a parent category, parent_category = NULL)
When: CSVImporter processes a transaction with description "Amazon"
Then: findBestStoreMatch returns the store
And: categories.find(c => c.name === "Shopping").parent_category === null
And: store is treated as UNMATCHED
And: category defaults to "Other" (or assigned via AI)
```

---

## AI Categorization Contract

**Source:** `supabase/functions/categorize-transactions/index.ts`, `CSVImporter.tsx:499-595`

### Edge Function: `categorize-transactions`

#### Request

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `transactions` | Array | Yes | Array of `{ description: string, amount: number, date: string, storeName?: string }` |
| `categories` | Array | Yes | Array of `{ name: string, parent?: string }` |

```json
{
  "transactions": [
    {
      "description": "STARBUCKS #12345",
      "amount": 5.75,
      "date": "2024-01-15"
    }
  ],
  "categories": [
    { "name": "Coffee & Snacks", "parent": "Food & Dining" },
    { "name": "Restaurants", "parent": "Food & Dining" }
  ]
}
```

#### Environment Variables

| Variable | Access | Purpose |
|----------|--------|---------|
| `LOVABLE_API_KEY` | `Deno.env.get('LOVABLE_API_KEY')` | Bearer token for Lovable AI Gateway |

#### AI API Call

| Property | Value |
|----------|-------|
| URL | `https://ai.gateway.lovable.dev/v1/chat/completions` |
| Model | `google/gemini-2.5-flash` |
| Temperature | `0.3` |
| Auth | `Authorization: Bearer ${LOVABLE_API_KEY}` |

#### Prompt Template

```
You are a financial transaction categorization assistant.
Analyze these transaction descriptions and assign the most appropriate category to each one.

Available categories: {categoryList}

Rules:
- Choose the MOST SPECIFIC category that fits
- If no specific category fits, use "Other"
- Be consistent with similar transactions
- Consider common merchant names and patterns

Transactions to categorize:
{csvData}
```

The prompt includes the **storeName** for each transaction (extracted from `parseResults.unmatchedStores`):

```typescript
const transactionsToCategorize = parseResults.unmatchedStores.map(store => ({
  storeName: store.name,
  description: parseResults.success.find(t => t.storeName === store.name)?.description || store.name
}));
```

#### Response

```json
{
  "categorizations": [
    {
      "storeName": "STARBUCKS",
      "category": "Coffee & Snacks"
    }
  ]
}
```

**Note:** The AI response format differs from the `low-level-design.md` which mentions `suggested_category` and `confidence`. The actual implementation returns `storeName` and `category` only (no confidence score).

#### Error Responses

| Error | Trigger Condition | Message |
|-------|-------------------|---------|
| 400 | Invalid input format | `"Invalid transactions array"` or `"Invalid categories array"` |
| 500 | No API key | `"LOVABLE_API_KEY is not configured"` |
| 429 | Rate limit | `"Rate limit exceeded. Please try again in a moment."` |
| 402 | Credits depleted | `"Lovable AI credits depleted. Please add credits to continue."` |
| 500 | AI API error | `"AI API error: {status}"` |
| 500 | Parse failure | `"Failed to parse AI categorization response"` |
| 500 | Invalid format | `"AI returned invalid format"` |

#### Response Parsing

The AI response is parsed with markdown-stripping:
```typescript
const cleanedResponse = aiResponse
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();
categorizations = JSON.parse(cleanedResponse);
```

### Client-Side AI Application

**Source:** `CSVImporter.tsx:541-576`

#### Validation of AI Results

```typescript
// Only accept subcategories — reject parent categories from AI
const validCategorizations = new Map<string, string>();
categorizationMap.forEach((category, storeName) => {
  const cat = categories.find(c => c.name === category);
  if (cat && cat.parent_category !== null) {
    validCategorizations.set(storeName, category);
  }
});
```

**Invariants:**
1. If the AI returns a category name that doesn't exist in `categories` → rejected.
2. If the AI returns a parent category → rejected.
3. If the AI returns "Other" → rejected (it's not in the categories list).
4. Unmatched stores keep their original category ("Other") if AI doesn't suggest a valid subcategory.

#### Application to Transactions

```typescript
const updatedSuccess = parseResults.success.map(transaction => {
  const aiCategory = validCategorizations.get(transaction.storeName || '');
  if (aiCategory && !transaction.matchedStore) {
    return { ...transaction, category: aiCategory };
  }
  return transaction;
});
```

**Only** transactions whose `matchedStore` is `false` receive AI categories. Transactions that already have a valid store match are NOT overwritten by AI.

### Test Oracles

#### Oracle C-07: AI returns parent category → rejected
```
Given: AI returns { storeName: "AMAZON", category: "Shopping" }
And: category "Shopping" has parent_category = NULL
When: client processes AI result
Then: validCategorizations does NOT contain "AMAZON"
And: store keeps its default category "Other"
```

#### Oracle C-08: AI returns non-existent category → rejected
```
Given: AI returns { storeName: "TEST", category: "NonExistent Category" }
And: "NonExistent Category" is not in the categories table
When: client processes AI result
Then: validCategorizations does NOT contain "TEST"
And: store keeps its default category "Other"
```

#### Oracle C-09: AI result applied only to unmatched stores
```
Given: store "STARBUCKS" has matchedStore = true, category = "Coffee & Snacks"
And: AI also returns a categorization for "STARBUCKS"
When: client applies AI results
Then: the store's category is NOT updated (already matched)
```

#### Oracle C-10: AI result applied to unmatched stores only
```
Given: store "NEWSTORE" has matchedStore = false, category = "Other"
And: AI returns { storeName: "NEWSTORE", category: "Gym & Fitness" }
And: "Gym & Fitness" is a valid subcategory
When: client applies AI results
Then: all transactions with storeName = "NEWSTORE" get category = "Gym & Fitness"
And: the unmatched stores list shows "Gym & Fitness"
```

#### Oracle C-11: Manual category change validates against parent categories
```
Given: user is in CSVImporter, changing category for an unmatched store
And: user selects "Food & Dining" (a parent category)
When: handleCategoryChange("NEWCOSTCO", "Food & Dining") is called
Then: categories.find(c => c.name === "Food & Dining").parent_category === null
And: toast error: "Cannot assign parent category to transactions. Please select a subcategory."
And: category is NOT changed
```

---

## Transaction Type Determination

**Source:** `CSVImporter.tsx:377-380`

```typescript
let finalType: 'expense' | 'income' = 'expense';
if (typeStr.includes('income') || typeStr.includes('credit') || parsedAmount < 0) {
  finalType = 'income';
}
```

| Condition | Type |
|-----------|------|
| `typeStr` contains "income" | `income` |
| `typeStr` contains "credit" | `income` |
| `parsedAmount < 0` | `income` |
| Otherwise | `expense` |

**Exception:** Negative amounts are already skipped earlier (`if (parsedAmount < 0) { return; }`), so the `parsedAmount < 0` branch in type determination is effectively dead code for the CSV importer path. Income transactions should come from CSV rows with positive amounts and a type column containing "income" or "credit".

### Test Oracle C-12: Type determination
```
Given: typeStr = "credit", parsedAmount = 100.00
Then: finalType = "income"

Given: typeStr = "debit", parsedAmount = 50.00
Then: finalType = "expense"

Given: typeStr = "" (no type column mapped), parsedAmount = 75.00
Then: finalType = "expense" (default)
```

---

## Bulk Transaction Insert

**Source:** `useTransactions.ts:82-127` (`useAddMultipleTransactions`)

### Contract

| Property | Value |
|----------|-------|
| Validation | Each transaction validated with `transactionSchema.parse()` before insert |
| user_id | Set from `useAuth().user.id` |
| API | `supabase.from('transactions').insert(validatedArray).select()` |
| Cache invalidation | `queryClient.invalidateQueries({ queryKey: ['transactions'] })` |

### Batch Store Insert (during CSV import)

**Source:** `CSVImporter.tsx:602-613` + `useStores.ts:293-345` (`useAddMultipleStores`)

Stores with `category !== 'Other'` are collected from `parseResults.unmatchedStores` and batch-inserted:

```typescript
const newStoresToAdd = parseResults.unmatchedStores
  .filter(store => store.category !== 'Other')
  .map(store => ({ name: store.name, category_name: store.category }));
```

The batch insert hook checks for existing stores first (single `IN` query) to avoid duplicates, then inserts only new ones.

### Test Oracle C-13: Store insert skips category "Other"
```
Given: unmatched stores: [{ name: "NEWMERCHANT", category: "Other" }, { name: "NEWINIT", category: "Groceries" }]
When: importTransactions runs
Then: only "NEWINIT" is added to newStoresToAdd
And: "NEWMERCHANT" is NOT inserted into stores table
```
