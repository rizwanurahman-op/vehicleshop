/**
 * Format number to Indian currency string
 * 1234567 → ₹12,34,567
 */
export const formatINR = (amount: number): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
    const num = Math.abs(amount);
    const str = Math.round(num).toString();
    const lastThree = str.slice(-3);
    const rest = str.slice(0, -3);
    const formatted =
        rest.length > 0 ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree : lastThree;
    return `${amount < 0 ? "-" : ""}₹${formatted}`;
};

/**
 * Format to compact Indian currency (₹1.2L, ₹2.3Cr)
 */
export const formatINRCompact = (amount: number): string => {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
    if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
    return formatINR(amount);
};

/** Alias for formatINR — used across Phase 2+ vehicle components */
export const formatCurrency = formatINR;
