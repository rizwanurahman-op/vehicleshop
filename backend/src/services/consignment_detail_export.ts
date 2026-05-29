import mongoose from "mongoose";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

/**
 * Sanitize a string for safe rendering in PDFKit (Helvetica/standard fonts).
 * Replaces common Unicode problem chars with ASCII equivalents.
 */
const safe = (s: string): string =>
    s
        .replace(/\u20B9/g, "Rs.")          // ₹ → Rs.
        .replace(/[\u2014\u2013]/g, "-")    // em dash, en dash → -
        .replace(/\u00B7/g, "|")             // middle dot · → |
        .replace(/\u2019/g, "'")             // right single quote → '
        .replace(/\u2018/g, "'")             // left single quote → '
        .replace(/\u201C/g, '"')             // left double quote → "
        .replace(/\u201D/g, '"')             // right double quote → "
        .replace(/\u2026/g, "...")           // ellipsis → ...
        .replace(/[^\x00-\x7F]/g, "");       // strip any remaining non-ASCII

const dINR = (n: number | null | undefined) =>
    n == null ? "-" : `Rs. ${Math.abs(n).toLocaleString("en-IN")}`;

const dFmt = (d: Date | string | null | undefined) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const dSl = (s: string | null | undefined) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

// â”€â”€ CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const exportConsignmentDetailCSV = async (id: string): Promise<string | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const v = await ConsignmentVehicle.findOne({ _id: id, isActive: true }).lean();
    if (!v) return null;

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (label: string, value: unknown) => `${esc(label)},${esc(value)}`;
    const isSold = !!(v as any).dateSold && !!(v as any).soldPrice;

    const lines: string[] = [
        "Field,Value",
        row("Consignment ID", v.consignmentId),
        row("Sale Type", v.saleType === "park_sale" ? "Park Sale" : "Finance Sale"),
        row("Vehicle Type", v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler"),
        row("Make", v.make),
        row("Model", v.model),
        row("Year", v.year ?? ""),
        row("Registration No", v.registrationNo),
        row("Color", (v as any).color ?? ""),
        row("Engine No", (v as any).engineNo ?? ""),
        row("Chassis No", (v as any).chassisNo ?? ""),
        "",
        row("Previous Owner", v.previousOwner),
        row("Owner Phone", (v as any).previousOwnerPhone ?? ""),
        ...(v.financeCompany ? [row("Finance Company", v.financeCompany)] : []),
        row("Date Received", dFmt(v.dateReceived)),
        row("Purchase Price", v.purchasePrice ?? ""),
        row("Total Recon Cost", v.totalReconCost),
        row("Total Investment", v.totalInvestment),
        "",
        row("Status", dSl(v.status)),
        row("Settlement Status", dSl(v.settlementStatus)),
        row("Days in Shop", v.daysInShop ?? ""),
        "",
        ...(isSold ? [
            row("Date Sold", dFmt((v as any).dateSold)),
            row("Sold To", (v as any).soldTo ?? ""),
            row("Buyer Phone", (v as any).soldToPhone ?? ""),
            row("Sold Price", (v as any).soldPrice ?? ""),
            row("Received from Buyer", v.receivedAmount),
            row("Buyer Balance", v.buyerBalance),
            row("Paid to Payee", v.paidToPayee),
            row("Payee Balance", v.payeeBalance),
            row("Net Profit", (v as any).netProfit ?? ""),
            row("P/L %", (v as any).profitLossPercentage != null ? (v as any).profitLossPercentage.toFixed(1) + "%" : ""),
            "",
        ] : []),
        row("Workshop Cost", (v as any).workshopRepairCost ?? 0),
        row("Spare Parts", (v as any).sparePartsAccessories ?? 0),
        row("Painting", (v as any).paintingPolishingCost ?? 0),
        row("Washing", (v as any).washingDetailingCost ?? 0),
        row("Fuel", (v as any).fuelCost ?? 0),
        row("Paperwork / Tax", (v as any).paperworkTaxInsurance ?? 0),
        row("Commission", (v as any).commission ?? 0),
        row("Other Expenses", (v as any).otherExpenses ?? 0),
        "",
        "--- BUYER PAYMENTS ---",
        "#,Date,Amount,Mode,Notes",
        ...v.buyerPayments.map((p: any, i: number) =>
            [i + 1, dFmt(p.date), p.amount, p.mode, p.notes ?? ""].map(esc).join(",")
        ),
        "",
        "--- PAYEE PAYMENTS ---",
        "#,Date,Amount,Mode,Notes",
        ...v.payeePayments.map((p: any, i: number) =>
            [i + 1, dFmt(p.date), p.amount, p.mode, p.notes ?? ""].map(esc).join(",")
        ),
        "",
        row("Remarks", (v as any).remarks ?? ""),
    ];
    return lines.join("\r\n");
};

