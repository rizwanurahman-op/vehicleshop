import mongoose from "mongoose";
import { Vehicle } from "../models/vehicle.model";

// ── Single Vehicle Detail Exports ────────────────────────────────────────────

const dINR = (n: number | null | undefined) =>
    n == null ? "—" : `Rs. ${Math.abs(n).toLocaleString("en-IN")}`;

const dFmt = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dSl = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const exportVehicleDetailCSV = async (id: string): Promise<string | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const v = await Vehicle.findOne({ _id: id, isActive: true }).lean();
    if (!v) return null;

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (label: string, value: unknown) => `${esc(label)},${esc(value)}`;

    const isSold = !!(v.dateSold && v.soldPrice);
    const lines: string[] = [
        "Field,Value",
        row("Vehicle ID", v.vehicleId),
        row("Type", v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler"),
        row("Make", v.make),
        row("Model", v.model),
        row("Year", v.year ?? ""),
        row("Registration No", v.registrationNo),
        row("Color", (v as any).color ?? ""),
        row("Engine No", (v as any).engineNo ?? ""),
        row("Chassis No", (v as any).chassisNo ?? ""),
        "",
        row("Purchased From", v.purchasedFrom),
        row("Seller Phone", (v as any).purchasedFromPhone ?? ""),
        row("Date Purchased", dFmt(v.datePurchased)),
        row("Purchase Price", v.purchasePrice),
        row("Total Investment", v.totalInvestment),
        row("Purchase Payment Status", v.purchasePaymentStatus),
        row("Purchase Pending Amount", v.purchasePendingAmount),
        "",
        row("Status", v.status),
        row("NOC Status", v.nocStatus),
        "",
        ...(isSold ? [
            row("Date Sold", dFmt((v as any).dateSold)),
            row("Sold To", (v as any).soldTo ?? ""),
            row("Buyer Phone", (v as any).soldToPhone ?? ""),
            row("Sold Price", (v as any).soldPrice ?? ""),
            row("Received Amount", v.receivedAmount),
            row("Balance Amount", v.balanceAmount),
            row("Sale Status", v.saleStatus ?? ""),
            row("Days to Sell", v.daysToSell ?? ""),
            row("Profit / Loss", v.profitLoss),
            row("P/L %", (v.profitLossPercentage?.toFixed(1) ?? "0") + "%"),
            "",
        ] : []),
        row("Workshop Cost", v.workshopRepairCost),
        row("Spare Parts Cost", v.sparePartsAccessories),
        row("Travel Cost", v.travelCost),
        row("Painting Cost", v.paintingPolishingCost),
        row("Alignment Cost", v.alignmentWork),
        row("Washing Cost", v.washingDetailingCost),
        row("Fuel Cost", v.fuelCost),
        row("Paperwork / Tax", v.paperworkTaxInsurance),
        row("Commission", v.commission),
        row("Other Expenses", v.otherExpenses),
        "",
        "--- PURCHASE PAYMENTS ---",
        "#,Date,Amount,Mode,Bank/Notes",
        ...v.purchasePayments.map((p: any, i: number) =>
            [i + 1, dFmt(p.date), p.amount, p.mode, (p as any).bankAccount ?? (p as any).notes ?? ""].map(esc).join(",")
        ),
        "",
        ...(isSold ? [
            "--- SALE PAYMENTS ---",
            "#,Date,Amount,Mode,Type,Notes",
            ...v.salePayments.filter((p: any) => p.amount > 0).map((p: any, i: number) =>
                [i + 1, dFmt(p.date), p.amount, p.mode, p.type, (p as any).notes ?? ""].map(esc).join(",")
            ),
            "",
        ] : []),
        row("Remarks", v.remarks ?? ""),
        row("Notes", (v as any).notes ?? ""),
    ];
    return lines.join("\r\n");
};

