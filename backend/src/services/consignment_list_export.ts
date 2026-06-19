import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

// ── Consignment List Exports ──────────────────────────────────────────────────

export interface ConsignmentListExportQuery {
    saleType?: string;
    vehicleType?: string;
    status?: string;
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

// ── Build MongoDB filter ──────────────────────────────────────────────────────
const buildFilter = (query: ConsignmentListExportQuery): Record<string, unknown> => {
    const { saleType, vehicleType, status, search, dateFrom, dateTo } = query;
    const filter: Record<string, unknown> = { isActive: true };
    if (saleType) filter.saleType = saleType;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
        filter.dateReceived = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const re = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { make: re }, { model: re }, { registrationNo: re },
                { consignmentId: re }, { previousOwner: re }, { soldTo: re },
            ];
        }
    }
    return filter;
};

// ── CSV Export ───────────────────────────────────────────────────────────────
export const exportConsignmentsCSV = async (query: ConsignmentListExportQuery): Promise<string> => {
    const filter = buildFilter(query);
    const vehicles = await ConsignmentVehicle.find(filter).sort({ dateReceived: -1 }).lean();

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "Consignment ID", "Sale Type", "Vehicle Type", "Make", "Model", "Year",
        "Registration No", "Previous Owner", "Date Received",
        "Purchase Price", "Recon Cost", "Total Investment",
        "Status", "Settlement Status",
        "Date Sold", "Sold To", "Sold Price",
        "Net Profit", "P/L %",
        "Days in Shop", "From Exchange",
    ];

    const rows = vehicles.map((v) => [
        v.consignmentId,
        v.saleType === "park_sale" ? "Park Sale" : "Finance Sale",
        v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
        v.make,
        v.model,
        v.year ?? "",
        v.registrationNo,
        v.previousOwner,
        dFmt(v.dateReceived),
        v.purchasePrice ?? "",
        v.totalReconCost ?? "",
        v.totalInvestment,
        dSl(v.status),
        dSl(v.settlementStatus),
        dFmt((v as any).dateSold),
        (v as any).soldTo ?? "",
        (v as any).soldPrice ?? "",
        (v as any).netProfit ?? "",
        (v as any).profitLossPercentage != null ? (v as any).profitLossPercentage.toFixed(1) + "%" : "",
        v.daysInShop != null ? v.daysInShop : "",
        (v as any).isFromExchange ? "Yes" : "No",
    ].map(esc).join(","));

    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ───────────────────────────────────────────────────────────────
