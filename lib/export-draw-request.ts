import type { Project, ContractorPayment, DrawRequest, Document } from "@/lib/types/database";

export async function exportDrawRequestXlsx(
  draw: DrawRequest,
  project: Project,
  payments: ContractorPayment[],
  documents: Document[]
) {
  // Dynamic import — exceljs is large, only load when needed
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Draw Request", {
    pageSetup: { paperSize: 1 as unknown as undefined, orientation: "portrait" as const },
  });

  // Column widths to match the template
  sheet.columns = [
    { width: 3 },   // A — spacer
    { width: 16 },  // B — Budget Line Item Number
    { width: 42 },  // C — Description
    { width: 22 },  // D — Amount
    { width: 38 },  // E — Payee
  ];

  const drawDocs = documents
    .filter((d) => d.draw_request_id === draw.id)
    .sort((a, b) => (a.line_item_number ?? "zzz").localeCompare(b.line_item_number ?? "zzz", undefined, { numeric: true }));

  // Match documents to contractor payments
  const docPayments = new Map<string, ContractorPayment>();
  for (const doc of drawDocs) {
    const payment = payments.find((p) => p.invoice_file_url === doc.file_url);
    if (payment) docPayments.set(doc.id, payment);
  }

  const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const address = [project.address, project.city, project.state].filter(Boolean).join(" ");

  // ── Styling helpers ──
  const titleFont = { name: "Times New Roman", size: 16, italic: true, bold: true };
  const subtitleFont = { name: "Times New Roman", size: 12, italic: true };
  const normalFont = { name: "Arial", size: 11 };
  const headerFont = { name: "Arial", size: 11, bold: true };
  const thinBorder = { style: "thin" as const, color: { argb: "FF000000" } };
  const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

  // ── Row 1: Company name ──
  const r1 = sheet.addRow(["", "", "ALF Holdings Utah, LLC", "", ""]);
  sheet.mergeCells("C1:E1");
  r1.getCell(3).font = titleFont;
  r1.getCell(3).alignment = { horizontal: "center" };
  r1.height = 28;

  // ── Row 2: Subtitle ──
  const r2 = sheet.addRow(["", "", "Draw Request Summary Sheet", "", ""]);
  sheet.mergeCells("C2:E2");
  r2.getCell(3).font = subtitleFont;
  r2.getCell(3).alignment = { horizontal: "center" };

  // ── Row 3: blank ──
  sheet.addRow([]);

  // ── Row 4: Date ──
  const r4 = sheet.addRow(["", "", `Date Draw Request Submitted:    ${today}`, "", ""]);
  sheet.mergeCells("C4:E4");
  r4.getCell(3).font = normalFont;
  r4.getCell(3).alignment = { horizontal: "center" };

  // ── Row 5: blank ──
  sheet.addRow([]);

  // ── Row 6: Borrower (always Blake Jones — he's the borrower on the loan) ──
  const r6 = sheet.addRow(["", "", "Borrowers Name:  Blake Jones", "", ""]);
  sheet.mergeCells("C6:E6");
  r6.getCell(3).font = normalFont;

  // ── Row 7: Address with project name ──
  const addressWithProject = address
    ? `${address} (${project.name})`
    : project.name;
  const r7 = sheet.addRow(["", "", `Property Address: ${addressWithProject}`, "", ""]);
  sheet.mergeCells("C7:E7");
  r7.getCell(3).font = normalFont;

  // ── Row 8: blank ──
  sheet.addRow([]);

  // ── Row 9: Column headers ──
  const headerRow = sheet.addRow([
    "",
    "Budget Line Item Number",
    "Budget Line Item Description",
    "Amount Currently Requested",
    "Payee - MUST ATTACH ALL W-9's AND INVOICES",
  ]);
  headerRow.height = 30;
  for (let col = 2; col <= 5; col++) {
    const cell = headerRow.getCell(col);
    cell.font = headerFont;
    cell.border = allBorders;
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" },
    };
  }

  // ── Rows 10+: Line items ──
  const lineItemStartRow = 10;
  const minLineItems = 10;
  const lineItemCount = Math.max(drawDocs.length, minLineItems);

  for (let i = 0; i < lineItemCount; i++) {
    const doc = drawDocs[i];
    let lineNum = "";
    let description = "";
    let amount = "";
    let payee = "";

    if (doc) {
      const payment = docPayments.get(doc.id);
      lineNum = doc.line_item_number != null ? String(doc.line_item_number) : "";
      description = payment?.description || doc.vendor || doc.name;
      amount = payment?.amount ? payment.amount.toFixed(2) : "";
      payee = doc.vendor || payment?.contractor_name || "";
    }

    const row = sheet.addRow(["", lineNum, description, amount, payee]);
    for (let col = 2; col <= 5; col++) {
      const cell = row.getCell(col);
      cell.font = normalFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle" };
    }
    // Format amount as number if present
    if (amount) {
      row.getCell(4).numFmt = '#,##0.00';
      row.getCell(4).value = parseFloat(amount);
    }
  }

  // ── Blank row after line items ──
  sheet.addRow([]);

  // ── Total row ──
  const total = drawDocs.reduce((sum, doc) => {
    const payment = docPayments.get(doc.id);
    return sum + (payment?.amount || 0);
  }, 0);
  const totalRowNum = lineItemStartRow + lineItemCount + 1;
  const totalRow = sheet.addRow([
    "",
    "",
    `Total Amount Currently Requested:  $ ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    "",
    "",
  ]);
  sheet.mergeCells(`C${totalRowNum}:E${totalRowNum}`);
  totalRow.getCell(3).font = { ...normalFont, bold: true };

  // ── Blank row ──
  sheet.addRow([]);

  // ── Contact row ──
  const contactRowNum = totalRowNum + 2;
  const contactRow = sheet.addRow([
    "",
    "",
    "Contact Person for questions on Draw:  Blake Jones  Telephone:  907 741.9073",
    "",
    "",
  ]);
  sheet.mergeCells(`C${contactRowNum}:E${contactRowNum}`);
  contactRow.getCell(3).font = normalFont;

  // ── Blank row ──
  sheet.addRow([]);

  // ── Signature row ──
  const sigRowNum = contactRowNum + 2;
  const sigRow = sheet.addRow([
    "",
    "",
    "Borrowers signature for approval/authorization:__________________________________________________________________________",
    "",
    "",
  ]);
  sheet.mergeCells(`C${sigRowNum}:E${sigRowNum}`);
  sigRow.getCell(3).font = normalFont;

  // ── Generate and download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Draw_Request_${draw.draw_number}_${project.name.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
