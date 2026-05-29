// ── P&L Report PDF Export ─────────────────────────────────────────────────────
// Unicode-safe: only ASCII chars used in text rendering (no Rs. ₹ · — etc.)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** ASCII-safe currency: "Rs. 1,23,456" (no rupee sign) */
const dINR = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const abs = Math.abs(n).toLocaleString("en-US"); // en-US avoids ₹/locale symbols
    // Convert en-US grouping (1,234,567) → en-IN style (12,34,567)
    const num = Math.abs(Math.round(n));
    let s = num.toString();
    if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest = s.slice(0, -3);
        const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
        s = grouped + "," + last3;
    }
    return `Rs. ${s}`;
};

/** Safe date: "21 May 2026" – ASCII only, no locale Unicode chars */
const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

/** Slug → Title Case */
const dSl = (s: string | null | undefined): string =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

/** Truncate long strings to prevent overflow */
const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

interface PLReportFilters {
    vehicleType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const exportPLReportPDF = async (
    vehicles: any[],
    filters: PLReportFilters = {},
): Promise<Buffer> => {
    // ── Aggregate stats ──────────────────────────────────────────────────────
    const totalInvested  = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
    const totalRevenue   = vehicles.reduce((s, v) => s + (v.soldPrice       ?? 0), 0);
    const totalReceived  = vehicles.reduce((s, v) => s + (v.receivedAmount  ?? v.soldPrice ?? 0), 0);
    const totalBalance   = vehicles.reduce((s, v) => s + (v.balanceAmount   ?? 0), 0);
    const totalProfit    = vehicles.reduce((s, v) => s + (v.profitLoss      ?? 0), 0);
    const profitCount    = vehicles.filter(v => (v.profitLoss ?? 0) >= 0).length;
    const lossCount      = vehicles.length - profitCount;
    const avgDays        = vehicles.filter(v => v.daysToSell != null)
        .reduce((s, v, _, a) => s + v.daysToSell / a.length, 0);
    const twoWCount      = vehicles.filter(v => v.vehicleType === "two_wheeler").length;
    const fourWCount     = vehicles.length - twoWCount;
    const exchangeCount  = vehicles.filter(v => v.isFromExchange || v.isExchange).length;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end",  () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;   // landscape A4: ~841.89
        const PH = doc.page.height;  // landscape A4: ~595.28
        const MG = 28;
        const CW = PW - MG * 2;

        // Colour palette (all hex, no special chars)
        const C = {
            navy:   "#0f172a",
            indigo: "#6366f1",
            green:  "#16a34a",
            red:    "#dc2626",
            amber:  "#d97706",
            orange: "#ea580c",
            cyan:   "#0891b2",
            purple: "#7c3aed",
            slate:  "#64748b",
            white:  "#ffffff",
            border: "#e2e8f0",
            light:  "#f8fafc",
            text:   "#1e293b",
            muted:  "#94a3b8",
        };

        // ── Footer ────────────────────────────────────────────────────────────
        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER BAND ───────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.indigo);

