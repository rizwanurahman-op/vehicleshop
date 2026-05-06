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

const dSl = (s: string | null | undefined) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

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
    if (search) filter.$text = { $search: search };
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
        "Funding Source", "Is Exchange", "NOC Status",
    ];

    const rows = vehicles.map((v) => {
        const isExch = (v as any).isFromExchange ? "Yes" : "No";
        return [
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
            dSl(v.saleStatus ?? ""),
            dFmt((v as any).dateSold),
            (v as any).soldTo ?? "",
            (v as any).soldPrice ?? "",
            v.receivedAmount,
            v.balanceAmount,
            v.profitLoss ?? "",
            v.profitLossPercentage != null ? v.profitLossPercentage.toFixed(1) + "%" : "",
            dSl((v as any).fundingSource ?? ""),
            isExch,
            dSl(v.nocStatus),
        ].map(esc).join(",");
    });

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

        const PW = doc.page.width;   // landscape: ~841
        const PH = doc.page.height;  // landscape: ~595
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a",
            red: "#dc2626", amber: "#d97706", slate: "#64748b",
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
        const summaryMetrics = [
            { label: "TOTAL VEHICLES", value: vehicles.length.toString(), accent: C.indigo },
            { label: "IN STOCK", value: inStockCount.toString(), accent: C.green },
            { label: "TOTAL INVESTED", value: dINR(totalInvested), accent: C.amber },
            { label: "NET PROFIT (SOLD)", value: dINR(totalProfit), accent: totalProfit >= 0 ? C.green : C.red },
        ];
        summaryMetrics.forEach((m, i) => {
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

        // Column definitions [label, width, align]
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",          20, "center"],
            ["ID",         36, "left"],
            ["Type",       50, "left"],
            ["Make / Model", 100, "left"],
            ["Reg No",     70, "left"],
            ["Date Purchased", 60, "left"],
            ["Purchase",   58, "right"],
            ["Invested",   58, "right"],
            ["Status",     56, "left"],
            ["Sold Price", 58, "right"],
            ["P/L",        58, "right"],
        ];

        // Table header
        let y = tableY;
        doc.rect(MG, y, CW, 16).fill(C.navy);
        let cx = MG;
        cols.forEach(([label, w, align]) => {
            doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                .text(label, cx + 3, y + 4, { width: w - 6, align, lineBreak: false });
            cx += w;
        });
        y += 16;

        const ROW_H = 16;

        const need = (h: number) => {
            if (y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                y = MG;
                // Repeat header
                doc.rect(MG, y, CW, 16).fill(C.navy);
                let hx = MG;
                cols.forEach(([label, w, align]) => {
                    doc.fontSize(6).font("Helvetica-Bold").fillColor(C.white)
                        .text(label, hx + 3, y + 4, { width: w - 6, align, lineBreak: false });
                    hx += w;
                });
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
                const rowBg = idx % 2 === 0 ? "#f8fafc" : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const pl = v.profitLoss ?? 0;
                const plColor = pl > 0 ? C.green : pl < 0 ? C.red : C.muted;
                const isSold = !!(v as any).dateSold;

                const statusColor: Record<string, string> = {
                    in_stock: C.green, reconditioning: C.amber,
                    ready_for_sale: "#0891b2", sold: C.green,
                    sold_pending: C.amber, exchanged: "#a855f7",
                };

                const cells: [string, string, "left" | "right" | "center", string?][] = [
                    [`${idx + 1}`, "6", "center"],
                    [v.vehicleId ?? "—", "6.5", "left"],
                    [v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler", "6.5", "left"],
                    [`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, "6.5", "left"],
                    [v.registrationNo, "6.5", "left"],
                    [dFmt(v.datePurchased), "6", "left"],
                    [dINR(v.purchasePrice), "6.5", "right"],
                    [dINR(v.totalInvestment), "6.5", "right"],
                    [dSl(v.status), "6", "left", statusColor[v.status] ?? C.slate],
                    [isSold ? dINR((v as any).soldPrice) : "—", "6.5", "right"],
                    [isSold ? (pl >= 0 ? "+" : "") + dINR(pl) : "—", "6.5", "right", isSold ? plColor : C.muted],
                ];

                let rx = MG;
                cells.forEach(([text, , align, color], ci) => {
                    const [, w] = cols[ci];
                    doc.fontSize(6.5).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 3, y + 4, { width: w - 6, align, lineBreak: false });
                    rx += w;
                });

                y += ROW_H;
            });
        }

        // ── TOTALS ROW ───────────────────────────────────────────────────
        need(20);
        doc.rect(MG, y, CW, 20).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(`${vehicles.length} vehicles  ·  Total Invested: ${dINR(totalInvested)}  ·  Total Revenue: ${dINR(totalRevenue)}  ·  Net P/L (sold): ${dINR(totalProfit)}`,
                MG + 8, y + 6, { lineBreak: false });
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
