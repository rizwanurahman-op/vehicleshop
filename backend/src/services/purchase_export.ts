import { Vehicle } from "../models/vehicle.model";

// ── Purchase Register Exports ─────────────────────────────────────────────────

export interface PurchaseExportQuery {
    vehicleType?: string;
    paymentStatus?: string;
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

// ── Build MongoDB filter ─────────────────────────────────────────────────────
const buildFilter = (query: PurchaseExportQuery): Record<string, unknown> => {
    const { vehicleType, paymentStatus, search, dateFrom, dateTo } = query;
    const filter: Record<string, unknown> = { isActive: true };
    if (vehicleType) filter.vehicleType = vehicleType;
    if (paymentStatus && paymentStatus !== "all") filter.purchasePaymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        filter.datePurchased = df;
    }
    if (search) {
        const trimmed = search.trim();
        if (trimmed) {
            const words = trimmed.split(/\s+/);
            const escWord = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            if (words.length === 1) {
                const re = new RegExp(escWord(words[0]), "i");
                filter.$or = [
                    { make: re }, { model: re }, { registrationNo: re },
                    { purchasedFrom: re }, { vehicleId: re },
                ];
            } else {
                filter.$and = words.map((w) => {
                    const re = new RegExp(escWord(w), "i");
                    return { $or: [{ make: re }, { model: re }] };
                });
            }
        }
    }
    return filter;
};

