import { z } from 'zod';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const transactionTypeSchema = z.enum(['expense', 'income', 'transfer', 'refund', 'reimbursement']);
export const transactionStatusSchema = z.enum(['pending', 'posted']);
export const incomeCategorySchema = z.enum(['salary', 'interest', 'dividends', 'refund', 'reimbursement', 'other']);
export const accountTypeSchema = z.enum(['checking', 'savings', 'credit_card', 'investment', 'cash', 'other']);

// Transaction validation schema (spec §7.1)
export const transactionSchema = z.object({
  description: z.string()
    .trim()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount is too large')
    .finite('Amount must be a valid number'),
  date: z.string()
    .regex(isoDate, 'Invalid date format')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date <= new Date() && date >= new Date('1900-01-01');
    }, 'Date must be between 1900 and today'),
  category: z.string().min(1).optional(),
  type: z.enum(['expense', 'income']).default('expense'),
  transaction_type: transactionTypeSchema.default('expense'),
  account_id: z.string().uuid('Account is required'),
  status: transactionStatusSchema.default('posted'),
  linked_transaction_id: z.string().uuid().nullable().optional(),
  transfer_pair_id: z.string().uuid().nullable().optional(),
  income_category: incomeCategorySchema.nullable().optional(),
  reimbursement_expected_date: z.string().regex(isoDate).nullable().optional(),
}).refine((d) => {
  if (d.transaction_type === 'expense') return Boolean(d.category);
  if (d.transaction_type === 'transfer') return Boolean(d.transfer_pair_id);
  if (d.transaction_type === 'refund' || d.transaction_type === 'reimbursement') return Boolean(d.linked_transaction_id);
  if (d.transaction_type === 'income') return Boolean(d.income_category);
  return true;
}, { message: 'Missing required fields for transaction type' });

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  type: accountTypeSchema,
  balance: z.number().finite().optional(),
  currency: z.string().trim().length(3).default('USD'),
  is_active: z.boolean().default(true),
  is_primary: z.boolean().default(false),
});
export type AccountInput = z.infer<typeof accountSchema>;

// Category validation schema
export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  type: z.enum(['fixed', 'variable'], {
    errorMap: () => ({ message: 'Type must be fixed or variable' })
  }),
  monthly_budget: z.number()
    .nonnegative('Budget cannot be negative')
    .max(1000000, 'Budget is too large')
    .finite('Budget must be a valid number'),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  parent_category: z.string().nullable()
});

// Store validation schema
export const storeSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Store name is required')
    .max(150, 'Store name must be less than 150 characters'),
  category_name: z.string()
    .min(1, 'Category is required')
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type StoreInput = z.infer<typeof storeSchema>;
