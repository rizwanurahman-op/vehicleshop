import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as cc from "../controllers/consignment.controller";

const router = Router();
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", cc.getConsignmentStats);
router.get("/reports", cc.getReports);

// ── CRUD ──────────────────────────────────────────────────────────
router.get("/", cc.getConsignments);
router.post("/", cc.createConsignment);
router.get("/:id", cc.getConsignment);
router.patch("/:id", cc.updateConsignment);
router.delete("/:id", cc.deleteConsignment);

// ── Status Management ─────────────────────────────────────────────
router.patch("/:id/status", cc.updateConsignmentStatus);
router.patch("/:id/return", cc.returnConsignment);

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", cc.updateCosts);
router.post("/:id/costs/breakdown", cc.addCostBreakdownItem);
router.delete("/:id/costs/breakdown/:itemId", cc.deleteCostBreakdownItem);

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", cc.recordSale);
router.delete("/:id/sale", cc.undoSale);

// ── Buyer Payments ────────────────────────────────────────────────
router.post("/:id/buyer-payments", cc.addBuyerPayment);
router.delete("/:id/buyer-payments/:paymentId", cc.deleteBuyerPayment);

// ── Payee Payments ────────────────────────────────────────────────
router.post("/:id/payee-payments", cc.addPayeePayment);
router.delete("/:id/payee-payments/:paymentId", cc.deletePayeePayment);
router.post("/:id/payee-payments/close", cc.closePayeeSettlement);

export default router;
