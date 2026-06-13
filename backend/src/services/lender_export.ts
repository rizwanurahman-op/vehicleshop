// ── Lender PDF Export ─────────────────────────────────────────────────────────
// Unicode-safe: only ASCII chars

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

const trunc = (s: string | null | undefined, max: number): string => {
    if (!s) return "-";
    return s.length > max ? s.slice(0, max - 1) + "." : s;
};

const dFmt = (d: Date | string | null | undefined): string => {
    if (!d) return "-";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(dt.getDate()).padStart(2,"0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

interface LenderRow {
    lenderId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive?: boolean;
    totalBorrowed: number;
    totalRepaid: number;    // Principal only
    totalProfit: number;    // Profit/interest paid
    balancePayable: number;
}

interface LenderExportFilters {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const exportLendersPDF = async (lenders: LenderRow[], filters: LenderExportFilters = {}): Promise<Buffer> => {
    const totalBorrowed = lenders.reduce((s, l) => s + (l.totalBorrowed ?? 0), 0);
    const totalRepaid   = lenders.reduce((s, l) => s + (l.totalRepaid   ?? 0), 0);  // Principal
    const totalProfit   = lenders.reduce((s, l) => s + (l.totalProfit   ?? 0), 0);  // Profit
    const totalBalance  = lenders.reduce((s, l) => s + (l.balancePayable ?? 0), 0);
    const activeCount   = lenders.filter(l => l.isActive !== false).length;
    const inactiveCount = lenders.length - activeCount;
    const paidOffCount  = lenders.filter(l => (l.balancePayable ?? 0) <= 0).length;

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
            navy:   "#0f172a", indigo: "#6366f1", green:  "#16a34a", red:    "#dc2626",
            amber:  "#d97706", cyan:   "#0891b2", violet: "#7c3aed", slate:  "#64748b",
            white:  "#ffffff", border: "#e2e8f0", light:  "#f8fafc", text:   "#1e293b", muted: "#94a3b8",
        };

        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18).strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── HEADER ─────────────────────────────────────────────────────────
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.indigo);
        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Lenders Report"];
        if (filters.status && filters.status !== "all") titleParts.push(`| ${filters.status.charAt(0).toUpperCase() + filters.status.slice(1)}`);
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        if (filters.search) titleParts.push(`| Search: ${filters.search}`);
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });

        const now = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${lenders.length} lenders`, MG, 31, { width: CW, align: "right", lineBreak: false });

        // ── SUMMARY CARDS ──────────────────────────────────────────────────
        const SY = 58; const SH = 42;
        const metrics = [
            { label: "TOTAL LENDERS",    value: String(lenders.length),  sub: `${activeCount} active / ${inactiveCount} inactive`, accent: C.indigo },
            { label: "TOTAL BORROWED",   value: dINR(totalBorrowed),      sub: "Cumulative capital received",                        accent: C.violet },
            { label: "PRINCIPAL REPAID", value: dINR(totalRepaid),        sub: "Reduces outstanding balance",                        accent: C.green  },
            { label: "PROFIT PAID",      value: dINR(totalProfit),        sub: "Interest paid / balance unchanged",                  accent: C.amber  },
            { label: "BALANCE PAYABLE",  value: dINR(totalBalance),       sub: `${paidOffCount} fully paid off`,                     accent: totalBalance > 0 ? C.red : C.green },
        ];
        const mW = CW / metrics.length;
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, SY, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, SY, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent).text(m.label, mx + 7, SY + 5, { width: mW - 16, lineBreak: false });
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent).text(m.value, mx + 7, SY + 16, { width: mW - 16, lineBreak: false });
            if (m.sub) doc.fontSize(5).font("Helvetica").fillColor(C.muted).text(m.sub, mx + 7, SY + 29, { width: mW - 16, lineBreak: false });
        });

        // ── TABLE ──────────────────────────────────────────────────────────
        // Cols: 16+54+86+70+80+80+72+72+60+80 = 670 (CW ~786)
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",           16, "center"],
            ["Lender ID",   54, "left"  ],
            ["Name",        86, "left"  ],
            ["Phone",       70, "left"  ],
            ["Address",     80, "left"  ],
            ["Borrowed",    80, "right" ],
            ["Principal",   72, "right" ],
            ["Profit Paid", 72, "right" ],
            ["Balance",     60, "right" ],
            ["Status",      80, "center"],
        ];

        const HDR_H = 16; const ROW_H = 15;
        let y = SY + SH + 6;

        const drawHeader = () => {
            doc.rect(MG, y, CW, HDR_H).fill(C.navy);
            let hx = MG;
            cols.forEach(([label, w, align]) => {
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(C.white).text(label, hx + 2, y + 5, { width: w - 4, align, lineBreak: false });
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

        if (lenders.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted).text("No lenders match the selected filters.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            lenders.forEach((l, idx) => {
                need(ROW_H);
                doc.rect(MG, y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H).strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                const isActive = l.isActive !== false;
                const balColor = (l.balancePayable ?? 0) > 0 ? C.amber : C.green;
                let rx = MG;

                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = cols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                          0, C.muted);
                cell(l.lenderId ?? "-",                     1, C.indigo);
                cell(trunc(l.name, 18),                     2, C.text, true);
                cell(l.phone || "-",                        3, C.slate);
                cell(trunc(l.address, 16),                  4, C.slate);
                cell(dINR(l.totalBorrowed),                 5, C.violet, true);
                cell(dINR(l.totalRepaid),                   6, C.green);
                cell(dINR(l.totalProfit ?? 0),              7, C.amber);
                cell(dINR(l.balancePayable),                8, balColor, true);

                // Status badge
                const [, stW] = cols[9];
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(isActive ? C.green : C.red)
                    .text(isActive ? "Active" : "Inactive", rx + 2, textY, { width: stW - 4, align: "center", lineBreak: false });

                y += ROW_H;
            });
        }

        // ── TOTALS ─────────────────────────────────────────────────────────
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(`${lenders.length} lenders  |  Borrowed: ${dINR(totalBorrowed)}  |  Principal Repaid: ${dINR(totalRepaid)}  |  Profit Paid: ${dINR(totalProfit)}  |  Balance: ${dINR(totalBalance)}  |  ${activeCount} active  |  ${paidOffCount} fully paid off`,
                MG + 8, y + 8, { lineBreak: false });
        y += 24;

        addFooter();

        const range = doc.bufferedPageRange();
        for (let pg = 0; pg < range.count; pg++) {
            doc.switchToPage(range.start + pg);
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text(`Page ${pg + 1} of ${range.count}`, MG, PH - 12, { width: CW, align: "right", lineBreak: false });
        }

        doc.end();
    });
};
