# Create Schema Skill

## Description
Create a Zod validation schema following the VehicleBook project pattern.

## Instructions

### File location
`schemas/{entity}.ts`

### Template

```tsx
import { z } from "zod";

export const createLenderSchema = z.object({
    name: z
        .string()
        .min(1, { message: "Lender name is required" })
        .max(100, { message: "Name must be less than 100 characters" }),
    phone: z
        .string()
        .max(15, { message: "Phone must be less than 15 characters" })
        .optional(),
    address: z
        .string()
        .max(300, { message: "Address must be less than 300 characters" })
        .optional(),
    remarks: z
        .string()
        .max(500, { message: "Remarks must be less than 500 characters" })
        .optional(),
});

export type CreateLenderData = z.infer<typeof createLenderSchema>;

export const updateLenderSchema = createLenderSchema.extend({
    _id: z.string(),
});

export type UpdateLenderData = z.infer<typeof updateLenderSchema>;
```

### Amount / Currency fields

Vehicle shop deals with Indian Rupees. Use `z.coerce.number()` for amount fields:

```tsx
// For purchase price, sale price, costs, payments
purchasePrice: z.coerce
    .number({ message: "Amount must be a number" })
    .min(0, { message: "Amount cannot be negative" }),

// For optional amounts (e.g., consignment purchasePrice)
purchasePrice: z.coerce
    .number()
    .min(0, { message: "Amount cannot be negative" })
    .optional()
    .default(0),
```

### Payment mode enum

```tsx
mode: z.enum(
    ['Cash', 'Online', 'Cheque', 'UPI', 'GPay', 'Finance', 'Bank Transfer'],
    { message: "Payment mode is required" }
),
```

### Date fields

```tsx
date: z.coerce.date({ message: "Date is required" }),
// or for optional dates:
dateSold: z.coerce.date().optional(),
```

### Key conventions
- `z.coerce.number()` for numeric fields from form inputs
- `z.coerce.date()` for date fields
- Custom `{ message: "..." }` on every validation rule
- Export schema AND inferred type
- `.optional()` for non-required fields
- Reuse create schema for update via `.extend()`
- `_id` (MongoDB ObjectId as string) instead of `id` or `uuid`
