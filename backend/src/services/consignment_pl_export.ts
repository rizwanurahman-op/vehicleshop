// ── Consignment P&L Report PDF Export ────────────────────────────────────────
// Unicode-safe: only ASCII chars used (no Rs. ₹, —, ·)

/** ASCII-safe INR amount */
const dINR = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const num = Math.abs(Math.round(n));
    let s = num.toString();
    if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest = s.slice(0, -3);
        s = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
    }
    return `Rs. ${s}`;
};

/** ASCII-safe date: "21 May 2026" */
const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

/** Slug to Title Case */
const dSl = (s: string | null | undefined): string =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "-";

/** Truncate string */
const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

interface PLFilters {
    saleType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const exportConsignmentPLReportPDF = async (
    vehicles: any[],
    filters: PLFilters = {},
): Promise<Buffer> => {
    // ── Aggregates ─────────────────────────────────────────────────────────
    const totalInvested  = vehicles.reduce((s, v) => s + (v.totalInvestment ?? 0), 0);
    const totalRevenue   = vehicles.reduce((s, v) => s + (v.soldPrice       ?? 0), 0);
    const totalReceived  = vehicles.reduce((s, v) => s + (v.receivedAmount  ?? v.soldPrice ?? 0), 0);
    const totalBalance   = vehicles.reduce((s, v) => s + (v.buyerBalance    ?? 0), 0);
    const totalPaidOut   = vehicles.reduce((s, v) => s + (v.paidToPayee     ?? 0), 0);
    const totalProfit    = vehicles.reduce((s, v) => s + (v.netProfit       ?? 0), 0);
    const profitCount    = vehicles.filter(v => (v.netProfit ?? 0) >= 0).length;
    const lossCount      = vehicles.length - profitCount;
    const avgDays        = vehicles.filter(v => v.daysInShop != null)
        .reduce((s, v, _, a) => s + v.daysInShop / a.length, 0);
    const parkSaleCount  = vehicles.filter(v => v.saleType === "park_sale").length;
    const financeSaleCount = vehicles.length - parkSaleCount;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end",  () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;   // ~841.89
        const PH = doc.page.height;  // ~595.28
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy:   "#0f172a", indigo: "#6366f1", green:  "#16a34a", red:    "#dc2626",
            amber:  "#d97706", orange: "#ea580c", cyan:   "#0891b2", violet: "#7c3aed",
            blue:   "#2563eb", slate:  "#64748b", white:  "#ffffff",
            border: "#e2e8f0", light:  "#f8fafc", text:   "#1e293b", muted:  "#94a3b8",
        };

