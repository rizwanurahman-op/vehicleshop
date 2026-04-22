export const VEHICLE_TYPES = [
    { value: "two_wheeler", label: "Two Wheeler 🏍️" },
    { value: "four_wheeler", label: "Four Wheeler 🚗" },
] as const;

export const VEHICLE_MAKES_2W = [
    "Honda", "Suzuki", "TVS", "Bajaj", "Royal Enfield", "Hero", "Yamaha", "KTM", "Kawasaki", "Activa", "Access", "Jupiter", "Pulsar", "Other"
];

export const VEHICLE_MAKES_4W = [
    "Maruti Suzuki", "Hyundai", "Toyota", "Honda", "Ford", "Volkswagen", "Tata", "Mahindra", "Kia", "MG", "Renault", "Nissan", "Skoda", "Jeep", "Other"
];

export const VEHICLE_STATUSES = [
    { value: "in_stock", label: "In Stock", color: "green" },
    { value: "reconditioning", label: "Reconditioning", color: "yellow" },
    { value: "ready_for_sale", label: "Ready for Sale", color: "blue" },
    { value: "sold", label: "Sold ✅", color: "indigo" },
    { value: "sold_pending", label: "Sold (Pending)", color: "orange" },
    { value: "exchanged", label: "Exchanged", color: "purple" },
] as const;

export const SALE_STATUSES = [
    { value: "fully_received", label: "Fully Received ✅", color: "green" },
    { value: "balance_pending", label: "Balance Pending ⚠️", color: "yellow" },
    { value: "noc_pending", label: "NOC Pending 📄", color: "orange" },
    { value: "noc_cash_pending", label: "NOC + Cash Pending ⚠️", color: "red" },
] as const;

export const NOC_STATUSES = [
    { value: "not_applicable", label: "Not Applicable" },
    { value: "pending", label: "Pending" },
    { value: "received", label: "Received" },
    { value: "submitted", label: "Submitted" },
    { value: "completed", label: "Completed" },
] as const;

export const COST_CATEGORIES = [
    { key: "travelCost", category: "travel", label: "Travel Cost", icon: "🚌" },
    { key: "workshopRepairCost", category: "workshop", label: "Workshop / Repair", icon: "🔧" },
    { key: "sparePartsAccessories", category: "spareParts", label: "Spare Parts / Accessories", icon: "⚙️" },
    { key: "alignmentWork", category: "alignment", label: "Alignment Work", icon: "🎯" },
    { key: "paintingPolishingCost", category: "painting", label: "Painting / Polishing", icon: "🎨" },
    { key: "washingDetailingCost", category: "washing", label: "Washing / Detailing", icon: "🫧" },
    { key: "fuelCost", category: "fuel", label: "Fuel", icon: "⛽" },
    { key: "paperworkTaxInsurance", category: "paperwork", label: "Paperwork / Tax / Insurance", icon: "📋" },
    { key: "commission", category: "commission", label: "Commission", icon: "💼" },
    { key: "otherExpenses", category: "other", label: "Other Expenses", icon: "📦" },
] as const;

export const PURCHASE_PAYMENT_MODES = ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"] as const;
export const SALE_PAYMENT_MODES = ["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"] as const;

export const FUNDING_SOURCES = [
    { value: "own", label: "Own Money", icon: "👤", description: "Shop owner's personal capital" },
    { value: "investor", label: "Investor", icon: "🏦", description: "Borrowed from a single investor" },
    { value: "mixed", label: "Mixed", icon: "🔄", description: "Partial own + partial investor" },
] as const;

export const DOCUMENT_TYPES = [
    { value: "rc_book", label: "RC Book" },
    { value: "insurance", label: "Insurance" },
    { value: "noc", label: "NOC" },
    { value: "invoice", label: "Invoice" },
    { value: "photo", label: "Vehicle Photo" },
    { value: "other", label: "Other" },
] as const;
