# Create Component Skill

## Description
Scaffold a new route folder following the VehicleBook project pattern with `page.tsx` (server component) + `components/` folder with barrel export.

## Instructions

When the user asks to create a new route/page/module, follow this exact pattern:

### 1. Page file (`page.tsx`)
- Must be an **async server component** (no "use client")
- Fetch initial data using `getToken()` from `@lib/getToken` and `axios` from `@config/axios`
- Inline the fetch function in the same file (don't create a separate service unless it's reused in 2+ pages)
- Pass `initialData` as a prop to the main client component
- Wrap in `<section className="flex w-full flex-col pb-2">`
- Always add `export const metadata: Metadata`

```tsx
import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { LenderList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Lenders` };

const LenderPage = async () => {
    const initialData = await fetchLenders();
    return (
        <section className="flex w-full flex-col pb-2">
            <LenderList initialData={initialData} />
        </section>
    );
};
export default LenderPage;

const fetchLenders = async (): Promise<LenderPaginatedData | null> => {
    const token = await getToken();
    try {
        const response = await axios.get<LendersResponse>("/lenders", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 10 },
        });
        return response?.data?.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching lenders:", errorData?.message);
        return null;
    }
};
```

### 2. Client component — `useQuery + initialData` (REQUIRED)

**NEVER use `useState` to hold server-fetched data.** Always pass `initialData` into `useQuery` to hydrate React Query's cache.

```tsx
// components/lender-list.tsx
"use client";
import { useQuery, QueryKey } from "@tanstack/react-query";
import axios from "@config/axios";

type LenderListProps = {
    initialData: LenderPaginatedData | null;
};

const fetchLenders = async (): Promise<LenderPaginatedData | null> => {
    const response = await axios.get<LendersResponse>("/lenders", {
        params: { page: 1, limit: 10 },
    });
    return response.data.data ?? null;
};

const LenderList = ({ initialData }: LenderListProps) => {
    const { data } = useQuery<LenderPaginatedData | null>({
        queryKey: ["lenders"],
        queryFn: fetchLenders,
        initialData: initialData,
        retry: 0,
    });

    if (!data || data.results.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map(lender => (
                <LenderCard key={lender._id} lender={lender} />
            ))}
        </div>
    );
};

export default LenderList;
```

### 3. Mutation pattern

`mutationFn` is a **named standalone `const`** defined before `useMutation`. Call `toast.loading` inside it directly. Store toast ID in state so `onSuccess`/`onError` can update the **same toast**.

```tsx
const [onAddToast, setOnAddToast] = useState<string | number>();
const queryClient = useQueryClient();

// ✅ Named function — toast.loading INSIDE, before axios call
const createLenderRequest = async (values: z.infer<typeof createLenderSchema>) => {
    setOnAddToast(toast.loading("Creating…", { description: "Please wait while we add the lender!" }));
    const payload = {
        name: values?.name,
        phone: values?.phone,
        address: values?.address,
        remarks: values?.remarks,
    };
    return await axios.post("/lenders", payload);
};

