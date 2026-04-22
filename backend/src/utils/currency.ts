/**
 * Format number to Indian currency string
 * 1234567 → ₹12,34,567
 */
export const formatINR = (amount: number): string => {
    const num = Math.abs(amount);
    const str = num.toFixed(0);
    const lastThree = str.slice(-3);
    const rest = str.slice(0, -3);
    const formatted =
        rest.length > 0
            ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
            : lastThree;
    return `₹${amount < 0 ? "-" : ""}${formatted}`;
};

/**
 * Convert rupees to paise (internal storage)
 */
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);

/**
 * Convert paise to rupees (display)
 */
export const paiseToRupees = (paise: number): number => paise / 100;
