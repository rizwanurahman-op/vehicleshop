import { Vehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

export interface SalesExportQuery {
    source?: string;
    saleStatus?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    isExchange?: string;
}

const dINR = (n: number | null | undefined) =>
    n == null ? "—" : `Rs. ${Math.abs(n).toLocaleString("en-IN")}`;

const dFmt = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dSl = (s: string | null | undefined) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const escWord = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildVehicleFilter = (query: SalesExportQuery) => {
    const { source, saleStatus, search, dateFrom, dateTo, isExchange } = query;
    if (source && source !== "vehicle") return null;
    const match: Record<string, unknown> = { isActive: true, status: { $in: ["sold", "sold_pending"] } };
    if (saleStatus && saleStatus !== "all") match.saleStatus = saleStatus;
    if (isExchange === "true") match.isExchange = true;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        match.dateSold = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const words = trimmed.split(/\s+/);
            if (words.length === 1) {
                const re = new RegExp(escWord(words[0]), "i");
                match.$or = [{ make: re }, { model: re }, { registrationNo: re }, { soldTo: re }, { vehicleId: re }];
            } else {
                match.$and = words.map((w) => { const re = new RegExp(escWord(w), "i"); return { $or: [{ make: re }, { model: re }] }; });
            }
        }
    }
    return match;
};

const buildConsignmentFilter = (query: SalesExportQuery) => {
    const { source, saleStatus, search, dateFrom, dateTo, isExchange } = query;
    if (source && source !== "consignment") return null;
    const match: Record<string, unknown> = { isActive: true, status: { $in: ["sold", "sold_pending"] } };
    if (saleStatus && saleStatus !== "all") {
        const statusMap: Record<string, string> = { fully_received: "fully_closed", balance_pending: "partial" };
        match.settlementStatus = statusMap[saleStatus] || saleStatus;
    }
    if (isExchange === "true") match.isExchange = true;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        match.dateSold = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const words = trimmed.split(/\s+/);
            if (words.length === 1) {
                const re = new RegExp(escWord(words[0]), "i");
                match.$or = [{ make: re }, { model: re }, { registrationNo: re }, { soldTo: re }, { consignmentId: re }];
            } else {
                match.$and = words.map((w) => { const re = new RegExp(escWord(w), "i"); return { $or: [{ make: re }, { model: re }] }; });
            }
        }
    }
    return match;
};

