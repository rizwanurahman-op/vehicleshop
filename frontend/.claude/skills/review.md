# Code Review Skill

## Description
Review code for VehicleBook project-specific patterns, conventions, and best practices.

## Instructions

When the user asks to review code, check for:

### Structure
- `page.tsx` should only fetch initial data and pass to client components
- Single-use fetchers: inline in `page.tsx`
- Shared fetchers (2+ pages): move to `services/`
- Client-side shared fetching: React Query hooks in `hooks/`
- Each route must have `components/` folder with `index.ts` barrel export
- Static constants/data belong in `data/`, not inline in components

### Barrel export (`index.ts`) — REQUIRED format
```ts
import LenderList from "./lender-list";
import CreateLenderDialog from "./create-lender-dialog";

export { LenderList, CreateLenderDialog };
```
- **Never** use `export { default as X } from "./x"` — always import then export
- All components in the folder must be listed in `index.ts`
- Cross-imports inside the folder use `from "."` not direct relative paths:
  ```ts
  // ✅ correct — inside components/lender-list.tsx
  import { LenderCard, CreateLenderDialog } from ".";

  // ❌ wrong
  import LenderCard from "./lender-card";
  ```

### Data Fetching
- Server components: use `getToken()` from `@lib/getToken` + manual `Authorization` header
- Client components: use `axios` from `@config/axios` (auto-injects token)
- React Query `queryKey` must be consistent (see CLAUDE.md §9 for standard keys)
- Never add `try/catch` inside `queryFn` — only in server `page.tsx` fetch functions
- Mutations must `invalidateQueries` for affected keys
- Check for duplicate fetches that could be shared hooks

### Dialog Structure (CRITICAL)
Every create/edit dialog must follow the standard pattern:
- `DialogContent` → `overflow-hidden p-0 sm:max-w-lg bg-card border-border`
- **Gradient header** → `bg-gradient-brand relative p-4 sm:p-6` with blur circles + icon badge + Sparkles "New" badge + `DialogTitle` + `DialogDescription`
- **Scrollable body** → `<ScrollArea className="max-h-[60vh] sm:max-h-[400px]">`
- **Sticky footer** → `border-t bg-muted/30` with Cancel (outline) + Submit (gradient-brand) buttons
- All input fields must have **icon prefix** (icon inside `absolute left-3`)
- Submit button must show `<Loader2 animate-spin />` when `isPending`
- Cancel button must have `<X />` icon

Common dialog issues:
- `p-6` on `DialogContent` instead of `p-0` (breaks gradient header bleed)
- Missing `onOpenAutoFocus={e => e.preventDefault()}`
- Missing `aria-label` on `DialogContent`
- Footer not sticky (missing `border-t` or not outside `ScrollArea`)
- Missing gradient blur circles in header

### Toast Pattern (CRITICAL)
- `toast.loading()` must be inside the `mutationFn`, before `axios` call
- Store toast ID in state: `const [toastId, setToastId] = useState<string | number>()`
- Use `id: toastId` in `onSuccess`/`onError` to **replace** the loading toast
- Every toast must include both title AND `description`
- Never call `toast.loading()` in `onMutate`

Common toast issues:
- Missing `id` in success/error → creates duplicate toasts instead of replacing
- Missing `description` → looks incomplete
- Toast in `onMutate` instead of `mutationFn`

### Forms
- Must use React Hook Form + Zod schema from `schemas/`
- Use `@hookform/resolvers/zod`
- Controlled `<Select>` must use `value` not `defaultValue`
- Input fields must have icon prefix: `<div className="relative"><div className="absolute top-1/2 left-3 -translate-y-1/2"><Icon /></div><Input className="pl-10" /></div>`
- Textarea icon position: `absolute top-3 left-3` (not vertically centered)

### Types
- Global entity types: `types/*.d.ts` (ambient, no export)
- Zod inferred types: in `schemas/*.ts` (exported)
- Use `_id` (MongoDB) not `id` or `uuid`

### Currency & Formatting
- All amounts MUST use `formatINR()` from `@lib/currency` (Indian number system)
- Never use `toLocaleString('en-US')` or default formatting
- Auto-generated IDs (L001, VH-00001, CS-00001) must render with `font-mono`

### UI
- Shadcn/ui components from `components/ui/`
- `cn()` from `@lib/utils` for conditional classes
- `lucide-react` for icons
- `toast.success()` / `toast.error()` from `sonner`
- Dark mode is default theme
- Buttons in dialogs must have `cursor-pointer` class

### Domain-Specific
- Exchange vehicle: ensure `exchange-vehicle/` components are imported from the top-level shared folder, not duplicated per route
- Payment modes: use `PaymentMode` type, not raw strings
- Vehicle/Consignment status badges: use consistent color coding (see CLAUDE.md §11)
- Phase 2 costs: 10 categories (includes Travel, Alignment)
- Phase 3 costs: 8 categories (no Travel, no Alignment — consignment vehicles are brought to shop)

### Common Issues
- `useState` for values derived from React Query data (anti-pattern)
- Missing error handling in async calls
- Hardcoded values that belong in `data/`
- `Select` not syncing with parent `value` prop
- US number formatting instead of Indian (₹12,34,567)
- Missing `font-mono` on auto-generated IDs
- Dialog missing gradient header structure
- Toast missing `id` linkage (loading → success/error)

### Output Format
1. **Bugs** — Incorrect behavior
2. **Improvements** — Better patterns / performance
3. **Minor** — Style, naming, readability
