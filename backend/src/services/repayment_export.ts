// ── Repayment PDF Export ──────────────────────────────────────────────────────
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

interface RepaymentRow {
    repaymentId: string;
    date: Date | string;
    lender?: { lenderId?: string; name?: string } | string;
    amountPaid: number;
    mode: string;
    referenceNo?: string;
    remarks?: string;
}

interface RepaymentExportFilters {
    mode?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export const exportRepaymentsPDF = async (repayments: RepaymentRow[], filters: RepaymentExportFilters = {}): Promise<Buffer> => {
    const total = repayments.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
    const modeMap = new Map<string, number>();
    repayments.forEach(r => modeMap.set(r.mode, (modeMap.get(r.mode) ?? 0) + r.amountPaid));
    const uniqueLenders = new Set(repayments.map(r => typeof r.lender === "object" ? (r.lender as {name?:string})?.name : r.lender)).size;
    const avgAmt = repayments.length > 0 ? Math.round(total / repayments.length) : 0;

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
            navy:   "#0f172a", green:  "#16a34a", emerald: "#059669",
            amber:  "#d97706", cyan:   "#0891b2", violet:  "#7c3aed", slate: "#64748b",
            white:  "#ffffff", border: "#e2e8f0", light:   "#f8fafc", text:  "#1e293b", muted: "#94a3b8",
        };

        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18).strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // HEADER
        doc.rect(0, 0, PW, 54).fill(C.navy);
        doc.rect(0, 50, PW, 4).fill(C.emerald);
        doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 33, { lineBreak: false });

        const titleParts = ["Repayments Report"];
        if (filters.mode && filters.mode !== "all") titleParts.push(`| ${filters.mode}`);
        if (filters.dateFrom || filters.dateTo) {
            const r = [filters.dateFrom && dFmt(filters.dateFrom), filters.dateTo && dFmt(filters.dateTo)].filter(Boolean).join(" to ");
            titleParts.push(`| ${r}`);
        }
        if (filters.search) titleParts.push(`| Search: ${filters.search}`);
        doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
            .text(titleParts.join(" "), MG, 11, { width: CW, align: "right", lineBreak: false });

        const now = new Date();
        const months2 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months2[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
        doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
            .text(`${genStr}  |  ${repayments.length} records`, MG, 31, { width: CW, align: "right", lineBreak: false });

        // SUMMARY CARDS
        const SY = 58; const SH = 42;
        const topModes = [...modeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
        const modeSub = topModes.map(([m, v]) => `${m}: ${dINR(v)}`).join(" / ") || "No data";
        const metrics = [
            { label: "TOTAL REPAYMENTS",  value: String(repayments.length), sub: `To ${uniqueLenders} lenders`,      accent: C.emerald },
            { label: "TOTAL PAID",        value: dINR(total),               sub: "Cumulative repaid amount",          accent: C.green   },
            { label: "AVERAGE AMOUNT",    value: dINR(avgAmt),              sub: "Per repayment",                     accent: C.cyan    },
            { label: "TOP PAYMENT MODES", value: topModes[0]?.[0] || "-",  sub: modeSub,                             accent: C.violet  },
        ];
        const mW = CW / metrics.length;
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, SY, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, SY, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent).text(m.label, mx + 7, SY + 5, { width: mW - 16, lineBreak: false });
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent).text(m.value, mx + 7, SY + 16, { width: mW - 16, lineBreak: false });
            if (m.sub) doc.fontSize(4.8).font("Helvetica").fillColor(C.muted).text(m.sub, mx + 7, SY + 29, { width: mW - 16, lineBreak: false });
        });

        // TABLE
        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",           16, "center"],
            ["Rep ID",      64, "left"  ],
            ["Date",        52, "left"  ],
            ["Lender",      90, "left"  ],
            ["Lender ID",   90, "left"  ],
            ["Amount Paid", 78, "right" ],
            ["Mode",        80, "left"  ],
            ["Ref No",     100, "left"  ],
            ["Remarks",     96, "left"  ],
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

        if (repayments.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted).text("No repayments match the selected filters.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            repayments.forEach((rep, idx) => {
                need(ROW_H);
                doc.rect(MG, y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H).strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                const lenderObj = typeof rep.lender === "object" ? rep.lender as { lenderId?: string; name?: string } : null;
                let rx = MG;

                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = cols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                            0, C.muted);
                cell(rep.repaymentId ?? "-",                  1, C.emerald);
                cell(dFmt(rep.date),                          2, C.muted);
                cell(trunc(lenderObj?.name ?? "-", 18),       3, C.text, true);
                cell(lenderObj?.lenderId ?? "-",              4, C.slate);
                cell(dINR(rep.amountPaid),                    5, C.green, true);
                cell(rep.mode || "-",                         6, C.cyan);
                cell(trunc(rep.referenceNo, 16),              7, C.slate);
                cell(trunc(rep.remarks, 18),                  8, C.slate);

                y += ROW_H;
            });
        }

        // TOTALS
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        const modeSummary = [...modeMap.entries()].map(([m, v]) => `${m}: ${dINR(v)}`).join("  |  ");
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(`${repayments.length} repayments  |  Total: ${dINR(total)}  |  Avg: ${dINR(avgAmt)}  |  ${modeSummary}`,
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
