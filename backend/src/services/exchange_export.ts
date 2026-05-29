// ── Exchange Deals PDF Export ─────────────────────────────────────────────────
// Unicode-safe: only ASCII chars (no ₹, —, ·)

import { ExchangeDeal } from "./exchange.service";

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

const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

interface ExportFilters {
    collection?: string;
    dateFrom?: string;
    dateTo?: string;
}

// ── CSV Export ────────────────────────────────────────────────────────────────
export const exportExchangesCSV = (deals: ExchangeDeal[], _filters: ExportFilters = {}): string => {
    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "Source Type", "Source ID", "Source Vehicle", "Reg No",
        "Sold To", "Sold Date", "Sold Price",
        "Exchange Vehicle", "Exch Reg No", "Exchange Value", "Exchange Date",
        "Added to Inventory As", "Inventory Ref",
        "Cash Received", "Total Received", "Balance", "Settlement",
    ];

    const rows = deals.map(d => [
        d.sourceCollection === "vehicles" ? "Vehicle" : "Consignment",
        d.sourceRefId,
        `${d.sourceMake} ${d.sourceModel}`,
        d.sourceRegNo,
        d.sourceSoldTo,
        d.sourceSoldDate ? dFmt(d.sourceSoldDate) : "-",
        d.sourceSoldPrice,
        d.exchangeMake,
        d.exchangeRegNo,
        d.exchangeAmount,
        dFmt(d.exchangeDate),
        d.exchangeCreatedIn ? (d.exchangeCreatedIn === "vehicles" ? "Vehicle" : "Consignment") : "Not Added",
        d.exchangeCreatedRefId ?? "-",
        d.sourceTotalCashReceived,
        d.sourceTotalReceived,
        d.sourceRemainingBalance,
        d.isFullySettled ? "Settled" : "Pending",
    ].map(esc).join(","));

    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ────────────────────────────────────────────────────────────────
