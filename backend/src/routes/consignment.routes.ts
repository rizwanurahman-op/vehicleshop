import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import * as cc from "../controllers/consignment.controller";

const router = Router();
router.use(authenticate);

// ── Stats, Reports & Export (before /:id to avoid conflicts) ──────
router.get("/stats", asyncHandler(cc.getConsignmentStats));
router.get("/reports", asyncHandler(cc.getReports));
router.get("/reports/export", exportLimiter, asyncHandler(cc.exportReports));
router.get("/export", exportLimiter, asyncHandler(cc.exportConsignments));

// ── CRUD ──────────────────────────────────────────────────────────
router.get("/", asyncHandler(cc.getConsignments));
router.post("/", isAdmin, writeLimiter, asyncHandler(cc.createConsignment));
router.get("/:id", asyncHandler(cc.getConsignment));
router.get("/:id/export", exportLimiter, asyncHandler(cc.exportConsignmentDetail));
router.put("/:id", isAdmin, writeLimiter, asyncHandler(cc.updateConsignment));
router.patch("/:id", isAdmin, writeLimiter, asyncHandler(cc.updateConsignment));
router.delete("/:id", isAdmin, writeLimiter, asyncHandler(cc.deleteConsignment));

// ── Status Management ─────────────────────────────────────────────
router.patch("/:id/status", isAdmin, writeLimiter, asyncHandler(cc.updateConsignmentStatus));
router.patch("/:id/return", isAdmin, writeLimiter, asyncHandler(cc.returnConsignment));

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", isAdmin, writeLimiter, asyncHandler(cc.updateCosts));
router.post("/:id/costs/breakdown", isAdmin, writeLimiter, asyncHandler(cc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", isAdmin, writeLimiter, asyncHandler(cc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", isAdmin, writeLimiter, asyncHandler(cc.recordSale));
router.delete("/:id/sale", isAdmin, writeLimiter, asyncHandler(cc.undoSale));

// ── Buyer Payments ────────────────────────────────────────────────
router.post("/:id/buyer-payments", isAdmin, writeLimiter, asyncHandler(cc.addBuyerPayment));
router.delete("/:id/buyer-payments/:paymentId", isAdmin, writeLimiter, asyncHandler(cc.deleteBuyerPayment));

// ── Payee Payments ────────────────────────────────────────────────
router.post("/:id/payee-payments", isAdmin, writeLimiter, asyncHandler(cc.addPayeePayment));
router.delete("/:id/payee-payments/:paymentId", isAdmin, writeLimiter, asyncHandler(cc.deletePayeePayment));
router.post("/:id/payee-payments/close", isAdmin, writeLimiter, asyncHandler(cc.closePayeeSettlement));

export default router;