export const exportConsignmentsPDF = async (query: ConsignmentListExportQuery): Promise<Buffer> => {
    const filter = buildFilter(query);
    const vehicles = await ConsignmentVehicle.find(filter).sort({ dateReceived: -1 }).lean();

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;
        const PH = doc.page.height;
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy: "#0f172a", indigo: "#6366f1", green: "#16a34a",
            red: "#dc2626", amber: "#d97706", slate: "#64748b",
            violet: "#7c3aed", blue: "#2563eb",
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

        const labelParts: string[] = ["Consignment Inventory Report"];
        if (query.saleType) labelParts.push(query.saleType === "park_sale" ? "· Park Sale" : "· Finance Sale");
        if (query.vehicleType) labelParts.push(query.vehicleType === "two_wheeler" ? "· Two Wheelers" : "· Four Wheelers");
        if (query.status) labelParts.push(`· ${dSl(query.status)}`);
        if (query.dateFrom || query.dateTo) {
            const range = [query.dateFrom && dFmt(query.dateFrom), query.dateTo && dFmt(query.dateTo)].filter(Boolean).join(" – ");
            labelParts.push(`· ${range}`);
        }
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(labelParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(
                `Generated: ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}  ·  ${vehicles.length} records`,
                MG, 29, { width: CW, align: "right", lineBreak: false },
            );

        // ── SUMMARY BAND ────────────────────────────────────────────────
        const totalInvested = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
        const soldVehicles = vehicles.filter((v) => !!(v as any).dateSold);
        const totalRevenue = soldVehicles.reduce((s, v) => s + ((v as any).soldPrice ?? 0), 0);
        const totalProfit = soldVehicles.reduce((s, v) => s + ((v as any).netProfit ?? 0), 0);
        const inShopCount = vehicles.filter((v) => !["sold", "sold_pending", "returned"].includes(v.status)).length;

        const summaryY = 56;
        const mW = CW / 4;
        [
            { label: "TOTAL CONSIGNMENTS", value: vehicles.length.toString(), accent: C.indigo },
            { label: inShopCount === 0 ? "IN SHOP (CLEAR)" : "IN SHOP", value: inShopCount.toString(), accent: inShopCount === 0 ? C.green : C.amber },
            { label: "TOTAL INVESTED",     value: dINR(totalInvested),          accent: C.slate },
            { label: "NET PROFIT (SOLD)",  value: dINR(totalProfit),            accent: totalProfit >= 0 ? C.green : C.red },
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

        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",            18, "center"],
            ["ID",           52, "left"],
            ["Type",         52, "left"],
            ["Make / Model", 118, "left"],
            ["Reg No",       70, "left"],
            ["Received",     58, "left"],
            ["Invested",     64, "right"],
            ["Status",       72, "left"],
            ["Owner",        100, "left"],
            ["Sold Price",   64, "right"],
            ["Net P/L",      63, "right"],
        ];
        // 18+52+52+118+70+58+64+72+100+64+63 = 731 — remaining ~54 spread into cols above

        const ROW_H = 16;

        const statusColorMap: Record<string, string> = {
            received: C.slate, reconditioning: C.amber,
            ready_for_sale: C.green, sold: C.blue,
            sold_pending: C.amber, returned: C.red,
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
                .text("No consignments match the selected filters.", MG + 10, y + 8, { lineBreak: false });
            y += 24;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const textY = y + 5;
                const netProfit = (v as any).netProfit ?? 0;
                const plColor = netProfit > 0 ? C.green : netProfit < 0 ? C.red : C.muted;
                const isSold = !!(v as any).dateSold;
                const saleTypeColor = v.saleType === "park_sale" ? C.violet : C.blue;

                let rx = MG;
                const cell = (text: string, colIdx: number, color?: string) => {
                    const [, w, align] = cols[colIdx];
                    doc.fontSize(6.5).font("Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 3, textY, { width: w - 6, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                                                          0);
                cell(v.consignmentId ?? "—",                                               1);
                // Sale type with color
                const [, stW2] = cols[2];
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(saleTypeColor)
                    .text(v.saleType === "park_sale" ? "Park Sale" : "Finance Sale", rx + 3, textY, { width: stW2 - 6, lineBreak: false });
                rx += stW2;

                cell(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`,                 3);
                cell(v.registrationNo,                                                      4);
                cell(dFmt(v.dateReceived),                                                  5, C.slate);
                cell(dINR(v.totalInvestment),                                               6);

                // Status with colour
                const [, stW] = cols[7];
                doc.fontSize(6.5).font("Helvetica-Bold").fillColor(statusColorMap[v.status] ?? C.slate)
                    .text(dSl(v.status), rx + 3, textY, { width: stW - 6, lineBreak: false });
                rx += stW;

                // Owner (truncated)
                const [, ownerW] = cols[8];
                doc.fontSize(6.5).font("Helvetica").fillColor(C.text)
                    .text(v.previousOwner ?? "—", rx + 3, textY, { width: ownerW - 6, lineBreak: false });
                rx += ownerW;

                // Sold Price
                const [, soldW] = cols[9];
                doc.fontSize(6.5).font("Helvetica").fillColor(isSold ? C.text : C.muted)
                    .text(isSold ? dINR((v as any).soldPrice) : "—", rx + 3, textY, { width: soldW - 6, align: "right", lineBreak: false });
                rx += soldW;

                // Net P/L
                const [, plW] = cols[10];
                doc.fontSize(6.5).font("Helvetica").fillColor(isSold ? plColor : C.muted)
                    .text(isSold ? (netProfit >= 0 ? "+" : "") + dINR(netProfit) : "—", rx + 3, textY, { width: plW - 6, align: "right", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS ROW ───────────────────────────────────────────────────
        need(20);
        doc.rect(MG, y, CW, 20).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${vehicles.length} consignments  ·  Total Invested: ${dINR(totalInvested)}  ·  Total Revenue: ${dINR(totalRevenue)}  ·  Net P/L (sold): ${dINR(totalProfit)}`,
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
