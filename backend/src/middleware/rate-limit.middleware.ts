import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, statusCode: 429, message: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, statusCode: 429, message: "Too many authentication attempts. Try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