// â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const exportConsignmentDetailPDF = async (id: string): Promise<Buffer | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const v = await ConsignmentVehicle.findOne({ _id: id, isActive: true }).lean();
    if (!v) return null;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 0, size: "A4", bufferPages: true });
            const chunks: Buffer[] = [];
            doc.on("data", (c: Buffer) => chunks.push(c));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            const PW = doc.page.width;
            const PH = doc.page.height;
            const MG = 30;
            const CW = PW - MG * 2;

            const C = {
                navy: "#0f172a", indigo: "#6366f1", violet: "#7c3aed", blue: "#2563eb",
                green: "#16a34a", red: "#dc2626", amber: "#d97706", slate: "#64748b",
                white: "#ffffff", border: "#e2e8f0", light: "#f8fafc",
                text: "#1e293b", muted: "#94a3b8",
            };

            const isSold = !!(v as any).dateSold && !!(v as any).soldPrice;
            const netProfit = (v as any).netProfit ?? 0;
            const isProfit = netProfit >= 0;
            const isParkSale = v.saleType === "park_sale";
            const accentColor = isParkSale ? C.violet : C.blue;
            const buyerPayments: any[] = Array.isArray(v.buyerPayments) ? v.buyerPayments : [];
            const payeePayments: any[] = Array.isArray(v.payeePayments) ? v.payeePayments : [];
            const activityLog: any[] = Array.isArray(v.activityLog) ? v.activityLog : [];
            const costBreakdowns: any[] = Array.isArray(v.costBreakdowns) ? v.costBreakdowns : [];

            let y = 0;

            const addFooter = () => {
                doc.moveTo(MG, PH - 20).lineTo(PW - MG, PH - 20).strokeColor(C.border).lineWidth(0.5).stroke();
                doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
                   .text("VehicleBook - Confidential. For internal use only.", MG, PH - 14, { lineBreak: false });
            };

            const need = (h: number) => {
                if (y + h > PH - 38) {
                    addFooter();
                    doc.addPage({ margin: 0, size: "A4" });
                    y = MG;
                }
            };

            const sectionBar = (title: string, subtitle: string, yp: number) => {
                doc.rect(MG, yp, CW, 22).fill(C.navy);
                doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.white).text(title, MG + 8, yp + 7, { lineBreak: false });
                if (subtitle) {
                    doc.fontSize(7).font("Helvetica").fillColor(C.muted).text(subtitle, MG + 8, yp + 7, { width: CW - 16, align: "right", lineBreak: false });
                }
                return yp + 22;
            };

            const kvRow = (label: string, value: string, yp: number, i: number, rowH = 17, valueColor = C.text, bold = false) => {
                doc.rect(MG, yp, CW, rowH).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                doc.moveTo(MG, yp + rowH).lineTo(MG + CW, yp + rowH).strokeColor(C.border).lineWidth(0.2).stroke();
                doc.fontSize(7).font("Helvetica").fillColor(C.slate).text(label, MG + 8, yp + 5, { width: CW / 2 - 8, lineBreak: false });
                doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(valueColor)
                   .text(value, MG + CW / 2, yp + 5, { width: CW / 2 - 8, align: "right", lineBreak: false });
            };

            // â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            doc.rect(0, 0, PW, 68).fill(C.navy);
            doc.rect(0, 64, PW, 4).fill(accentColor);
            doc.fontSize(20).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 14, { lineBreak: false });
            doc.fontSize(8).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 37, { lineBreak: false });
            doc.fontSize(14).font("Helvetica-Bold").fillColor(C.white)
               .text("Consignment Detail Report", MG, 15, { width: CW, align: "right", lineBreak: false });
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
               .text(safe(`Generated: ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`),
                   MG, 35, { width: CW, align: "right", lineBreak: false });
            y = 76;

            // â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            doc.rect(MG, y, CW, 62).fill("#eef2ff");
            doc.moveTo(MG, y).lineTo(MG + CW, y).lineTo(MG + CW, y + 62).lineTo(MG, y + 62).closePath()
               .strokeColor(accentColor + "40").lineWidth(0.8).stroke();
            doc.rect(MG, y, 4, 62).fill(accentColor);
            doc.fontSize(7.5).font("Helvetica-Bold").fillColor(accentColor)
               .text(safe(`${v.consignmentId}   |   ${isParkSale ? "Park Sale" : "Finance Sale"}`), MG + 12, y + 8, { lineBreak: false });
            doc.fontSize(17).font("Helvetica-Bold").fillColor(C.text)
               .text(safe(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`), MG + 12, y + 19, { lineBreak: false });
            doc.fontSize(8.5).font("Helvetica").fillColor(C.slate)
               .text(safe(`${v.registrationNo}   |   ${v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler"}`), MG + 12, y + 40, { lineBreak: false });
            const sColors: Record<string, string> = { sold: C.green, returned: C.red, ready_for_sale: "#0891b2" };
            const sColor = sColors[v.status] ?? C.amber;
            doc.circle(PW - MG - 90, y + 24, 4).fill(sColor);
            doc.fontSize(8).font("Helvetica-Bold").fillColor(sColor)
               .text(safe(dSl(v.status)), PW - MG - 83, y + 21, { lineBreak: false });
            doc.fontSize(7).font("Helvetica").fillColor(C.muted)
               .text(safe(`Owner: ${v.previousOwner}   |   Received: ${dFmt(v.dateReceived)}`), MG + 12, y + 52, { lineBreak: false });
            y += 70;

            // â”€â”€ METRICS ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const metrics = [
                { label: "TOTAL INVESTED",  value: dINR(v.totalInvestment), accent: C.indigo },
                { label: "RECON COSTS",     value: dINR(v.totalReconCost),  accent: C.amber  },
                { label: isSold ? "SOLD PRICE" : "STATUS",
                  value: isSold ? dINR((v as any).soldPrice) : dSl(v.status), accent: "#0891b2" },
                { label: isSold ? (isProfit ? "NET PROFIT" : "NET LOSS") : "UNREALISED",
                  value: (isSold && !isProfit ? "-" : "") + dINR(Math.abs(netProfit)),
                  accent: isSold ? (isProfit ? C.green : C.red) : C.slate },
            ];
            const mW = (CW - 12) / 4;
            metrics.forEach((m, i) => {
                const mx = MG + i * (mW + 4);
                doc.rect(mx, y, mW, 46).fill(C.light);
                doc.moveTo(mx, y).lineTo(mx + mW, y).lineTo(mx + mW, y + 46).lineTo(mx, y + 46).closePath()
                   .strokeColor(m.accent + "50").lineWidth(0.6).stroke();
                doc.rect(mx, y, 3.5, 46).fill(m.accent);
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(m.accent)
                   .text(m.label, mx + 9, y + 7, { width: mW - 13, lineBreak: false });
                doc.fontSize(11).font("Helvetica-Bold").fillColor(m.accent)
                   .text(m.value, mx + 9, y + 18, { width: mW - 13, lineBreak: false });
            });
            y += 54;

            // â”€â”€ VEHICLE + OWNER INFO (2-column) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            need(170);
            const colW = (CW - 10) / 2;
            const rx = MG + colW + 10;

            let leftY = y;
            leftY = sectionBar("VEHICLE INFORMATION", "", leftY);
            const vRows: [string, string, boolean?][] = [
                ["Make", v.make || "-", true],
                ["Model", v.model || "-", true],
                ["Year", v.year?.toString() ?? "-"],
                ["Registration No", v.registrationNo || "-", true],
                ["Color", (v as any).color ?? "-"],
                ["Engine No", safe((v as any).engineNo ?? "-")],
                ["Chassis No", safe((v as any).chassisNo ?? "-")],
                ["Vehicle Type", v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler"],
            ];
            vRows.forEach(([l, val, bold], i) => {
                doc.rect(MG, leftY, colW, 17).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                doc.moveTo(MG, leftY + 17).lineTo(MG + colW, leftY + 17).strokeColor(C.border).lineWidth(0.2).stroke();
                doc.fontSize(7).font("Helvetica").fillColor(C.slate).text(l, MG + 6, leftY + 5, { width: colW / 2 - 4, lineBreak: false });
                doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(C.text)
                   .text(safe(String(val)), MG + colW / 2, leftY + 5, { width: colW / 2 - 6, align: "right", lineBreak: false });
                leftY += 17;
            });

            let rightY = y;
            rightY = sectionBar("OWNER INFORMATION", "", rightY);
            const oRows: [string, string, boolean?][] = [
                [isParkSale ? "Owner" : "Finance Owner", v.previousOwner || "-", true],
                ["Phone", (v as any).previousOwnerPhone ?? "-"],
                ...(v.financeCompany ? [["Finance Company", v.financeCompany, true] as [string, string, boolean?]] : []),
                ["Sale Type", isParkSale ? "Park Sale" : "Finance Sale"],
                ["Date Received", dFmt(v.dateReceived)],
                ["Purchase Price", dINR(v.purchasePrice)],
                ["Recon Cost", dINR(v.totalReconCost)],
                ["Total Investment", dINR(v.totalInvestment), true],
                ["Status", dSl(v.status)],
                ["Settlement", dSl(v.settlementStatus)],
            ];
            oRows.forEach(([l, val, bold], i) => {
                doc.rect(rx, rightY, colW, 17).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                doc.moveTo(rx, rightY + 17).lineTo(rx + colW, rightY + 17).strokeColor(C.border).lineWidth(0.2).stroke();
                doc.fontSize(7).font("Helvetica").fillColor(C.slate).text(l, rx + 6, rightY + 5, { width: colW / 2 - 4, lineBreak: false });
                doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(C.text)
                   .text(safe(String(val)), rx + colW / 2, rightY + 5, { width: colW / 2 - 6, align: "right", lineBreak: false });
                rightY += 17;
            });
            y = Math.max(leftY, rightY) + 10;

            // â”€â”€ RECON COSTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            const costDefs: [string, string, number][] = [
                ["workshop",   "Workshop / Repair",   (v as any).workshopRepairCost ?? 0],
                ["spareParts", "Spare Parts",         (v as any).sparePartsAccessories ?? 0],
                ["painting",   "Painting / Polish",   (v as any).paintingPolishingCost ?? 0],
                ["washing",    "Washing / Detailing", (v as any).washingDetailingCost ?? 0],
                ["fuel",       "Fuel",                (v as any).fuelCost ?? 0],
                ["paperwork",  "Paperwork / Tax",     (v as any).paperworkTaxInsurance ?? 0],
                ["commission", "Commission",          (v as any).commission ?? 0],
                ["other",      "Other Expenses",      (v as any).otherExpenses ?? 0],
            ];
            const activeCosts = costDefs.filter(([, , amt]) => amt > 0);
            need(22 + activeCosts.length * 20 + 26);
            y = sectionBar("RECONDITIONING COSTS", `Total: ${dINR(v.totalReconCost)}`, y);
            if (activeCosts.length === 0) {
                doc.rect(MG, y, CW, 22).fill(C.light);
                doc.fontSize(7).font("Helvetica").fillColor(C.muted)
                   .text("No reconditioning costs recorded.", MG + 8, y + 7, { lineBreak: false });
                y += 22;
            } else {
                activeCosts.forEach(([cat, label, total], ci) => {
                    need(20);
                    doc.rect(MG, y, CW, 20).fill(ci % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.text)
                       .text(label, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(C.amber)
                       .text(dINR(total), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    y += 20;
                    const bd = costBreakdowns.find((b: any) => b.category === cat);
                    if (bd?.items?.length) {
                        bd.items.forEach((item: any) => {
                            need(16);
                            doc.rect(MG, y, CW, 16).fill("#fafafa");
                            doc.moveTo(MG + 16, y + 16).lineTo(MG + CW, y + 16).strokeColor(C.border).lineWidth(0.15).stroke();
                            doc.rect(MG, y, 3, 16).fill(C.amber + "60");
                            doc.fontSize(6.5).font("Helvetica").fillColor(C.slate)
                               .text((item.name ?? "") + (item.date ? "   |   " + dFmt(item.date) : ""), MG + 14, y + 4, { width: CW - 90, lineBreak: false });
                            doc.font("Helvetica-Bold").fillColor(C.text)
                               .text(dINR(item.amount), MG + 8, y + 4, { width: CW - 16, align: "right", lineBreak: false });
                            y += 16;
                        });
                    }
                });
            }
            need(26);
            doc.rect(MG, y, CW, 26).fill(C.navy);
            doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.white)
               .text("TOTAL INVESTMENT  (Purchase + Reconditioning)", MG + 8, y + 9, { lineBreak: false });
            doc.fontSize(10).font("Helvetica-Bold").fillColor(C.white)
               .text(dINR(v.totalInvestment), MG + 8, y + 7, { width: CW - 16, align: "right", lineBreak: false });
            y += 26 + 10;

            // â”€â”€ SALE INFORMATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (isSold) {
                const soldPrice = (v as any).soldPrice ?? 0;
                const saleRows: [string, string, string?, boolean?][] = [
                    ["Date Sold",             dFmt((v as any).dateSold)],
                    ["Sold To",               (v as any).soldTo ?? "-",          undefined, true],
                    ["Buyer Phone",            (v as any).soldToPhone ?? "-"],
                    ["Sold Price",             dINR(soldPrice),                    undefined, true],
                    ["Received from Buyer",    dINR(v.receivedAmount),             C.green,   true],
                    ["Buyer Balance",          v.buyerBalance > 0 ? dINR(v.buyerBalance) : "Fully Received",
                                               v.buyerBalance > 0 ? C.red : C.green, true],
                    ["Paid to Payee",          dINR(v.paidToPayee),                undefined, true],
                    ["Payee Balance",          v.payeeBalance > 0 ? dINR(v.payeeBalance) : "Fully Paid",
                                               v.payeeBalance > 0 ? C.red : C.green, true],
                    ["Payee Payment Status",   dSl(v.payeePaymentStatus)],
                    ["Settlement Status",      dSl(v.settlementStatus)],
                    ["Days in Shop",           v.daysInShop != null ? `${v.daysInShop} days` : "-"],
                    ["Net Profit / Loss",      (isProfit ? "+" : "-") + dINR(Math.abs(netProfit)),
                                               isProfit ? C.green : C.red, true],
                ];
                need(22 + saleRows.length * 17 + 12);
                y = sectionBar("SALE INFORMATION", "", y);
                saleRows.forEach(([l, val, color, bold], i) => {
                    kvRow(l, safe(val), y, i, 17, color ?? C.text, !!bold);
                    y += 17;
                });
                y += 10;
            }

            // â”€â”€ BUYER PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (buyerPayments.length > 0) {
                need(22 + buyerPayments.length * 20 + 12);
                y = sectionBar("BUYER PAYMENTS (Money In)", `Total Received: ${dINR(v.receivedAmount)}`, y);
                buyerPayments.forEach((p: any, i: number) => {
                    need(20);
                    doc.rect(MG, y, CW, 20).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate)
                       .text(`#${i + 1}`, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica").fillColor(C.text)
                       .text(safe(dFmt(p.date)), MG + 26, y + 6, { lineBreak: false });
                    const modeLabel = p.type === "exchange" ? `Exchange (${safe(p.exchangeVehicleMake ?? "")})` : safe(p.mode ?? "");
                    doc.fillColor(p.type === "exchange" ? C.amber : C.muted)
                       .text(safe(`via ${modeLabel}${p.notes ? " - " + p.notes : ""}`), MG + 115, y + 6, { width: 200, lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(C.green)
                       .text(dINR(p.amount), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    y += 20;
                });
                y += 10;
            }

            // â”€â”€ PAYEE PAYMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (payeePayments.length > 0) {
                need(22 + payeePayments.length * 20 + 12);
                y = sectionBar(
                    `PAYEE PAYMENTS - ${isParkSale ? "Owner" : "Finance"} (Money Out)`,
                    `Total Paid: ${dINR(v.paidToPayee)}`, y
                );
                payeePayments.forEach((p: any, i: number) => {
                    need(20);
                    doc.rect(MG, y, CW, 20).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate)
                       .text(`#${i + 1}`, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica").fillColor(C.text)
                       .text(safe(dFmt(p.date)), MG + 26, y + 6, { lineBreak: false });
                    doc.fillColor(C.muted)
                       .text(safe(`via ${p.mode ?? ""}${p.notes ? " - " + p.notes : ""}`), MG + 115, y + 6, { width: 200, lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(accentColor)
                       .text(dINR(p.amount), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    y += 20;
                });
                y += 10;
            }

            // â”€â”€ ACTIVITY LOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (activityLog.length > 0) {
                const logs = [...activityLog].reverse().slice(0, 10);
                need(22 + logs.length * 20);
                y = sectionBar("ACTIVITY LOG", `Latest ${logs.length} of ${activityLog.length} entries`, y);
                logs.forEach((log: any, i: number) => {
                    need(20);
                    doc.rect(MG, y, CW, 20).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.circle(MG + 12, y + 9, 2.5).fill(accentColor);
                    const desc = safe(String(log.description ?? ""));
                    doc.fontSize(7).font("Helvetica").fillColor(C.text)
                       .text(desc, MG + 22, y + 5, { width: CW - 130, lineBreak: false });
                    doc.fillColor(C.muted)
                       .text(safe(dFmt(log.date)), MG + 22, y + 13, { lineBreak: false });
                    if (log.amount) {
                        doc.font("Helvetica-Bold").fillColor(accentColor)
                           .text(dINR(log.amount), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    }
                    y += 20;
                });
                y += 10;
            }

            addFooter();

            // Page numbers
            const range = doc.bufferedPageRange();
            for (let pg = 0; pg < range.count; pg++) {
                doc.switchToPage(range.start + pg);
                doc.fontSize(7).font("Helvetica").fillColor(C.muted)
                   .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 14, { width: CW, align: "right", lineBreak: false });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};