        // ── Footer ────────────────────────────────────────────────────────────
        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER ────────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.indigo);

        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white)
            .text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Consignment P&L Report -- Sold Vehicles"];
        if (filters.saleType === "park_sale")    titleParts.push("| Park Sale Only");
        if (filters.saleType === "finance_sale") titleParts.push("| Finance Sale Only");
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });

        const now = new Date();
        const months2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months2[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${vehicles.length} records`, MG, 31, { width: CW, align: "right", lineBreak: false });

        // ── SUMMARY BAND (6 cards) ────────────────────────────────────────────
        const SY = 58;
        const SH = 42;
        const margin = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) + "%" : "0%";
        const metrics = [
            { label: "TOTAL SOLD",       value: String(vehicles.length), sub: `${profitCount} profit / ${lossCount} loss`,  accent: C.indigo },
            { label: "SALE TYPE SPLIT",  value: `PS: ${parkSaleCount}`,  sub: `FS: ${financeSaleCount}`,                    accent: C.violet },
            { label: "RECON COST",       value: dINR(vehicles.reduce((s,v) => s + (v.totalReconCost ?? 0), 0)), sub: "Workshop, parts & misc",                        accent: C.amber  },
            { label: "TOTAL REVENUE",    value: dINR(totalRevenue),      sub: "Total sold price",                           accent: C.cyan },
            { label: "BUYER BALANCE",    value: totalBalance > 0 ? dINR(totalBalance) : "Fully Collected", sub: totalBalance > 0 ? "Pending from buyers" : "All payments received", accent: totalBalance > 0 ? C.orange : C.green },
            { label: "PAID TO PAYEE",    value: dINR(totalPaidOut),      sub: "Owner / Finance payout",                     accent: C.blue   },
            { label: "NET PROFIT / LOSS",value: (totalProfit >= 0 ? "+" : "") + dINR(totalProfit), sub: `${margin} margin`, accent: totalProfit >= 0 ? C.green : C.red },
        ];

        const mW = CW / metrics.length;
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, SY, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, SY, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 7, SY + 5, { width: mW - 16, lineBreak: false });
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 7, SY + 16, { width: mW - 16, lineBreak: false });
            if (m.sub) {
                doc.fontSize(5).font("Helvetica").fillColor(C.muted)
                    .text(m.sub, mx + 7, SY + 29, { width: mW - 16, lineBreak: false });
            }
        });

        // ── TABLE ─────────────────────────────────────────────────────────────
        const tableY = SY + SH + 6;

        // Columns: total widths fit within CW ~786
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",            14, "center"],
            ["CS ID",        40, "left"  ],
            ["Type",         36, "left"  ],
            ["Sale Type",    52, "left"  ],
            ["Make / Model", 80, "left"  ],
            ["Reg No",       58, "left"  ],
            ["Owner",        56, "left"  ],
            ["Received",     46, "left"  ],
            ["Sold",         46, "left"  ],
            ["Invested",     54, "right" ],
            ["Sold Price",   58, "right" ],
            ["Rcvd",         50, "right" ],
            ["Buyer Bal",    50, "right" ],
            ["Paid Out",     50, "right" ],
            ["Net P/L",      52, "right" ],
            ["Days",         24, "center"],
            ["Settlement",   52, "center"],
        ];

        const ROW_H = 15;
        const HDR_H = 16;

        const settlementColor = (s: string | null | undefined): string => {
            if (!s) return C.muted;
            if (s === "fully_closed")  return C.green;
            if (s === "buyer_settled") return C.blue;
            if (s === "payee_settled") return C.amber;
            if (s === "open")          return C.orange;
            return C.muted;
        };

        const settlementLabel = (s: string | null | undefined): string => {
            if (!s) return "-";
            if (s === "fully_closed")  return "Closed";
            if (s === "buyer_settled") return "Buyer Done";
            if (s === "payee_settled") return "Payee Done";
            if (s === "open")          return "Open";
            return dSl(s);
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

        // ── ROWS ──────────────────────────────────────────────────────────────
        if (vehicles.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No sold consignments match the selected filters.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const textY   = y + 4;
                const np      = v.netProfit ?? 0;
                const npColor = np >= 0 ? C.green : C.red;
                const isParkSale = v.saleType === "park_sale";
                const sTypeColor = isParkSale ? C.violet : C.blue;

                let rx = MG;
                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = cols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica")
                        .fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                const bbal  = v.buyerBalance ?? 0;
                const rcvd  = v.receivedAmount ?? v.soldPrice ?? 0;

                cell(`${idx + 1}`,                                                          0, C.muted);
                cell(v.consignmentId ?? "-",                                                1);
                cell(v.vehicleType === "two_wheeler" ? "2W" : "4W",                        2, C.slate);
                cell(isParkSale ? "Park Sale" : "Finance Sale",                             3, sTypeColor, true);
                cell(trunc(`${v.make} ${v.model}${v.year ? " " + v.year : ""}`, 20),       4);
                cell(trunc(v.registrationNo, 12),                                           5);
                cell(trunc(v.previousOwner ?? "-", 12),                                     6, C.slate);
                cell(dFmt(v.dateReceived),                                                  7, C.muted);
                cell(dFmt(v.dateSold),                                                      8, C.muted);
                cell(dINR(v.totalInvestment),                                               9);
                cell(dINR(v.soldPrice),                                                    10);
                cell(dINR(rcvd),                                                           11, C.muted);
                cell(bbal > 0 ? dINR(bbal) : "Nil",                                       12, bbal > 0 ? C.orange : C.muted);
                cell(dINR(v.paidToPayee),                                                  13, C.muted);
                cell((np >= 0 ? "+" : "") + dINR(np),                                     14, npColor, true);
                cell(v.daysInShop != null ? `${v.daysInShop}d` : "-",                     15, C.muted);

                // Settlement status (last column)
                const [, stW] = cols[16];
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(settlementColor(v.settlementStatus))
                    .text(settlementLabel(v.settlementStatus), rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS BAND ───────────────────────────────────────────────────────
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${vehicles.length} sold  |  Invested: ${dINR(totalInvested)}  |  Revenue: ${dINR(totalRevenue)}  |  Buyer Bal: ${totalBalance > 0 ? dINR(totalBalance) : "Nil"}  |  Paid Out: ${dINR(totalPaidOut)}  |  Net P/L: ${totalProfit >= 0 ? "+" : ""}${dINR(totalProfit)} (${margin})  |  ${profitCount} profit / ${lossCount} loss  |  Avg ${Math.round(avgDays || 0)}d`,
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
