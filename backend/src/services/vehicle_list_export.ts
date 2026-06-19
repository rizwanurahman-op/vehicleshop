import { Vehicle } from "../models/vehicle.model";

// ── Vehicle List Exports ─────────────────────────────────────────────────────

export interface VehicleListExportQuery {
    vehicleType?: string;
    status?: string;
    isFromExchange?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    format?: string;
}

const dINR = (n: number | null | undefined) =>
    n == null ? "—" : `Rs. ${Math.abs(n).toLocaleString("en-IN")}`;

const dFmt = (d: Date | string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dSl = (s: string | null | undefined) => {
    if (!s) return "—";
    if (s === "noc_cash_pending") return "NOC & Balance Pending";
    if (s === "noc_pending") return "NOC Pending";
    if (s === "not_applicable") return "Not Applicable";
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/Noc/g, "NOC");
};

// ── Build MongoDB filter from query ─────────────────────────────────────────
const buildFilter = (query: VehicleListExportQuery): Record<string, unknown> => {
    const { vehicleType, status, isFromExchange, search, dateFrom, dateTo } = query;
    const filter: Record<string, unknown> = { isActive: true };
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (isFromExchange === "true") filter.isFromExchange = true;
    if (isFromExchange === "false") filter.isFromExchange = { $ne: true };
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        filter.datePurchased = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const re = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { make: re }, { model: re }, { registrationNo: re },
                { vehicleId: re }, { purchasedFrom: re },
            ];
        }
    }
    return filter;
};

// ── CSV Export ──────────────────────────────────────────────────────────────
export const exportVehiclesCSV = async (query: VehicleListExportQuery): Promise<string> => {
    const filter = buildFilter(query);
    const vehicles = await Vehicle.find(filter)
        .sort({ datePurchased: -1 })
        .lean();

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "Vehicle ID", "Type", "Make", "Model", "Year", "Registration No",
        "Purchased From", "Date Purchased", "Purchase Price",
        "Total Investment", "Status", "Sale Status",
        "Date Sold", "Sold To", "Sold Price",
        "Received Amount", "Balance Amount",
        "Profit / Loss", "P/L %",
        "Funding Source", "From Exchange", "Sold via Exchange", "NOC Status",
    ];

    const rows = vehicles.map((v) => [
        v.vehicleId,
        v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
        v.make,
        v.model,
        v.year ?? "",
        v.registrationNo,
        v.purchasedFrom,
        dFmt(v.datePurchased),
        v.purchasePrice,
        v.totalInvestment,
        dSl(v.status),
        dSl((v as any).saleStatus ?? ""),
        dFmt((v as any).dateSold),
        (v as any).soldTo ?? "",
        (v as any).soldPrice ?? "",
        v.receivedAmount,
        v.balanceAmount,
        v.profitLoss ?? "",
        v.profitLossPercentage != null ? v.profitLossPercentage.toFixed(1) + "%" : "",
        dSl((v as any).fundingSource ?? ""),
        (v as any).isFromExchange ? "Yes" : "No",
        (v as any).isExchange ? "Yes" : "No",
        dSl(v.nocStatus),
    ].map(esc).join(","));

    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ──────────────────────────────────────────────────────────────
