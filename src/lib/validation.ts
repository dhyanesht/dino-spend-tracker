import { z } from 'zod';

// Transaction validation schema
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const minDate = new Date('1900-01-01');
      return date <= now && date >= minDate && !isNaN(date.getTime());
    }, 'Date must be between 1900 and today'),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['expense', 'income'], { 
    errorMap: () => ({ message: 'Type must be expense or income' })
  })
});

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