// ── CSV Export ──────────────────────────────────────────────────────────────
export const exportPurchasesCSV = async (query: PurchaseExportQuery): Promise<string> => {
    const filter = buildFilter(query);
    const vehicles = await Vehicle.find(filter)
        .select("vehicleId vehicleType make model registrationNo purchasedFrom purchasedFromPhone datePurchased purchasePrice purchasePayments purchasePaymentStatus purchasePendingAmount totalInvestment status fundingSource")
        .sort({ datePurchased: -1 })
        .lean();

    const esc = (x: unknown) => {
        const s = String(x ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
        "Vehicle ID", "Type", "Make", "Model", "Registration No",
        "Purchased From", "Seller Phone", "Date Purchased",
        "Purchase Price", "Amount Paid", "Amount Pending",
        "Payment Status", "Total Investment", "Vehicle Status", "Funding Source",
    ];

    const rows = vehicles.map((v) => {
        const paid = v.purchasePrice - (v.purchasePendingAmount ?? 0);
        return [
            v.vehicleId,
            v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
            v.make,
            v.model,
            v.registrationNo,
            v.purchasedFrom,
            (v as any).purchasedFromPhone ?? "",
            dFmt(v.datePurchased),
            v.purchasePrice,
            paid,
            v.purchasePendingAmount ?? 0,
            dSl(v.purchasePaymentStatus ?? ""),
            v.totalInvestment,
            dSl(v.status),
            dSl((v as any).fundingSource ?? ""),
        ].map(esc).join(",");
    });

    return [headers.map(esc).join(","), ...rows].join("\r\n");
};

// ── PDF Export ──────────────────────────────────────────────────────────────
export const exportPurchasesPDF = async (query: PurchaseExportQuery): Promise<Buffer> => {
    const filter = buildFilter(query);
    const vehicles = await Vehicle.find(filter)
        .select("vehicleId vehicleType make model registrationNo purchasedFrom purchasedFromPhone datePurchased purchasePrice purchasePayments purchasePaymentStatus purchasePendingAmount totalInvestment status fundingSource")
        .sort({ datePurchased: -1 })
        .lean();

    // Aggregate stats
    const totalPurchasePrice = vehicles.reduce((s, v) => s + (v.purchasePrice ?? 0), 0);
    const totalPaid = vehicles.reduce((s, v) => s + (v.purchasePrice - (v.purchasePendingAmount ?? 0)), 0);
    const totalPending = vehicles.reduce((s, v) => s + (v.purchasePendingAmount ?? 0), 0);
    const pendingCount = vehicles.filter((v) => v.purchasePaymentStatus === "pending" || v.purchasePaymentStatus === "partial").length;
    const fullyPaidCount = vehicles.filter((v) => v.purchasePaymentStatus === "paid").length;

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
            text: "#1e293b", muted: "#94a3b8", orange: "#ea580c",
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

        const labelParts: string[] = ["Purchase Register Report"];
        if (query.vehicleType) labelParts.push(query.vehicleType === "two_wheeler" ? "· Two Wheelers" : "· Four Wheelers");
        if (query.paymentStatus && query.paymentStatus !== "all") labelParts.push(`· ${dSl(query.paymentStatus)}`);
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
        const summaryY = 56;
        const mW = CW / 5;
        const summaryMetrics = [
            { label: "TOTAL VEHICLES", value: vehicles.length.toString(), accent: C.indigo },
            { label: "TOTAL PURCHASE VALUE", value: dINR(totalPurchasePrice), accent: C.amber },
            { label: "AMOUNT PAID", value: dINR(totalPaid), accent: C.green },
            { label: "AMOUNT PENDING", value: dINR(totalPending), accent: C.red },
            { label: "FULLY SETTLED", value: `${fullyPaidCount} / ${vehicles.length}`, accent: C.green },
        ];
        summaryMetrics.forEach((m, i) => {
            const mx = MG + i * (mW + 2);
            doc.rect(mx, summaryY, mW - 2, 34).fill(C.light).strokeColor(m.accent + "40").lineWidth(0.5).stroke();
            doc.rect(mx, summaryY, 3, 34).fill(m.accent);
            doc.fontSize(5.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.label, mx + 8, summaryY + 5, { lineBreak: false });
            doc.fontSize(9.5).font("Helvetica-Bold").fillColor(m.accent)
                .text(m.value, mx + 8, summaryY + 15, { lineBreak: false });
        });

        // ── TABLE ────────────────────────────────────────────────────────
        const tableY = summaryY + 42;

        const cols: [string, number, "left" | "right" | "center"][] = [
            ["#",          20, "center"],
            ["ID",         36, "left"],
            ["Type",       50, "left"],
            ["Make / Model", 120, "left"],
            ["Reg No",     72, "left"],
            ["Seller",     90, "left"],
            ["Date",       58, "left"],
            ["Purchase Price", 72, "right"],
            ["Paid",       65, "right"],
            ["Pending",    65, "right"],
            ["Status",     57, "center"],
        ];

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
                .text("No purchases match the selected filters.", MG + 10, y + 8, { lineBreak: false });
            y += 24;
        } else {
            vehicles.forEach((v, idx) => {
                need(ROW_H);
                const rowBg = idx % 2 === 0 ? "#f8fafc" : C.white;
                doc.rect(MG, y, CW, ROW_H).fill(rowBg);
                doc.moveTo(MG, y + ROW_H).lineTo(MG + CW, y + ROW_H)
                    .strokeColor(C.border).lineWidth(0.15).stroke();

                const paid = v.purchasePrice - (v.purchasePendingAmount ?? 0);
                const pending = v.purchasePendingAmount ?? 0;
                const statusColor: Record<string, string> = {
                    paid: C.green, partial: C.orange, pending: C.red,
                };
                const ps = v.purchasePaymentStatus ?? "pending";

                const cells: [string, string, "left" | "right" | "center", string?][] = [
                    [`${idx + 1}`, "6", "center"],
                    [v.vehicleId ?? "—", "6.5", "left"],
                    [v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler", "6.5", "left"],
                    [`${v.make} ${v.model}`, "6.5", "left"],
                    [v.registrationNo, "6.5", "left"],
                    [v.purchasedFrom, "6.5", "left"],
                    [dFmt(v.datePurchased), "6", "left"],
                    [dINR(v.purchasePrice), "6.5", "right"],
                    [dINR(paid), "6.5", "right", C.green],
                    [pending > 0 ? dINR(pending) : "—", "6.5", "right", pending > 0 ? C.red : C.muted],
                    [dSl(ps), "6", "center", statusColor[ps] ?? C.slate],
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
            .text(
                `${vehicles.length} vehicles  ·  Total: ${dINR(totalPurchasePrice)}  ·  Paid: ${dINR(totalPaid)}  ·  Pending: ${dINR(totalPending)}  ·  Due from ${pendingCount} sellers`,
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