        // Logo + subtitle
        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white)
            .text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text("Inventory Management System", MG, 33, { lineBreak: false });

        // Report title
        const titleParts = ["Vehicle P&L Report -- Sold Vehicles"];
        if (filters.vehicleType)
            titleParts.push(filters.vehicleType === "two_wheeler" ? "| Two Wheelers Only" : "| Four Wheelers Only");
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });

        // Generated timestamp + record count
        const now = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${vehicles.length} records`, MG, 31, { width: CW, align: "right", lineBreak: false });

        // ── SUMMARY BAND (6 metrics) ──────────────────────────────────────────
        const SY = 58;
        const SH = 42;
        const metrics = [
            { label: "TOTAL SOLD",       value: String(vehicles.length), sub: `${profitCount} profit / ${lossCount} loss`, accent: C.indigo },
            { label: "TOTAL INVESTED",   value: dINR(totalInvested),     sub: `2W:${twoWCount} 4W:${fourWCount}`,          accent: C.amber  },
            { label: "TOTAL REVENUE",    value: dINR(totalRevenue),       sub: "Agreed sold price",                         accent: C.slate  },
            { label: "RECEIVED",         value: dINR(totalReceived),      sub: totalBalance > 0 ? `Bal: ${dINR(totalBalance)}` : "Fully collected", accent: C.cyan },
            { label: "NET PROFIT / LOSS",value: (totalProfit >= 0 ? "+" : "") + dINR(totalProfit), sub: `${((totalProfit / (totalInvested || 1)) * 100).toFixed(1)}% margin`, accent: totalProfit >= 0 ? C.green : C.red },
            { label: "AVG DAYS TO SELL", value: `${Math.round(avgDays || 0)}d`,  sub: `${exchangeCount} exchange deals`,  accent: C.orange },
        ];

        const mW = CW / metrics.length;
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, SY, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, SY, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 7, SY + 5, { width: mW - 16, lineBreak: false });
            doc.fontSize(9).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 7, SY + 15, { width: mW - 16, lineBreak: false });
            if (m.sub) {
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(m.sub, mx + 7, SY + 28, { width: mW - 16, lineBreak: false });
            }
        });

        // ── TABLE SETUP ───────────────────────────────────────────────────────
        const tableY = SY + SH + 6;

        // Columns: [header, width, align]
        // Total = 16+44+36+88+64+66+48+48+62+62+58+62+36+24+60 = 774px (CW ~786 — 12px slack)
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",            16, "center"],
            ["Vehicle ID",   44, "left"  ],
            ["Type",         36, "left"  ],
            ["Make / Model", 88, "left"  ],
            ["Reg No",       64, "left"  ],
            ["Sold To",      66, "left"  ],
            ["Purchased",    48, "left"  ],
            ["Sold",         48, "left"  ],
            ["Invested",     62, "right" ],
            ["Sold Price",   62, "right" ],
            ["Received",     58, "right" ],
            ["P/L",          62, "right" ],
            ["P/L %",        36, "right" ],
            ["Days",         24, "center"],
            ["Status",       60, "center"],
        ];

        const ROW_H = 15;
        const HDR_H = 16;

        const saleStatusColor = (ss: string | null | undefined) => {
            if (!ss) return C.muted;
            if (ss === "fully_received") return C.green;
            if (ss === "balance_pending" || ss === "noc_cash_pending") return C.amber;
            if (ss === "noc_pending") return C.orange;
            return C.muted;
        };

        const saleStatusLabel = (ss: string | null | undefined): string => {
            if (!ss) return "-";
            if (ss === "fully_received")    return "Fully Paid";
            if (ss === "balance_pending")   return "Bal. Pending";
            if (ss === "noc_pending")       return "NOC Pending";
            if (ss === "noc_cash_pending")  return "NOC+Cash";
            return dSl(ss);
        };

        let y = tableY;

        const drawHeader = () => {
            doc.rect(MG, y, CW, HDR_H).fill(C.navy);
            let hx = MG;
            cols.forEach(([label, w, align]) => {
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(C.white)
                    .text(label, hx + 2, y + 5, { width: w - 4, align, lineBreak: false });
                hx += w;
            });
            y += HDR_H;
        };

        const need = (h: number) => {
            if (y + h > PH - 30) {
                addFooter();
                doc.addPage({ margin: 0, size: "A4", layout: "landscape" });
                y = MG;
                drawHeader();
            }
        };

        drawHeader();

        // ── ROWS ─────────────────────────────────────────────────────────────
        if (vehicles.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No sold vehicles match the selected filters.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                const pl    = v.profitLoss      ?? 0;
                const plPct = v.profitLossPercentage ?? 0;
                const plCol = pl >= 0 ? C.green : C.red;
                const isBal = (v.balanceAmount ?? 0) > 0;

                // Exchange flag: accent colour for row vehicle ID
                const isExch = v.isFromExchange || v.isExchange;
                const idColor = isExch ? C.cyan : C.text;

                let rx = MG;
                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = cols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica")
                        .fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                                                       0, C.muted);
                cell(v.vehicleId ?? "-",                                                 1, idColor);
                cell(v.vehicleType === "two_wheeler" ? "2W" : "4W",                     2, C.slate);
                cell(trunc(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, 22),    3);
                cell(trunc(v.registrationNo, 14),                                        4);
                cell(trunc(v.soldTo ?? "-", 14),                                         5, C.slate);
                cell(dFmt(v.datePurchased),                                              6, C.muted);
                cell(dFmt(v.dateSold),                                                   7, C.muted);
                cell(dINR(v.totalInvestment),                                            8);
                cell(dINR(v.soldPrice),                                                  9);
                cell(dINR(v.receivedAmount ?? v.soldPrice),                             10, isBal ? C.amber : C.text);
                cell((pl >= 0 ? "+" : "") + dINR(pl),                                  11, plCol, true);
                cell((plPct >= 0 ? "+" : "") + plPct.toFixed(1) + "%",                 12, plCol);
                cell(v.daysToSell != null ? `${v.daysToSell}d` : "-",                  13, C.muted);

                // Status cell – rendered last with colour
                const [, stW] = cols[14];
                const ssLabel = saleStatusLabel(v.saleStatus);
                const ssColor = saleStatusColor(v.saleStatus);
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(ssColor)
                    .text(ssLabel, rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS BAND ───────────────────────────────────────────────────────
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);

        const margin = totalProfit >= 0
            ? `+${((totalProfit / (totalInvested || 1)) * 100).toFixed(1)}%`
            : `${((totalProfit / (totalInvested || 1)) * 100).toFixed(1)}%`;

        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${vehicles.length} vehicles  |  Invested: ${dINR(totalInvested)}  |  Revenue: ${dINR(totalRevenue)}  |  Received: ${dINR(totalReceived)}  |  Balance: ${dINR(totalBalance)}  |  Net P/L: ${totalProfit >= 0 ? "+" : ""}${dINR(totalProfit)} (${margin})  |  ${profitCount} profit / ${lossCount} loss  |  Avg ${Math.round(avgDays || 0)}d`,
                MG + 8, y + 8, { lineBreak: false },
            );
        y += 24;

        addFooter();

        // ── PAGE NUMBERS ──────────────────────────────────────────────────────
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
