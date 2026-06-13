// ── Per-Lender Statement PDF Export ───────────────────────────────────────────
// Matches the exact design of lender_export / repayment_export / summary_export
// Unicode-safe: only ASCII characters used

const dINR = (n: number | null | undefined): string => {
    if (n == null) return "-";
    const num = Math.abs(Math.round(n));
    let s = num.toString();
    if (s.length > 3) {
        const last3 = s.slice(-3);
        const rest  = s.slice(0, -3);
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

interface LenderProfile {
    lenderId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive?: boolean;
    totalBorrowed: number;
    totalRepaid: number;    // Principal
    totalProfit: number;    // Profit/interest
    balancePayable: number;
}

interface InvRow {
    investmentId: string;
    date: Date | string;
    amountReceived: number;
    mode: string;
    referenceNo?: string;
    notes?: string;
}

interface RepRow {
    repaymentId: string;
    date: Date | string;
    amountPaid: number;
    mode: string;
    repaymentType?: string;
    referenceNo?: string;
    remarks?: string;
}

export const exportLenderStatementPDF = async (
    lender: LenderProfile,
    investments: InvRow[],
    repayments: RepRow[],
): Promise<Buffer> => {

    // ── Derived stats ─────────────────────────────────────────────────────────
    const totalBorrowed  = investments.reduce((s, i) => s + (i.amountReceived ?? 0), 0);
    const totalPrincipal = repayments.filter(r => (r.repaymentType ?? "Principal") !== "Profit").reduce((s, r) => s + r.amountPaid, 0);
    const totalProfit    = repayments.filter(r => r.repaymentType === "Profit").reduce((s, r) => s + r.amountPaid, 0);
    const totalRepaid    = totalPrincipal + totalProfit;
    const balance        = Math.max(0, totalBorrowed - totalPrincipal);
    const pct            = totalBorrowed > 0 ? (totalPrincipal / totalBorrowed) * 100 : 0;
    const paidOff        = balance <= 0;

    const invModeMap = new Map<string, number>();
    investments.forEach(i => invModeMap.set(i.mode, (invModeMap.get(i.mode) ?? 0) + i.amountReceived));
    const repModeMap = new Map<string, number>();
    repayments.forEach(r => repModeMap.set(r.mode, (repModeMap.get(r.mode) ?? 0) + r.amountPaid));

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

        // ── Colour palette (identical to all other exports) ───────────────────
        const C = {
            navy:    "#0f172a", indigo:  "#6366f1", green:   "#16a34a", amber:   "#d97706",
            emerald: "#059669", cyan:    "#0891b2", violet:  "#7c3aed", slate:   "#64748b",
            red:     "#dc2626", white:   "#ffffff", border:  "#e2e8f0", light:   "#f8fafc",
            text:    "#1e293b", muted:   "#94a3b8",
        };

        const now = new Date();
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const genStr = `Generated: ${String(now.getDate()).padStart(2,"0")} ${months[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

        // ── Footer (identical to all other exports) ───────────────────────────
        const addFooter = () => {
            doc.moveTo(MG, PH - 18).lineTo(PW - MG, PH - 18).strokeColor(C.border).lineWidth(0.5).stroke();
            doc.fontSize(6).font("Helvetica").fillColor(C.muted)
                .text("VehicleBook -- Confidential. For internal use only.", MG, PH - 12, { lineBreak: false });
        };

        // ── Header (identical to all other exports) ───────────────────────────
        const drawPageHeader = (title: string, recordCount: string) => {
            doc.rect(0, 0, PW, 54).fill(C.navy);
            doc.rect(0, 50, PW, 4).fill(C.indigo);
            doc.fontSize(19).font("Helvetica-Bold").fillColor(C.white).text("VehicleBook", MG, 10, { lineBreak: false });
            doc.fontSize(7.5).font("Helvetica").fillColor(C.muted).text("Inventory Management System", MG, 33, { lineBreak: false });
            doc.fontSize(12).font("Helvetica-Bold").fillColor(C.white)
                .text(title, MG, 11, { width: CW, align: "right", lineBreak: false });
            doc.fontSize(7.5).font("Helvetica").fillColor(C.muted)
                .text(`${genStr}  |  ${recordCount}`, MG, 31, { width: CW, align: "right", lineBreak: false });
        };

        // ─────────────────────────────────────────────────────────────────────
        //  PAGE 1: LENDER OVERVIEW
        // ─────────────────────────────────────────────────────────────────────
        drawPageHeader(
            `Lender Statement  |  ${lender.name ?? "-"}`,
            `ID: ${lender.lenderId ?? "-"}  |  ${investments.length} investment(s)  |  ${repayments.length} repayment(s)`
        );

        const SY = 58; const SH = 42;

        // ── 5 Summary cards ───────────────────────────────────────────────────
        const metrics = [
            { label: "TOTAL BORROWED",      value: dINR(totalBorrowed),    sub: `${investments.length} investment(s)`,     accent: C.violet  },
            { label: "PRINCIPAL REPAID",    value: dINR(totalPrincipal),   sub: `${pct.toFixed(1)}% repayment rate`,       accent: C.emerald },
            { label: "PROFIT PAID",         value: dINR(totalProfit),      sub: "Interest / balance unchanged",            accent: C.amber   },
            { label: "BALANCE OUTSTANDING", value: dINR(balance),          sub: paidOff ? "Fully settled!" : "Outstanding", accent: paidOff ? C.green : C.red },
            { label: "TOTAL REPAYMENTS",    value: String(repayments.length), sub: `Principal + Profit combined`,          accent: C.indigo  },
        ];
        const mW = CW / metrics.length;
        metrics.forEach((m, i) => {
            const mx = MG + i * mW;
            doc.rect(mx, SY, mW - 2, SH).fill(C.light).strokeColor(m.accent + "50").lineWidth(0.5).stroke();
            doc.rect(mx, SY, 3, SH).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent).text(m.label, mx + 7, SY + 5,  { width: mW - 16, lineBreak: false });
            doc.fontSize(8.5).font("Helvetica-Bold").fillColor(m.accent).text(m.value, mx + 7, SY + 16, { width: mW - 16, lineBreak: false });
            if (m.sub) doc.fontSize(4.8).font("Helvetica").fillColor(C.muted).text(m.sub, mx + 7, SY + 29, { width: mW - 16, lineBreak: false });
        });

        // ── Lender profile info strip ─────────────────────────────────────────
        const infoY = SY + SH + 4;
        doc.rect(MG, infoY, CW, 18).fill(C.light).strokeColor(C.border).lineWidth(0.5).stroke();
        doc.rect(MG, infoY, 3, 18).fill(C.indigo);

        const isActive = lender.isActive !== false;
        const infoFields = [
            `Status: ${isActive ? "Active" : "Inactive"}`,
            lender.phone ? `Phone: ${lender.phone}` : null,
            lender.address ? `Address: ${trunc(lender.address, 40)}` : null,
            lender.remarks ? `Remarks: ${trunc(lender.remarks, 40)}` : null,
        ].filter(Boolean) as string[];

        doc.fontSize(6).font("Helvetica-Bold").fillColor(isActive ? C.green : C.red)
            .text(isActive ? "Active" : "Inactive", MG + 8, infoY + 6, { lineBreak: false });

        let infoX = MG + 60;
        infoFields.slice(1).forEach(f => {
            doc.fontSize(6).font("Helvetica").fillColor(C.slate).text(f, infoX, infoY + 6, { lineBreak: false });
            infoX += Math.max(120, f.length * 4.5);
        });

        // ═════════════════════════════════════════════════════════════════════
        //  INVESTMENTS TABLE
        // ═════════════════════════════════════════════════════════════════════
        const invCols: [string, number, "left" | "right" | "center"][] = [
            ["#",        16, "center"],
            ["Inv ID",   72, "left"  ],
            ["Date",     58, "left"  ],
            ["Amount",   90, "right" ],
            ["Mode",     80, "left"  ],
            ["Ref No",   90, "left"  ],
            ["Notes",    CW - 16 - 72 - 58 - 90 - 80 - 90, "left"],
        ];

        const HDR_H = 16; const ROW_H = 15;
        let y = infoY + 18 + 6;

        // Section label
        doc.rect(MG, y, CW, 14).fill(C.navy);
        doc.fontSize(7).font("Helvetica-Bold").fillColor(C.white)
            .text(`INVESTMENTS  (${investments.length} records  |  Total: ${dINR(totalBorrowed)})`, MG + 8, y + 4, { lineBreak: false });
        y += 14;

        // Investments table header
        const drawInvHeader = () => {
            doc.rect(MG, y, CW, HDR_H).fill(C.navy);
            let hx = MG;
            invCols.forEach(([label, w, align]) => {
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
            }
        };

        drawInvHeader();

        if (investments.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No investments recorded for this lender.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            investments.forEach((inv, idx) => {
                need(ROW_H);
                doc.rect(MG, y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H).strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                let rx = MG;

                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = invCols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                   0, C.muted);
                cell(inv.investmentId ?? "-",         1, C.violet, true);
                cell(dFmt(inv.date),                  2, C.muted);
                cell(dINR(inv.amountReceived),         3, C.violet, true);
                cell(inv.mode ?? "-",                 4, C.cyan);
                cell(trunc(inv.referenceNo, 16),      5, C.slate);
                cell(trunc(inv.notes, 22),            6, C.slate);

                y += ROW_H;
            });
        }

        // Investments totals row
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        const invModeSummary = [...invModeMap.entries()].map(([m, v]) => `${m}: ${dINR(v)}`).join("  |  ");
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(`${investments.length} investment(s)  |  Total Capital: ${dINR(totalBorrowed)}  |  ${invModeSummary}`,
                MG + 8, y + 8, { lineBreak: false });
        y += 24 + 8;

        // ═════════════════════════════════════════════════════════════════════
        //  REPAYMENTS TABLE
        // ═════════════════════════════════════════════════════════════════════
        const repCols: [string, number, "left" | "right" | "center"][] = [
            ["#",       16, "center"],
            ["Rep ID",  72, "left"  ],
            ["Date",    58, "left"  ],
            ["Type",    62, "center"],
            ["Amount",  84, "right" ],
            ["Mode",    78, "left"  ],
            ["Ref No",  86, "left"  ],
            ["Remarks", CW - 16 - 72 - 58 - 62 - 84 - 78 - 86, "left"],
        ];

        // Section label
        need(14);
        doc.rect(MG, y, CW, 14).fill(C.navy);
        doc.fontSize(7).font("Helvetica-Bold").fillColor(C.white)
            .text(`REPAYMENTS  (${repayments.length} records  |  Principal: ${dINR(totalPrincipal)}  |  Profit: ${dINR(totalProfit)}  |  Total: ${dINR(totalRepaid)})`,
                MG + 8, y + 4, { lineBreak: false });
        y += 14;

        // Repayments table header
        const drawRepHeader = () => {
            doc.rect(MG, y, CW, HDR_H).fill(C.navy);
            let hx = MG;
            repCols.forEach(([label, w, align]) => {
                doc.fontSize(5.8).font("Helvetica-Bold").fillColor(C.white).text(label, hx + 2, y + 5, { width: w - 4, align, lineBreak: false });
                hx += w;
            });
            y += HDR_H;
        };

        need(HDR_H);
        drawRepHeader();

        if (repayments.length === 0) {
            need(28);
            doc.rect(MG, y, CW, 28).fill(C.light);
            doc.fontSize(8).font("Helvetica").fillColor(C.muted)
                .text("No repayments recorded for this lender.", MG + 12, y + 10, { lineBreak: false });
            y += 28;
        } else {
            repayments.forEach((rep, idx) => {
                need(ROW_H);
                doc.rect(MG, y, CW, ROW_H).fill(idx % 2 === 0 ? C.light : C.white);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H).strokeColor(C.border).lineWidth(0.12).stroke();

                const textY = y + 4;
                const rType = rep.repaymentType ?? "Principal";
                const typeColor = rType === "Profit" ? C.amber : C.green;
                let rx = MG;

                const cell = (text: string, ci: number, color?: string, bold?: boolean) => {
                    const [, w, align] = repCols[ci];
                    doc.fontSize(6).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(color ?? C.text)
                        .text(text, rx + 2, textY, { width: w - 4, align, lineBreak: false });
                    rx += w;
                };

                cell(`${idx + 1}`,                             0, C.muted);
                cell(rep.repaymentId ?? "-",                   1, C.emerald, true);
                cell(dFmt(rep.date),                           2, C.muted);
                cell(rType === "Profit" ? "PROFIT" : "PRINCIPAL", 3, typeColor, true);
                cell(dINR(rep.amountPaid),                     4, typeColor, true);
                cell(rep.mode ?? "-",                          5, C.cyan);
                cell(trunc(rep.referenceNo, 14),               6, C.slate);
                cell(trunc(rep.remarks, 22),                   7, C.slate);

                y += ROW_H;
            });
        }

        // Repayments totals row
        need(24);
        doc.rect(MG, y, CW, 24).fill(C.navy);
        const repModeSummary = [...repModeMap.entries()].map(([m, v]) => `${m}: ${dINR(v)}`).join("  |  ");
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C.white)
            .text(`${repayments.length} repayment(s)  |  Principal: ${dINR(totalPrincipal)}  |  Profit: ${dINR(totalProfit)}  |  Total Paid: ${dINR(totalRepaid)}  |  Balance: ${dINR(balance)}  |  ${pct.toFixed(1)}% repaid  |  ${repModeSummary}`,
                MG + 8, y + 8, { lineBreak: false });
        y += 24;

        // ── Footer on all pages ───────────────────────────────────────────────
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