export const exportVehicleDetailPDF = async (id: string): Promise<Buffer | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const v = await Vehicle.findOne({ _id: id, isActive: true }).lean();
    if (!v) return null;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
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
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a",
            red: "#dc2626", amber: "#d97706", slate: "#64748b",
            white: "#ffffff", border: "#e2e8f0", light: "#f8fafc",
            text: "#1e293b", muted: "#94a3b8",
        };

        const isSold = !!(v.dateSold && (v as any).soldPrice);
        const pl = v.profitLoss ?? 0;
        const isProfit = pl >= 0;

        const statusColors: Record<string, string> = {
            in_stock: C.green, reconditioning: C.amber, ready_for_sale: "#0891b2",
            sold: C.green, sold_pending: C.amber, exchanged: "#a855f7",
        };

        const sectionBar = (title: string, subtitle: string, yp: number) => {
            doc.rect(MG, yp, CW, 22).fill(C.navy);
            doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.white)
               .text(title, MG + 8, yp + 7, { lineBreak: false });
            if (subtitle) {
                doc.fontSize(7).font("Helvetica").fillColor(C.muted)
                   .text(subtitle, MG + 8, yp + 7, { width: CW - 16, align: "right", lineBreak: false });
            }
            return yp + 22;
        };

        const kvRow = (label: string, value: string, yp: number, i: number, rowH = 17, valueColor = C.text, bold = false) => {
            doc.rect(MG, yp, CW, rowH).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
            doc.moveTo(MG, yp + rowH).lineTo(MG + CW, yp + rowH).strokeColor(C.border).lineWidth(0.2).stroke();
            doc.fontSize(7).font("Helvetica").fillColor(C.slate)
               .text(label, MG + 8, yp + 5, { width: CW / 2 - 8, lineBreak: false });
            doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(valueColor)
               .text(value, MG + CW / 2, yp + 5, { width: CW / 2 - 8, align: "right", lineBreak: false });
        };

        let y = 0;

        const addFooter = () => {
            doc.moveTo(MG, PH - 20).lineTo(PW - MG, PH - 20).strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
               .text("VehicleBook — Confidential. For internal use only.", MG, PH - 14, { lineBreak: false });
        };

        const need = (h: number) => {
            if (y + h > PH - 38) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4" });
                y = MG;
            }
        };

        // HEADER
        doc.rect(0, 0, PW, 68).fill(C.navy);
        doc.rect(0, 64, PW, 4).fill(C.indigo);
        doc.fontSize(20).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 14, { lineBreak: false });
        doc.fontSize(8).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 37, { lineBreak: false });
        doc.fontSize(14).font("Helvetica-Bold").fillColor(C.white)
           .text("Vehicle Detail Report", MG, 15, { width: CW, align: "right", lineBreak: false });
        doc.fontSize(8).font("Helvetica").fillColor(C.muted)
           .text(
               `Generated: ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
               MG, 35, { width: CW, align: "right", lineBreak: false },
           );
        y = 76;

        // VEHICLE HERO
        doc.rect(MG, y, CW, 62).fill("#eef2ff").strokeColor("#c7d2fe").lineWidth(0.8).stroke();
        doc.rect(MG, y, 4, 62).fill(C.indigo);
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.indigo)
           .text(v.vehicleId, MG + 12, y + 8, { lineBreak: false });
        doc.fontSize(17).font("Helvetica-Bold").fillColor(C.text)
           .text(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, MG + 12, y + 19, { lineBreak: false });
        const typeLabel = v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler";
        doc.fontSize(8.5).font("Helvetica").fillColor(C.slate)
           .text(`${v.registrationNo}  ·  ${typeLabel}`, MG + 12, y + 40, { lineBreak: false });
        const sColor = statusColors[v.status] ?? C.slate;
        doc.circle(PW - MG - 90, y + 24, 4).fill(sColor);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(sColor)
           .text(dSl(v.status), PW - MG - 83, y + 21, { lineBreak: false });
        doc.fontSize(7).font("Helvetica").fillColor(C.muted)
           .text(`Purchased: ${dFmt(v.datePurchased)}`, MG + 12, y + 52, { lineBreak: false });
        y += 70;

        // METRICS ROW
        const metrics = [
            { label: "PURCHASE PRICE",  value: dINR(v.purchasePrice),       accent: C.indigo },
            { label: "TOTAL INVESTED",  value: dINR(v.totalInvestment),      accent: C.amber  },
            { label: isSold ? "SOLD PRICE" : "STATUS",
              value: isSold ? dINR((v as any).soldPrice) : dSl(v.status),   accent: "#0891b2" },
            { label: isSold ? (isProfit ? "NET PROFIT" : "NET LOSS") : "UNREALIZED P/L",
              value: (isSold && !isProfit ? "-" : "") + dINR(Math.abs(pl)), accent: isSold ? (isProfit ? C.green : C.red) : C.slate },
        ];
        const mW = (CW - 12) / 4;
        metrics.forEach((m, i) => {
            const mx = MG + i * (mW + 4);
            doc.rect(mx, y, mW, 46).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.6).stroke();
            doc.rect(mx, y, 3.5, 46).fill(m.accent);
            doc.fontSize(6.5).font("Helvetica-Bold").fillColor(m.accent)
               .text(m.label, mx + 9, y + 7, { width: mW - 13, lineBreak: false });
            doc.fontSize(11).font("Helvetica-Bold").fillColor(m.accent)
               .text(m.value, mx + 9, y + 18, { width: mW - 13, lineBreak: false });
            if (i === 3 && isSold) {
                const pct = v.profitLossPercentage ?? 0;
                doc.fontSize(6.5).font("Helvetica").fillColor(m.accent)
                   .text(`${isProfit ? "+" : ""}${pct.toFixed(1)}%`, mx + 9, y + 33, { lineBreak: false });
            }
        });
        y += 54;

        // VEHICLE + PURCHASE INFO (2-column)
        need(175);
        const colW = (CW - 10) / 2;
        const rx = MG + colW + 10;

        let leftY = y;
        leftY = sectionBar("VEHICLE INFORMATION", "", leftY);
        const vRows: [string, string, boolean?][] = [
            ["Make", v.make, true], ["Model", v.model, true],
            ["Year", v.year?.toString() ?? "—"],
            ["Registration No", v.registrationNo, true],
            ["Color", (v as any).color ?? "—"],
            ["Engine No", (v as any).engineNo ?? "—"],
            ["Chassis No", (v as any).chassisNo ?? "—"],
        ];
        if (v.vehicleType === "four_wheeler") {
            vRows.push(["NOC Status", dSl(v.nocStatus), true]);
        }
        vRows.forEach(([l, val, bold], i) => {
            doc.rect(MG, leftY, colW, 17).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
            doc.moveTo(MG, leftY + 17).lineTo(MG + colW, leftY + 17).strokeColor(C.border).lineWidth(0.2).stroke();
            doc.fontSize(7).font("Helvetica").fillColor(C.slate).text(l, MG + 6, leftY + 5, { width: colW / 2 - 4, lineBreak: false });
            doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(C.text)
               .text(val, MG + colW / 2, leftY + 5, { width: colW / 2 - 6, align: "right", lineBreak: false });
            leftY += 17;
        });

        let rightY = y;
        rightY = sectionBar("PURCHASE INFORMATION", "", rightY);
        const pRows: [string, string, boolean?][] = [
            ["Purchased From", v.purchasedFrom ?? "—", true],
            ["Seller Phone", (v as any).purchasedFromPhone ?? "—"],
            ["Date Purchased", dFmt(v.datePurchased)],
            ["Purchase Price", dINR(v.purchasePrice), true],
            ["Total Investment", dINR(v.totalInvestment), true],
            ["Payment Status", dSl(v.purchasePaymentStatus)],
            ["Pending Payment", v.purchasePendingAmount > 0 ? dINR(v.purchasePendingAmount) : "Fully Paid"],
        ];
        pRows.forEach(([l, val, bold], i) => {
            doc.rect(rx, rightY, colW, 17).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
            doc.moveTo(rx, rightY + 17).lineTo(rx + colW, rightY + 17).strokeColor(C.border).lineWidth(0.2).stroke();
            doc.fontSize(7).font("Helvetica").fillColor(C.slate).text(l, rx + 6, rightY + 5, { width: colW / 2 - 4, lineBreak: false });
            doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(C.text)
               .text(val, rx + colW / 2, rightY + 5, { width: colW / 2 - 6, align: "right", lineBreak: false });
            rightY += 17;
        });
        y = Math.max(leftY, rightY) + 10;

        // RECONDITIONING COSTS — full breakdown
        const allCostDefs: [string, string, number][] = [
            ["travel",     "Travel",              v.travelCost],
            ["workshop",   "Workshop / Repair",   v.workshopRepairCost],
            ["spareParts", "Spare Parts",         v.sparePartsAccessories],
            ["alignment",  "Alignment",           v.alignmentWork],
            ["painting",   "Painting / Polish",   v.paintingPolishingCost],
            ["washing",    "Washing / Detailing",  v.washingDetailingCost],
            ["fuel",       "Fuel",                v.fuelCost],
            ["paperwork",  "Paperwork / Tax",     v.paperworkTaxInsurance],
            ["commission", "Commission",          v.commission],
            ["other",      "Other Expenses",      v.otherExpenses],
        ];
        const activeCosts = allCostDefs.filter(([, , amt]) => amt > 0);
        const totalCosts = v.totalInvestment - v.purchasePrice;

        // always show cost section
        {
            // estimate height: section bar + each active category row + its breakdown items + total row
            let estH = 22 + activeCosts.length * 20 + 26;
            activeCosts.forEach(([cat]) => {
                const bd = v.costBreakdowns?.find((b: any) => b.category === cat);
                estH += (bd?.items?.length ?? 0) * 16;
            });
            need(Math.min(estH, PH - 80));
            y = sectionBar("RECONDITIONING & COSTS", `Total Extra Costs: ${dINR(totalCosts)}`, y);

            if (activeCosts.length === 0) {
                doc.rect(MG, y, CW, 22).fill(C.light);
                doc.fontSize(7).font("Helvetica").fillColor(C.muted)
                   .text("No reconditioning costs recorded.", MG + 8, y + 7, { lineBreak: false });
                y += 22;
            } else {
                activeCosts.forEach(([cat, label, total], ci) => {
                    // Category header row
                    need(20);
                    doc.rect(MG, y, CW, 20).fill(ci % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.text)
                       .text(label, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(C.amber)
                       .text(dINR(total), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    y += 20;

                    // Breakdown items
                    const bd = v.costBreakdowns?.find((b: any) => b.category === cat);
                    if (bd?.items?.length) {
                        bd.items.forEach((item: any) => {
                            need(16);
                            doc.rect(MG, y, CW, 16).fill("#fafafa");
                            doc.moveTo(MG + 16, y + 16).lineTo(MG + CW, y + 16).strokeColor(C.border).lineWidth(0.15).stroke();
                            doc.rect(MG, y, 3, 16).fill(C.amber + "60");
                            doc.fontSize(6.5).font("Helvetica").fillColor(C.slate)
                               .text(item.name + (item.date ? "  ·  " + dFmt(item.date) : ""), MG + 14, y + 4, { width: CW - 90, lineBreak: false });
                            doc.font("Helvetica-Bold").fillColor(C.text)
                               .text(dINR(item.amount), MG + 8, y + 4, { width: CW - 16, align: "right", lineBreak: false });
                            y += 16;
                        });
                    }
                });
            }

            // Total Investment summary row
            need(26);
            doc.rect(MG, y, CW, 26).fill(C.navy);
            doc.fontSize(7.5).font("Helvetica-Bold").fillColor(C.white)
               .text("TOTAL INVESTMENT  (Purchase + Reconditioning)", MG + 8, y + 9, { lineBreak: false });
            doc.fontSize(10).font("Helvetica-Bold").fillColor(C.white)
               .text(dINR(v.totalInvestment), MG + 8, y + 7, { width: CW - 16, align: "right", lineBreak: false });
            y += 26 + 10;
        }

        // PURCHASE PAYMENTS
        {
            const totalPaid = v.purchasePayments.reduce((s: number, p: any) => s + p.amount, 0);
            const pending = v.purchasePendingAmount ?? 0;
            need(22 + (v.purchasePayments.length || 1) * 20 + 30);
            y = sectionBar("PURCHASE PAYMENTS", dSl(v.purchasePaymentStatus), y);

            if (v.purchasePayments.length === 0) {
                doc.rect(MG, y, CW, 22).fill(C.light);
                doc.fontSize(7).font("Helvetica").fillColor(C.muted)
                   .text("No purchase payments recorded yet.", MG + 8, y + 7, { lineBreak: false });
                y += 22;
            } else {
                v.purchasePayments.forEach((p: any, i: number) => {
                    doc.rect(MG, y, CW, 20).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + 20).lineTo(MG + CW, y + 20).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate).text(`#${i + 1}`, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica").fillColor(C.text).text(dFmt(p.date), MG + 26, y + 6, { lineBreak: false });
                    doc.fillColor(C.muted).text(
                        `via ${p.mode}${(p as any).bankAccount ? " · " + (p as any).bankAccount : ""}${(p as any).notes ? " — " + (p as any).notes : ""}`,
                        MG + 115, y + 6, { width: 230, lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(C.indigo)
                       .text(dINR(p.amount), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    y += 20;
                });
            }

            // Payment summary footer
            need(28);
            doc.rect(MG, y, CW, 28).fill("#f0fdf4").strokeColor(pending > 0 ? "#fef9c3" : "#bbf7d0").lineWidth(0.5).stroke();
            const half = CW / 2;
            // Left: paid
            doc.fontSize(6.5).font("Helvetica").fillColor(C.muted).text("Total Paid", MG + 10, y + 5, { lineBreak: false });
            doc.fontSize(9).font("Helvetica-Bold").fillColor(C.green).text(dINR(totalPaid), MG + 10, y + 13, { lineBreak: false });
            // Right: pending
            doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
               .text(pending > 0 ? "Still Pending" : "Fully Paid", MG + half + 10, y + 5, { lineBreak: false });
            doc.fontSize(9).font("Helvetica-Bold").fillColor(pending > 0 ? C.red : C.green)
               .text(pending > 0 ? dINR(pending) : "✓ Cleared", MG + half + 10, y + 13, { lineBreak: false });
            // divider
            doc.moveTo(MG + half, y + 4).lineTo(MG + half, y + 24).strokeColor(C.border).lineWidth(0.4).stroke();
            y += 28 + 10;
        }

        // SALE INFORMATION
        if (isSold) {
            const soldPrice = (v as any).soldPrice ?? 0;
            const saleRows: [string, string, string?, boolean?][] = [
                ["Date Sold", dFmt((v as any).dateSold)],
                ["Sold To", (v as any).soldTo ?? "—", undefined, true],
                ["Buyer Phone", (v as any).soldToPhone ?? "—"],
                ["Sold Price", dINR(soldPrice), undefined, true],
                ["Total Received", dINR(v.receivedAmount), C.green, true],
                ["Balance / Pending", v.balanceAmount > 0 ? dINR(v.balanceAmount) : "Fully Received",
                    v.balanceAmount > 0 ? C.red : C.green, true],
                ["NOC Status", dSl(v.nocStatus)],
                ["Sale Status", v.saleStatus ? dSl(v.saleStatus) : "—"],
                ["Days to Sell", v.daysToSell != null ? `${v.daysToSell} days` : "—"],
                ["Profit / Loss", (isProfit ? "+" : "-") + dINR(Math.abs(pl)), isProfit ? C.green : C.red, true],
            ];
            need(22 + saleRows.length * 17 + 12);
            y = sectionBar("SALE INFORMATION", "", y);
            saleRows.forEach(([l, val, color, bold], i) => {
                kvRow(l, val, y, i, 17, color ?? C.text, !!bold);
                y += 17;
            });
            y += 10;

                const spList = v.salePayments.filter((p: any) => p.amount > 0);
            if (spList.length > 0) {
                const totalRec = spList.reduce((s: number, p: any) => s + p.amount, 0);
                need(22 + spList.length * 26 + 12);
                y = sectionBar("SALE PAYMENTS", `Total Received: ${dINR(totalRec)}`, y);
                spList.forEach((p: any, i: number) => {
                    const isExch = p.type === "exchange";
                    const rowH = isExch && ((p as any).exchangeVehicleMake || (p as any).exchangeVehicleRegNo) ? 28 : 20;
                    doc.rect(MG, y, CW, rowH).fill(i % 2 === 0 ? "#f1f5f9" : C.white);
                    doc.moveTo(MG, y + rowH).lineTo(MG + CW, y + rowH).strokeColor(C.border).lineWidth(0.2).stroke();
                    doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate).text(`#${i + 1}`, MG + 8, y + 6, { lineBreak: false });
                    doc.font("Helvetica").fillColor(C.text).text(dFmt(p.date), MG + 26, y + 6, { lineBreak: false });
                    const modeLabel = isExch ? "Exchange" : p.mode;
                    doc.fillColor(isExch ? "#d97706" : C.muted)
                       .text(`via ${modeLabel}${(p as any).notes ? " — " + (p as any).notes : ""}`,
                           MG + 115, y + 6, { width: 200, lineBreak: false });
                    doc.font("Helvetica-Bold").fillColor(C.green)
                       .text(dINR(p.amount), MG + 8, y + 6, { width: CW - 16, align: "right", lineBreak: false });
                    // Exchange vehicle sub-line
                    if (isExch && ((p as any).exchangeVehicleMake || (p as any).exchangeVehicleRegNo)) {
                        const exInfo = [(p as any).exchangeVehicleMake, (p as any).exchangeVehicleRegNo].filter(Boolean).join(" ");
                        doc.fontSize(6.5).font("Helvetica").fillColor("#d97706")
                           .text(`Exchange Vehicle: ${exInfo}`, MG + 26, y + 18, { width: CW - 34, lineBreak: false });
                    }
                    y += rowH;
                });
                y += 10;
            }
        }

        // ACTIVITY LOG
        {
            // Build the log list: real entries (newest first, max 10) + optional legacy exchange origin fallback
            const hasExchangeOriginLog = v.activityLog.some((l: any) => l.action === "received_via_exchange");
            const legacyExchangeEntry = (v as any).isFromExchange && !hasExchangeOriginLog
                ? [{
                    action: "received_via_exchange",
                    description: (v as any).exchangeDetails || "Received via exchange — entered inventory as a trade-in.",
                    amount: v.purchasePrice,
                    date: v.datePurchased,
                    _isLegacyFallback: true,
                }]
                : [];

            const allLogs = [...legacyExchangeEntry, ...v.activityLog];

            if (allLogs.length > 0) {
                const logs = [...allLogs].reverse().slice(0, 10);
                // Exchange origin rows are taller (need 2 lines: label + description)
                const estimatedH = 22 + logs.reduce((h: number, l: any) => h + (l.action === "received_via_exchange" ? 26 : 20), 0) + 12;
                need(estimatedH);
                y = sectionBar("ACTIVITY LOG", `Latest ${logs.length} of ${allLogs.length} entries`, y);
                logs.forEach((log: any, i: number) => {
                    const isExchangeOrigin = log.action === "received_via_exchange";
                    const rowH = isExchangeOrigin ? 26 : 20;
                    const rowBg = isExchangeOrigin ? "#fffbeb" : (i % 2 === 0 ? "#f1f5f9" : C.white);
                    const dotColor = isExchangeOrigin ? C.amber : C.indigo;

                    doc.rect(MG, y, CW, rowH).fill(rowBg);
                    doc.moveTo(MG, y + rowH).lineTo(MG + CW, y + rowH).strokeColor(C.border).lineWidth(0.2).stroke();
                    // Left accent bar for exchange origin
                    if (isExchangeOrigin) {
                        doc.rect(MG, y, 3, rowH).fill(C.amber);
                    }
                    doc.circle(MG + 12, y + (rowH / 2), 2.5).fill(dotColor);

                    // Fix "via Cash/mode" → "via Exchange (Make Reg)" for exchange payments
                    let desc = log.description.replace(/\u20B9/g, "Rs.");
                    if (log.action === "sale_payment" && log.amount) {
                        const match = v.salePayments.find(
                            (p: any) => p.amount === log.amount && p.type === "exchange"
                        );
                        if (match) {
                            const make = (match as any).exchangeVehicleMake ?? "";
                            const reg  = (match as any).exchangeVehicleRegNo  ?? "";
                            const exLabel = make
                                ? `Exchange (${make}${reg ? " " + reg : ""})`
                                : "Exchange";
                            desc = desc.replace(/via .+$/, `via ${exLabel}`);
                        }
                    }

                    if (isExchangeOrigin) {
                        // Two-line layout: "EXCHANGE ORIGIN" label + description
                        doc.fontSize(6).font("Helvetica-Bold").fillColor(C.amber)
                           .text("EXCHANGE ORIGIN", MG + 22, y + 4, { lineBreak: false });
                        doc.fontSize(7).font("Helvetica").fillColor(C.text)
                           .text(desc, MG + 22, y + 13, { width: CW - 120, lineBreak: false });
                        doc.fillColor(C.muted).text(dFmt(log.date), MG + 22, y + 13, { width: CW - 30, align: "right", lineBreak: false });
                    } else {
                        doc.fontSize(7).font("Helvetica").fillColor(C.text)
                           .text(desc, MG + 22, y + 5, { width: CW - 120, lineBreak: false });
                        doc.fillColor(C.muted).text(dFmt(log.date), MG + 22, y + 13, { lineBreak: false });
                    }

                    if (log.amount) {
                        doc.font("Helvetica-Bold").fillColor(isExchangeOrigin ? C.amber : C.indigo)
                           .text(dINR(log.amount), MG + 8, y + (rowH / 2) - 4, { width: CW - 16, align: "right", lineBreak: false });
                    }
                    y += rowH;
                });
                y += 10;
            }
        }


        // REMARKS & NOTES
        if (v.remarks || (v as any).notes) {
            need(60);
            y = sectionBar("REMARKS & NOTES", "", y);
            if (v.remarks) {
                doc.rect(MG, y, CW, 20).fill("#f1f5f9");
                doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate).text("Remarks:", MG + 8, y + 6, { lineBreak: false });
                doc.font("Helvetica").fillColor(C.text).text(v.remarks, MG + 75, y + 6, { width: CW - 83, lineBreak: false });
                y += 20;
            }
            if ((v as any).notes) {
                doc.rect(MG, y, CW, 20).fill(C.white);
                doc.fontSize(7).font("Helvetica-Bold").fillColor(C.slate).text("Notes:", MG + 8, y + 6, { lineBreak: false });
                doc.font("Helvetica").fillColor(C.text).text((v as any).notes, MG + 75, y + 6, { width: CW - 83, lineBreak: false });
                y += 20;
            }
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
    });
};