export const exportVehiclesPDF = async (query: VehicleListExportQuery): Promise<Buffer> => {
    const filter = buildFilter(query);
    const vehicles = await Vehicle.find(filter)
        .sort({ datePurchased: -1 })
        .lean();

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;   // landscape A4: ~841
        const PH = doc.page.height;  // landscape A4: ~595
        const MG = 28;
        const CW = PW - MG * 2;     // ~785

        const C = {
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a",
            red: "#dc2626", amber: "#d97706", slate: "#64748b",
            cyan: "#0891b2", purple: "#7c3aed",
            white: "#ffffff", border: "#e2e8f0", light: "#f8fafc",
            text: "#1e293b", muted: "#94a3b8",
        };

        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook — Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER ──────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 52).fill(C.navy);
        doc.rect(0, 48, PW, 4).fill(C.indigo);
        doc.fontSize(18).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 31, { lineBreak: false });

        const labelParts: string[] = ["Vehicle List Report"];
        if (query.vehicleType) labelParts.push(query.vehicleType === "two_wheeler" ? "· Two Wheelers" : "· Four Wheelers");
        if (query.status) labelParts.push(`· ${dSl(query.status)}`);
        if (query.isFromExchange === "true") labelParts.push("· Exchange only");
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(labelParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(
                `Generated: ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}  ·  ${vehicles.length} records`,
                MG, 29, { width: CW, align: "right", lineBreak: false },
            );

        // ── SUMMARY BAND ────────────────────────────────────────────────
        const totalInvested = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
        const soldVehicles = vehicles.filter((v) => (v as any).dateSold);
        const totalRevenue = soldVehicles.reduce((s, v) => s + ((v as any).soldPrice ?? 0), 0);
        const totalProfit = soldVehicles.reduce((s, v) => s + (v.profitLoss ?? 0), 0);
        const inStockCount = vehicles.filter((v) => v.status === "in_stock").length;

        const summaryY = 56;
        const mW = CW / 4;
        [
            { label: "TOTAL VEHICLES",  value: vehicles.length.toString(),  accent: C.indigo },
            { label: "IN STOCK",         value: inStockCount.toString(),      accent: C.green },
            { label: "TOTAL INVESTED",   value: dINR(totalInvested),          accent: C.amber },
            { label: "NET PROFIT (SOLD)",value: dINR(totalProfit),            accent: totalProfit >= 0 ? C.green : C.red },
        ].forEach((m, i) => {
            const mx = MG + i * (mW + 3);
            doc.rect(mx, summaryY, mW - 3, 34).fill(C.light).strokeColor(m.accent + "40").lineWidth(0.5).stroke();
            doc.rect(mx, summaryY, 3, 34).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 8, summaryY + 5, { lineBreak: false });
            doc.fontSize(10).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 8, summaryY + 14, { lineBreak: false });
        });

        // ── TABLE ────────────────────────────────────────────────────────
        const tableY = summaryY + 42;

        // 12 columns totalling CW (~785px)
        // [label, width, align]
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",              18, "center"],
            ["ID",             52, "left"],
            ["Type",           44, "left"],
            ["Make / Model",  118, "left"],
            ["Reg No",         70, "left"],
            ["Date Purchased", 58, "left"],
            ["Purchase",       58, "right"],
            ["Invested",       60, "right"],
            ["Status",         62, "left"],   // main inventory status only
            ["Flags",         100, "left"],   // payment status · exchange flags
            ["Sold Price",     64, "right"],
            ["P/L",            63, "right"],
        ];
        // 18+52+44+118+70+58+58+60+62+100+64+63 = 767 (pad ~18 into flags for readability)

        const ROW_H = 16;

        const statusColorMap: Record<string, string> = {
            in_stock: C.green, reconditioning: C.amber,
            ready_for_sale: C.cyan, sold: C.green,
            sold_pending: C.amber, exchanged: C.purple,
        };

        const drawHeader = (startY: number) => {
            doc.rect(MG, startY, CW, 16).fill(C.navy);
            let hx = MG;
            cols.forEach(([label, w, align]) => {
                doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                    .text(label, hx + 3, startY + 5, { width: w - 6, align, lineBreak: false });
                hx += w;
            });
        };

        let y = tableY;
        drawHeader(y);
        y += 16;

        const need = (h: number) => {
            if (y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                y = MG;
                drawHeader(y);
                y += 16;
            }
        };

        if (vehicles.length === 0) {
            need(24);
            doc.rect(MG, y, CW, 24).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No vehicles match the selected filters.", MG + 10, y + 8, { lineBreak: false });
            y += 24;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const textY = y + 5;
                const pl = v.profitLoss ?? 0;
                const plColor = pl > 0 ? C.green : pl < 0 ? C.red : C.muted;
                const isSold = !!(v as any).dateSold;

                // Build flag parts
                const flagParts: { label: string; color: string }[] = [];
                const saleStatus = (v as any).saleStatus as string | undefined;
                if (saleStatus === "balance_pending")     flagParts.push({ label: "Bal. Pending",    color: C.amber });
                else if (saleStatus === "noc_pending")    flagParts.push({ label: "NOC Pending",     color: "#ca8a04" });
                else if (saleStatus === "fully_received") flagParts.push({ label: "Fully Received",  color: C.green });
                else if (saleStatus === "noc_cash_pending") flagParts.push({ label: "NOC + Cash Pending", color: C.red });
                if ((v as any).isFromExchange)            flagParts.push({ label: "From Exchange",   color: C.cyan });
                if ((v as any).isExchange)                flagParts.push({ label: "Sold via Exch.",  color: C.purple });

                // Render standard cells
                let rx = MG;

                const cell = (text: string, colIdx: number, color?: string) => {
                    const [, w, align] = cols[colIdx];
                    doc.fontSize(6.5).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 3, textY, { width: w - 6, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                                                     0);
                cell(v.vehicleId ?? "—",                                               1);
                cell(v.vehicleType === "two_wheeler" ? "Two Whlr" : "Four Whlr",      2, C.slate);
                cell(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`,             3);
                cell(v.registrationNo,                                                 4);
                cell(dFmt(v.datePurchased),                                            5, C.slate);
                cell(dINR(v.purchasePrice),                                            6);
                cell(dINR(v.totalInvestment),                                          7);

                // Status column — inventory status with colour
                const [, stW] = cols[8];
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(statusColorMap[v.status] ?? C.slate)
                    .text(dSl(v.status), rx + 3, textY, { width: stW - 6, lineBreak: false });
                rx += stW;

                // Flags column — inline dot-separated flag pills
                const [, flagW] = cols[9];
                if (flagParts.length === 0) {
                    doc.fontSize(6.5).font("Helvetica").fillColor(C.muted)
                        .text("—", rx + 3, textY, { width: flagW - 6, lineBreak: false });
                } else {
                    let fx = rx + 3;
                    flagParts.forEach((fp, fi) => {
                        doc.fontSize(6).font("Helvetica-Bold").fillColor(fp.color)
                            .text(fp.label, fx, textY, { lineBreak: false });
                        fx += doc.widthOfString(fp.label);
                        if (fi < flagParts.length - 1) {
                            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                                .text(" · ", fx, textY, { lineBreak: false });
                            fx += doc.widthOfString(" · ");
                        }
                    });
                }
                rx += flagW;

                // Sold Price
                const [, soldW] = cols[10];
                doc.fontSize(6.5).font("Helvetica").fillColor(isSold ? C.text : C.muted)
                    .text(isSold ? dINR((v as any).soldPrice) : "—", rx + 3, textY, { width: soldW - 6, align: "right", lineBreak: false });
                rx += soldW;

                // P/L
                const [, plW] = cols[11];
                doc.fontSize(6.5).font("Helvetica").fillColor(isSold ? plColor : C.muted)
                    .text(isSold ? (pl >= 0 ? "+" : "") + dINR(pl) : "—", rx + 3, textY, { width: plW - 6, align: "right", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS ROW ───────────────────────────────────────────────────
        need(20);
        doc.rect(MG, y, CW, 20).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${vehicles.length} vehicles  ·  Total Invested: ${dINR(totalInvested)}  ·  Total Revenue: ${dINR(totalRevenue)}  ·  Net P/L (sold): ${dINR(totalProfit)}`,
                MG + 8, y + 6, { lineBreak: false },
            );
        y += 20;

        addFooter();

        // Page numbers
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