const { mutate, isPending } = useMutation({
    mutationFn: createLenderRequest,
    onSuccess: async () => {
        toast.success("Success!", { id: onAddToast, description: "Lender created successfully!" });
        queryClient.invalidateQueries({ queryKey: ["lenders"] });
        queryClient.invalidateQueries({ queryKey: ["lender-summary"] });
        form.reset();
        setOpen(false);
    },
    onError: (error: unknown) => {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        const fieldErrors = formatApiErrors(errorData?.errors);
        const errorMessage = fieldErrors || errorData?.message || "An error occurred!";
        toast.error("Error!", { id: onAddToast, description: errorMessage });
    },
});
```

### 4. Dialog structure — full reference pattern

Every create/edit dialog must follow this exact structure. `DialogContent` has `overflow-hidden p-0`. Body uses `ScrollArea`, footer sticks at bottom.

```tsx
<Dialog open={open} onOpenChange={setOpen} aria-hidden={!open}>
    <DialogTrigger asChild>
        <Button className="bg-gradient-brand cursor-pointer text-white shadow-lg hover:opacity-90">
            <Plus size={18} className="mr-2" />
            Add Lender
        </Button>
    </DialogTrigger>
    <DialogContent
        onOpenAutoFocus={event => event.preventDefault()}
        aria-label="Create Lender Dialog"
        className={cn("overflow-hidden p-0 sm:max-w-lg", "bg-card border-border")}
    >
        {/* ─── Gradient Header ─── */}
        <div className="bg-gradient-brand relative p-4 sm:p-6">
            <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-white/15 blur-2xl sm:h-32 sm:w-32" />
            <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-white/15 blur-2xl sm:h-32 sm:w-32" />

            <div className="relative flex items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-lg backdrop-blur-sm sm:h-14 sm:w-14 sm:rounded-xl">
                    <Users className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-1.5 sm:mb-1 sm:gap-2">
                        <Sparkles className="h-3 w-3 text-white/70 sm:h-4 sm:w-4" />
                        <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase sm:text-xs">
                            New
                        </span>
                    </div>
                    <DialogTitle className="m-0 text-lg font-bold text-white sm:text-2xl">
                        Add Lender
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 hidden text-xs text-white/70 sm:mt-1 sm:block sm:text-sm">
                        Fill in the details to register a new investor
                    </DialogDescription>
                </div>
            </div>
        </div>

        {/* ─── Form ─── */}
        <Form {...form}>
            <form id="create-lender-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex w-full flex-1 flex-col">

                {/* ─── Scrollable Body ─── */}
                <ScrollArea className="max-h-[60vh] w-full sm:max-h-[400px]">
                    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

                        {/* Input with icon prefix */}
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground font-semibold">
                                    Lender Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                            <Users size={18} />
                                        </div>
                                        <Input
                                            placeholder="Enter lender name"
                                            className={cn("h-10 rounded-lg pl-10 sm:h-12", "bg-muted/50 border-border", "focus-visible:ring-ring focus-visible:border-primary", "placeholder:text-muted-foreground")}
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-destructive" />
                            </FormItem>
                        )} />

                        {/* Textarea with icon (icon at top-3 instead of centered) */}
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground font-semibold">Address</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <div className="text-muted-foreground absolute top-3 left-3">
                                            <MapPin size={18} />
                                        </div>
                                        <Textarea
                                            placeholder="Enter address"
                                            rows={3}
                                            className={cn("resize-none rounded-lg pt-3 pl-10", "bg-muted/50 border-border", "focus-visible:ring-ring focus-visible:border-primary", "placeholder:text-muted-foreground")}
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-destructive" />
                            </FormItem>
                        )} />

                    </div>
                </ScrollArea>

                {/* ─── Sticky Footer ─── */}
                <div className="border-border bg-muted/30 border-t p-4 pt-3 sm:p-6 sm:pt-4">
                    <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <Button disabled={isPending} type="button" variant="outline" onClick={() => setOpen(false)}
                            className={cn("cursor-pointer", "border-border text-foreground", "hover:bg-muted")}>
                            <X size={18} className="mr-2" /> Cancel
                        </Button>
                        <Button disabled={isPending} type="submit" form="create-lender-form"
                            className={cn("cursor-pointer", "bg-gradient-brand text-white", "shadow-md hover:opacity-90")}>
                            {isPending ? (
                                <><Loader2 size={18} className="mr-2 animate-spin" /> Creating…</>
                            ) : (
                                <><Plus size={18} className="mr-2" /> Add Lender</>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    </DialogContent>
</Dialog>
```

**Dialog structure rules:**

| Section | Class | Behavior |
|---------|-------|----------|
| `DialogContent` | `overflow-hidden p-0 sm:max-w-lg bg-card border-border` | No padding, overflow hidden |
| Gradient header | `bg-gradient-brand relative p-4 sm:p-6` | Blur circles + icon badge + Sparkles badge + title |
| Form body | `<ScrollArea className="max-h-[60vh] sm:max-h-[400px]">` | Scrollable, respects viewport |
| Sticky footer | `border-t bg-muted/30 p-4 pt-3 sm:p-6 sm:pt-4` | Always visible at bottom |
| Cancel | `variant="outline"` + `<X />` icon | Left on desktop, bottom on mobile |
| Submit | `bg-gradient-brand text-white` + `<Loader2 />` spinner | Right on desktop, top on mobile |

### 5. Toast pattern

```tsx
import { toast } from "sonner";

// Loading → Success (same toast transitions seamlessly):
const [toastId, setToastId] = useState<string | number>();
setToastId(toast.loading("Creating…", { description: "Please wait." }));
// onSuccess:
toast.success("Success!", { id: toastId, description: "Created successfully!" });
// onError:
toast.error("Error!", { id: toastId, description: errorMessage });

// Simple one-off toasts:
toast.success("Copied!", { description: "ID copied to clipboard." });
toast.error("Failed!", { description: "Something went wrong." });
toast.warning("Warning!", { description: "Outstanding balance is ₹24,69,400." });
```

- `toast.loading()` goes inside `mutationFn`, before `axios` call
- Store toast ID in state → use `id: toastId` in success/error to **replace** the same toast
- Every toast must include `description`

### 6. Components folder (`components/`)
Create these files:
- `index.ts` — Barrel export (see format below)
- `entity-list.tsx` — Main list component ("use client") with `useQuery + initialData`
- `entity-card.tsx` — Card display component
- `create-entity-dialog.tsx` — Dialog with gradient header + form + toast (see §4)
- `view-entity-dialog.tsx` — Read-only detail dialog
- `update-entity-dialog.tsx` — Edit dialog with form pre-filled
- `delete-entity-dialog.tsx` — Confirmation dialog with AlertDialog + mutation

**`index.ts` REQUIRED format — named imports + single export statement:**
```ts
import EntityList from "./entity-list";
import EntityCard from "./entity-card";
import CreateEntityDialog from "./create-entity-dialog";
import ViewEntityDialog from "./view-entity-dialog";
import UpdateEntityDialog from "./update-entity-dialog";
import DeleteEntityDialog from "./delete-entity-dialog";

export { EntityList, EntityCard, CreateEntityDialog, ViewEntityDialog, UpdateEntityDialog, DeleteEntityDialog };
```

- **Never** write `export { default as X } from "./x"`
- Cross-imports **within** the components folder must use the barrel (`from "."`) not direct relative paths

### 7. Supporting files
- Add Zod schema in `schemas/{entity}.ts`
- Add ambient types in `types/{Entity}.d.ts`
- Add constants in `data/` and export from `data/index.ts`
- Add shared hook `hooks/use-{entities}.ts` only if fetched in 2+ client components

### 8. Domain-specific: Currency and IDs
- All amounts: use `formatINR()` from `@lib/currency` (Indian number system: ₹12,34,567)
- All auto-generated IDs: render with monospace font (`font-mono`)
- Payment modes: use the `PaymentMode` type from `types/`

### Key conventions
- Client components: `"use client"` directive at top
- Forms: React Hook Form + Zod + `@hookform/resolvers/zod`
- API calls in server (`page.tsx`): manual `Authorization: Bearer ${token}` header
- API calls in client components: `axios` from `@config/axios` (token auto-injected by interceptor)
- Mutations: `useMutation` with `queryClient.invalidateQueries`
- Toasts: `toast` from `sonner` — loading → success/error pattern with `toastId`
- Icons: `lucide-react`
- Styling: Tailwind with `cn()` from `@lib/utils`
- Theme: dark mode default — `defaultTheme="dark"` in AppProvider