export const exportExchangesPDF = async (deals: ExchangeDeal[], filters: ExportFilters = {}): Promise<Buffer> => {
    // ── Aggregates ─────────────────────────────────────────────────────────
    const totalExchValue  = deals.reduce((s, d) => s + d.exchangeAmount, 0);
    const totalSoldPrice  = deals.reduce((s, d) => s + d.sourceSoldPrice, 0);
    const totalCash       = deals.reduce((s, d) => s + d.sourceTotalCashReceived, 0);
    const totalBalance    = deals.reduce((s, d) => s + d.sourceRemainingBalance, 0);
    const settledCount    = deals.filter(d => d.isFullySettled).length;
    const pendingCount    = deals.length - settledCount;
    const fromVehicles    = deals.filter(d => d.sourceCollection === "vehicles").length;
    const fromConsign     = deals.length - fromVehicles;
    const addedToInv      = deals.filter(d => !!d.exchangeCreatedRef).length;

    const PDFDocument = (await import("pdfkit")).default;

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end",  () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const PW = doc.page.width;
        const PH = doc.page.height;
        const MG = 28;
        const CW = PW - MG * 2;

        const C = {
            navy:   "#0f172a", orange: "#ea580c", rose:   "#e11d48",
            green:  "#16a34a", amber:  "#d97706", slate:  "#64748b",
            cyan:   "#0891b2", violet: "#7c3aed", indigo: "#6366f1",
            white:  "#ffffff", border: "#e2e8f0", light:  "#f8fafc",
            text:   "#1e293b", muted:  "#94a3b8",
        };

        // ── Footer ─────────────────────────────────────────────────────────
        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18)
                .strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER ─────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.orange);

        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white)
            .text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Exchange Deals Report"];
        if (filters.collection === "vehicles")            titleParts.push("| Vehicles Only");
        if (filters.collection === "consignmentVehicles") titleParts.push("| Consignments Only");
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
            .text(`${genStr}  |  ${deals.length} deals`, MG, 31, { width: CW, align: "right", lineBreak: false });

        // ── SUMMARY BAND (6 cards) ──────────────────────────────────────────
        const SY = 58;
        const SH = 42;
        const settlePct = deals.length > 0 ? ((settledCount / deals.length) * 100).toFixed(0) : "0";
        const metrics = [
            { label: "TOTAL EXCHANGES",    value: String(deals.length),      sub: `${fromVehicles} from vehicles / ${fromConsign} from consignments`, accent: C.orange },
            { label: "EXCHANGE VALUE",     value: dINR(totalExchValue),      sub: "Combined trade-in value",                                          accent: C.violet },
            { label: "TOTAL SOLD PRICE",   value: dINR(totalSoldPrice),      sub: "Source vehicle sale prices",                                       accent: C.slate  },
            { label: "CASH RECEIVED",      value: dINR(totalCash),           sub: "Cash collected above exchange",                                     accent: C.cyan   },
            { label: "PENDING BALANCE",    value: dINR(totalBalance),        sub: `${pendingCount} deals pending`,                                     accent: totalBalance > 0 ? C.amber : C.green },
            { label: "SETTLEMENT RATE",    value: `${settledCount}/${deals.length}`, sub: `${settlePct}% fully settled | ${addedToInv} added to inv`, accent: C.green  },
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
                doc.fontSize(4.8).font("Helvetica").fillColor(C.muted)
                    .text(m.sub, mx + 7, SY + 29, { width: mW - 16, lineBreak: false });
            }
        });

        // ── TABLE ──────────────────────────────────────────────────────────
        const tableY = SY + SH + 6;

        // Total = 16+48+36+76+56+50+48+68+62+56+56+52+42+56 = 726 — well within CW ~786
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",            16, "center"],
            ["Source ID",    48, "left"  ],
            ["Type",         36, "left"  ],
            ["Sold Vehicle", 76, "left"  ],
            ["Sold To",      56, "left"  ],
            ["Sold Date",    50, "left"  ],
            ["Exch Date",    48, "left"  ],
            ["Exchange Veh", 68, "left"  ],
            ["Exch Value",   62, "right" ],
            ["Sold Price",   56, "right" ],
            ["Cash Rcvd",    56, "right" ],
            ["Balance",      52, "right" ],
            ["Added As",     42, "center"],
            ["Settlement",   56, "center"],
        ];

        const ROW_H = 15;
        const HDR_H = 16;

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

        if (deals.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No exchange deals match the selected filters.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            deals.forEach((d, idx) => {
                need(ROW_H);

                const rowBg = idx % 2 === 0 ? C.light : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                const isConsign  = d.sourceCollection === "consignmentVehicles";
                const typeColor  = isConsign ? C.violet : C.indigo;
                const balColor   = d.sourceRemainingBalance > 0 ? C.amber : C.green;
                const settleColor = d.isFullySettled ? C.green : C.amber;

                let rx = MG;
                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = cols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica")
                        .fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                                                        0, C.muted);
                cell(d.sourceRefId,                                                        1, typeColor);
                cell(isConsign ? "CS" : "VH",                                             2, typeColor, true);
                cell(trunc(`${d.sourceMake} ${d.sourceModel}`, 17),                       3);
                cell(trunc(d.sourceSoldTo, 12),                                           4, C.slate);
                cell(dFmt(d.sourceSoldDate),                                              5, C.muted);
                cell(dFmt(d.exchangeDate),                                                6, C.muted);
                cell(trunc(`${d.exchangeMake} ${d.exchangeRegNo}`, 16),                  7, C.orange);
                cell(dINR(d.exchangeAmount),                                              8, C.orange, true);
                cell(dINR(d.sourceSoldPrice),                                             9);
                cell(dINR(d.sourceTotalCashReceived),                                    10);
                cell(dINR(d.sourceRemainingBalance),                                     11, balColor, true);

                // Added As
                const [, addW] = cols[12];
                const addLabel = d.exchangeCreatedRef
                    ? (d.exchangeCreatedIn === "vehicles" ? "VH" : "CS")
                    : "-";
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(d.exchangeCreatedRef ? C.cyan : C.muted)
                    .text(addLabel, rx + 2, textY, { width: addW - 4, align: "center", lineBreak: false });
                rx += addW;

                // Settlement
                const [, stW] = cols[13];
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(settleColor)
                    .text(d.isFullySettled ? "Settled" : "Pending", rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS ─────────────────────────────────────────────────────────
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(
                `${deals.length} deals  |  Exchange Value: ${dINR(totalExchValue)}  |  Sold Price: ${dINR(totalSoldPrice)}  |  Cash Rcvd: ${dINR(totalCash)}  |  Pending: ${dINR(totalBalance)}  |  Settled: ${settledCount}/${deals.length} (${settlePct}%)  |  Added to Inv: ${addedToInv}`,
                MG + 8, y + 8, { lineBreak: false },
            );
        y += 24;

        addFooter();

        // ── PAGE NUMBERS ────────────────────────────────────────────────────
        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