// ── CSV Export ──────────────────────────────────────────────────────────────
export const exportSalesCSV = async (query: SalesExportQuery): Promise<string> => {
    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows: string[] = [];

    const vFilter = buildVehicleFilter(query);
    if (vFilter) {
        const vehicles = await Vehicle.find(vFilter)
            .select("vehicleId vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice totalInvestment receivedAmount balanceAmount profitLoss profitLossPercentage saleStatus isExchange daysToSell")
            .sort({ dateSold: -1 }).lean();
        for (const v of vehicles) {
            rows.push([
                v.vehicleId, "Purchase", v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
                v.make, v.model, v.registrationNo, dFmt(v.dateSold),
                v.soldTo || "—", (v as any).soldToPhone || "",
                v.soldPrice, v.receivedAmount, v.balanceAmount,
                v.profitLoss, `${(v as any).profitLossPercentage?.toFixed(1) ?? "0.0"}%`,
                dSl(v.saleStatus), v.isExchange ? "Yes" : "No",
                (v as any).daysToSell != null ? (v as any).daysToSell : "—",
            ].map(esc).join(","));
        }
    }

    const cFilter = buildConsignmentFilter(query);
    if (cFilter) {
        const consignments = await ConsignmentVehicle.find(cFilter)
            .select("consignmentId saleType vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice receivedAmount buyerBalance netProfit profitLossPercentage settlementStatus isExchange daysInShop")
            .sort({ dateSold: -1 }).lean();
        for (const c of consignments) {
            const saleStatus = c.settlementStatus === "fully_closed" ? "Fully Received" : c.settlementStatus === "open" ? "Balance Pending" : dSl(c.settlementStatus);
            rows.push([
                c.consignmentId, dSl(c.saleType) || "Consignment", c.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
                c.make, c.model, c.registrationNo, dFmt(c.dateSold),
                c.soldTo || "—", (c as any).soldToPhone || "",
                c.soldPrice, c.receivedAmount || 0, c.buyerBalance || 0,
                c.netProfit || 0, `${(c as any).profitLossPercentage?.toFixed(1) ?? "0.0"}%`,
                saleStatus, c.isExchange ? "Yes" : "No",
                (c as any).daysInShop != null ? (c as any).daysInShop : "—",
            ].map(esc).join(","));
        }
    }

    const headers = ["Ref ID", "Source", "Type", "Make", "Model", "Reg No", "Date Sold",
        "Buyer", "Buyer Phone", "Sold Price", "Received", "Balance", "Profit/Loss", "P/L %", "Status", "Exchange", "Days to Sell"];
    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ──────────────────────────────────────────────────────────────
export const exportSalesPDF = async (query: SalesExportQuery): Promise<Buffer> => {
    type SaleRow = {
        refId: string; source: string; vehicleType: string; make: string; model: string;
        registrationNo: string; dateSold: Date | null; soldTo: string; soldToPhone: string;
        soldPrice: number; received: number; balance: number; profit: number;
        profitPct: number; status: string; isExchange: boolean; daysToSell: number | null;
    };
    const allRows: SaleRow[] = [];

    const vFilter = buildVehicleFilter(query);
    if (vFilter) {
        const vehicles = await Vehicle.find(vFilter)
            .select("vehicleId vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice totalInvestment receivedAmount balanceAmount profitLoss profitLossPercentage saleStatus isExchange daysToSell")
            .sort({ dateSold: -1 }).lean();
        for (const v of vehicles) {
            allRows.push({
                refId: v.vehicleId, source: "Purchase",
                vehicleType: v.vehicleType, make: v.make, model: v.model,
                registrationNo: v.registrationNo, dateSold: v.dateSold || null,
                soldTo: v.soldTo || "—", soldToPhone: (v as any).soldToPhone || "",
                soldPrice: v.soldPrice || 0, received: v.receivedAmount || 0,
                balance: v.balanceAmount || 0, profit: v.profitLoss || 0,
                profitPct: (v as any).profitLossPercentage || 0,
                status: dSl(v.saleStatus), isExchange: v.isExchange || false,
                daysToSell: (v as any).daysToSell ?? null,
            });
        }
    }
    const cFilter = buildConsignmentFilter(query);
    if (cFilter) {
        const consignments = await ConsignmentVehicle.find(cFilter)
            .select("consignmentId saleType vehicleType make model registrationNo dateSold soldTo soldToPhone soldPrice receivedAmount buyerBalance netProfit profitLossPercentage settlementStatus isExchange daysInShop")
            .sort({ dateSold: -1 }).lean();
        for (const c of consignments) {
            const status = c.settlementStatus === "fully_closed" ? "Fully Received" : c.settlementStatus === "open" ? "Balance Pending" : dSl(c.settlementStatus);
            allRows.push({
                refId: c.consignmentId, source: dSl(c.saleType) || "Consignment",
                vehicleType: c.vehicleType, make: c.make, model: c.model,
                registrationNo: c.registrationNo, dateSold: c.dateSold || null,
                soldTo: c.soldTo || "—", soldToPhone: (c as any).soldToPhone || "",
                soldPrice: c.soldPrice || 0, received: c.receivedAmount || 0,
                balance: c.buyerBalance || 0, profit: c.netProfit || 0,
                profitPct: (c as any).profitLossPercentage || 0,
                status, isExchange: c.isExchange || false,
                daysToSell: (c as any).daysInShop ?? null,
            });
        }
    }
    allRows.sort((a, b) => (b.dateSold?.getTime() ?? 0) - (a.dateSold?.getTime() ?? 0));

    // ── Aggregate stats ──
    const totalRevenue = allRows.reduce((s, r) => s + r.soldPrice, 0);
    const totalReceived = allRows.reduce((s, r) => s + r.received, 0);
    const totalBalance = allRows.reduce((s, r) => s + r.balance, 0);
    const totalProfit = allRows.reduce((s, r) => s + r.profit, 0);
    const pendingCount = allRows.filter(r => r.balance > 0).length;
    const exchangeCount = allRows.filter(r => r.isExchange).length;
    const purchaseSales = allRows.filter(r => r.source === "Purchase").length;
    const consignmentSales = allRows.filter(r => r.source !== "Purchase").length;

    const PDFDocument = (await import("pdfkit")).default;
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width, PH = doc.page.height, MG = 28, CW = PW - MG * 2;
        const C = {
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a", red: "#dc2626",
            amber: "#d97706", white: "#ffffff", border: "#e2e8f0", light: "#f8fafc",
            text: "#1e293b", muted: "#94a3b8", orange: "#ea580c", violet: "#7c3aed",
            slate: "#64748b",
        };

        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18).strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook — Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER ──────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 52).fill(C.navy);
        doc.rect(0, 48, PW, 4).fill(C.indigo);
        doc.fontSize(18).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 31, { lineBreak: false });

        // Dynamic report title with active filter labels
        const titleParts: string[] = ["Sales Register Report"];
        if (query.source && query.source !== "all") titleParts.push(`· ${query.source === "vehicle" ? "Purchased Vehicles" : "Consignments"}`);
        if (query.saleStatus && query.saleStatus !== "all") titleParts.push(`· ${dSl(query.saleStatus)}`);
        if (query.isExchange === "true") titleParts.push("· Exchange Only");
        if (query.dateFrom || query.dateTo) {
            const range = [query.dateFrom && dFmt(query.dateFrom), query.dateTo && dFmt(query.dateTo)].filter(Boolean).join(" – ");
            titleParts.push(`· ${range}`);
        }
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(
                `Generated: ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}  ·  ${allRows.length} records`,
                MG, 29, { width: CW, align: "right", lineBreak: false },
            );

        // ── SUMMARY BAND (5 financial cards) ───────────────────────────────
        const summaryY = 56;
        const mW = CW / 5;
        const summaryMetrics = [
            { label: "TOTAL SALES", value: allRows.length.toString(), sub: `${purchaseSales} purchase · ${consignmentSales} consignment`, accent: C.indigo },
            { label: "TOTAL REVENUE", value: dINR(totalRevenue), accent: C.amber },
            { label: "AMOUNT RECEIVED", value: dINR(totalReceived), accent: C.green },
            { label: "OUTSTANDING", value: dINR(totalBalance), sub: `${pendingCount} pending`, accent: C.red },
            { label: "TOTAL PROFIT", value: dINR(totalProfit), accent: totalProfit >= 0 ? C.green : C.red },
        ];
        summaryMetrics.forEach((m, i) => {
            const mx = MG + i * (mW + 1.2);
            doc.rect(mx, summaryY, mW - 1.2, 36).fill(C.light).strokeColor(m.accent + "40").lineWidth(0.5).stroke();
            doc.rect(mx, summaryY, 3, 36).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 7, summaryY + 5, { lineBreak: false });
            doc.fontSize(9).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 7, summaryY + 15, { lineBreak: false });
            if (m.sub) {
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(m.sub, mx + 7, summaryY + 27, { width: mW - 16, lineBreak: false });
            }
        });

        // ── SOURCE BREAKDOWN STRIP (Purchase · Park/Finance · Exchange) ─────
        const stripY = summaryY + 40;
        const stripH = 18;
        const stripItems = [
            { label: "Purchase Sales", value: purchaseSales, color: C.indigo },
            { label: "Park / Finance Sales", value: consignmentSales, color: C.violet },
            { label: "Exchange Sales", value: exchangeCount, color: C.orange },
        ];
        const stripW = CW / 3;
        doc.rect(MG, stripY, CW, stripH).fill("#f1f5f9").strokeColor(C.border).lineWidth(0.3).stroke();
        stripItems.forEach((item, i) => {
            const sx = MG + i * stripW;
            // coloured left pip
            doc.rect(sx + 8, stripY + 5, 3, 8).fill(item.color);
            doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
                .text(item.label, sx + 15, stripY + 5, { lineBreak: false });
            doc.fontSize(7).font("Helvetica-Bold").fillColor(item.color)
                .text(item.value.toString(), sx + 15 + 90, stripY + 5, { lineBreak: false });
            // vertical divider between items
            if (i < 2) {
                doc.moveTo(sx + stripW, stripY + 3).lineTo(sx + stripW, stripY + stripH - 3)
                    .strokeColor(C.border).lineWidth(0.5).stroke();
            }
        });

        // ── TABLE ───────────────────────────────────────────────────────────
        const tableY = stripY + stripH + 4;

        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#", 18, "center"],
            ["Ref ID", 46, "left"],
            ["Source", 52, "left"],
            ["Make / Model", 96, "left"],
            ["Reg No", 66, "left"],
            ["Buyer", 78, "left"],
            ["Date Sold", 54, "left"],
            ["Days", 26, "center"],
            ["Sold Price", 64, "right"],
            ["Received", 60, "right"],
            ["Balance", 56, "right"],
            ["Profit/Loss", 60, "right"],
            ["Status", 72, "center"],  // wider — fits "Balance Pending"
        ];

        let y = tableY;
        const drawHeader = () => {
            doc.rect(MG, y, CW, 16).fill(C.navy);
            let cx = MG;
            cols.forEach(([label, w, align]) => {
                doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                    .text(label, cx + 3, y + 4, { width: w - 6, align, lineBreak: false });
                cx += w;
            });
            y += 16;
        };
        drawHeader();

        const ROW_H = 16;
        const need = (h: number) => {
            if (y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                y = MG;
                drawHeader();
            }
        };

        if (allRows.length === 0) {
            need(24);
            doc.rect(MG, y, CW, 24).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No sales match the selected filters.", MG + 10, y + 8, { lineBreak: false });
            y += 24;
        } else {
            allRows.forEach((r, idx) => {
                need(ROW_H);
                doc.rect(MG, y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const statusColor = r.status.toLowerCase().includes("fully") ? C.green
                    : r.balance > 0 ? C.red
                        : C.muted;
                const profitColor = r.profit >= 0 ? C.green : C.red;
                const srcColor = r.source === "Purchase" ? C.indigo
                    : r.source.toLowerCase().includes("park") ? C.violet
                        : C.slate;

                // Exchange badge prefix on Ref ID
                const refLabel = r.isExchange ? `* ${r.refId}` : r.refId;

                // Abbreviate long status labels so they fit the column
                const shortStatus = r.status === "Fully Received" ? "Fully Paid"
                    : r.status === "Balance Pending" ? "Bal. Pending"
                        : r.status === "Noc Pending" ? "NOC Pend."
                            : r.status;

                const cells: [string, "left" | "right" | "center", string?][] = [
                    [`${idx + 1}`, "center"],
                    [refLabel, "left", r.isExchange ? C.orange : C.text],
                    [r.source, "left", srcColor],
                    [`${r.make} ${r.model}`, "left"],
                    [r.registrationNo, "left"],
                    [r.soldTo, "left"],
                    [dFmt(r.dateSold), "left"],
                    [r.daysToSell != null ? `${r.daysToSell}d` : "—", "center", C.muted],
                    [dINR(r.soldPrice), "right"],
                    [dINR(r.received), "right", C.green],
                    [r.balance > 0 ? dINR(r.balance) : "—", "right", r.balance > 0 ? C.red : C.muted],
                    [`${r.profit >= 0 ? "+" : ""}${dINR(r.profit)}`, "right", profitColor],
                    [shortStatus, "center", statusColor],
                ];

                let rx = MG;
                cells.forEach(([text, align, color], ci) => {
                    const [, w] = cols[ci];
                    // Status column (last) uses slightly smaller font to guarantee fit
                    const fs = ci === cols.length - 1 ? 6 : 6.5;
                    doc.fontSize(fs).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 3, y + 4, { width: w - 6, align, lineBreak: false });
                    rx += w;
                });
                y += ROW_H;
            });
        }

        // ── TOTALS FOOTER ROW ────────────────────────────────────────────────
        need(22);
        doc.rect(MG, y, CW, 22).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${allRows.length} records  ·  Revenue: ${dINR(totalRevenue)}  ·  Received: ${dINR(totalReceived)}  ·  Balance: ${dINR(totalBalance)}  ·  Profit: ${totalProfit >= 0 ? "+" : ""}${dINR(totalProfit)}  ·  Exchange: ${exchangeCount}  ·  Pending: ${pendingCount}`,
                MG + 8, y + 7, { lineBreak: false },
            );
        y += 22;

        addFooter();

        // ── PAGE NUMBERS ─────────────────────────────────────────────────────
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }
        doc.end();
    });
};
