export const APP_NAME = "VehicleBook";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
export const PAYMENT_MODES = ["Cash", "Online", "Cheque", "UPI"] as const;
