import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────
interface Project {
  projectID?: string;
  engagementName: string;
  clientName: string;
  assessmentType: string;
  status: string;
  billable: boolean;
  shadowing: boolean;
  effortTimeHours: number;
  timelineStart?: string | Date | null;
  timelineEnd?: string | Date | null;
  EM?: string;
  PM?: string;
  consultants?: string;
  isMultiPerson: boolean;
  isLeadConsultant: boolean;
}

interface DashboardStats {
  assessmentCounts: {
    active: number;
    placeholder: number;
    delivered: number;
    cancelled: number;
    total: number;
  };
  billableHours: { current: number; target: number };
  efrsByQuarter: Record<string, number>;
  efrTarget: number;
  multiPersonByQuarter: Record<string, number>;
  multiPersonTarget: number;
  currentQuarter: string;
  yearQuarters: string[];
}

interface Efr {
  title: string;
  description?: string;
  quarter: string;
  submittedAt: string | Date;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d?: string | Date | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getTimestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── PDF: Assessments ────────────────────────────────────────
export function exportProjectsPDF(projects: Project[]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Assessments Report", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${projects.length} records`, 14, 22);

  // Status summary bar
  const statusCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  let y = 36;
  doc.setTextColor(100, 100, 120);
  doc.setFontSize(8);
  const summaryParts = Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`);
  doc.text(`Summary: ${summaryParts.join("  |  ")}`, 14, y);
  y += 6;

  // Table
  const headers = [
    "Project ID",
    "Engagement",
    "Client",
    "Type",
    "Status",
    "Billable",
    "Effort (hrs)",
    "Start",
    "End",
    "EM",
    "PM",
  ];

  const rows = projects.map((p) => [
    p.projectID || "—",
    p.engagementName,
    p.clientName,
    p.assessmentType,
    p.status,
    p.billable ? "Yes" : "No",
    String(p.effortTimeHours),
    formatDate(p.timelineStart),
    formatDate(p.timelineEnd),
    p.EM || "—",
    p.PM || "—",
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: y,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18 },
      5: { cellWidth: 14 },
      6: { cellWidth: 18 },
      7: { cellWidth: 22 },
      8: { cellWidth: 22 },
      9: { cellWidth: 28 },
      10: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" }
      );
    },
  });

  doc.save(`assessments-report-${getTimestamp()}.pdf`);
}

// ─── Excel: Assessments ──────────────────────────────────────
export function exportProjectsExcel(projects: Project[]): void {
  const worksheetData = projects.map((p) => ({
    "Project ID": p.projectID || "",
    "Engagement Name": p.engagementName,
    "Client Name": p.clientName,
    "Assessment Type": p.assessmentType,
    "Status": p.status,
    "Billable": p.billable ? "Yes" : "No",
    "Shadowing": p.shadowing ? "Yes" : "No",
    "Effort (Hours)": p.effortTimeHours,
    "Timeline Start": formatDate(p.timelineStart),
    "Timeline End": formatDate(p.timelineEnd),
    "EM": p.EM || "",
    "PM": p.PM || "",
    "Consultants": p.consultants || "",
    "Multi-Person": p.isMultiPerson ? "Yes" : "No",
    "Lead Consultant": p.isLeadConsultant ? "Yes" : "No",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(worksheetData);

  // Set column widths
  ws["!cols"] = [
    { wch: 14 }, // Project ID
    { wch: 30 }, // Engagement
    { wch: 22 }, // Client
    { wch: 20 }, // Type
    { wch: 12 }, // Status
    { wch: 10 }, // Billable
    { wch: 10 }, // Shadowing
    { wch: 14 }, // Effort
    { wch: 14 }, // Start
    { wch: 14 }, // End
    { wch: 20 }, // EM
    { wch: 20 }, // PM
    { wch: 25 }, // Consultants
    { wch: 13 }, // Multi-Person
    { wch: 15 }, // Lead
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Assessments");

  // Add summary sheet
  const summaryData = [
    { "Metric": "Total Assessments", "Value": projects.length },
    { "Metric": "Active", "Value": projects.filter((p) => p.status === "Active").length },
    { "Metric": "Placeholder", "Value": projects.filter((p) => p.status === "Placeholder").length },
    { "Metric": "Delivered", "Value": projects.filter((p) => p.status === "Delivered").length },
    { "Metric": "Cancelled", "Value": projects.filter((p) => p.status === "Cancelled").length },
    { "Metric": "Billable", "Value": projects.filter((p) => p.billable).length },
    { "Metric": "Total Effort (Hours)", "Value": projects.reduce((a, p) => a + (p.effortTimeHours || 0), 0) },
    { "Metric": "Generated", "Value": new Date().toLocaleString() },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 22 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `assessments-report-${getTimestamp()}.xlsx`);
}

// ─── PDF: Goals & EFRs ──────────────────────────────────────
export function exportGoalsPDF(stats: DashboardStats, efrs: Efr[]): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Career Goals & Dashboard Report", 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  let y = 38;

  // Assessment summary
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Assessment Overview", 14, y);
  y += 8;

  const counts = stats.assessmentCounts;
  autoTable(doc, {
    startY: y,
    head: [["Status", "Count"]],
    body: [
      ["Active", String(counts.active)],
      ["Placeholder", String(counts.placeholder)],
      ["Delivered", String(counts.delivered)],
      ["Cancelled", String(counts.cancelled)],
      ["Total", String(counts.total)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Billable hours
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Billable Hours", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const bPct = Math.round((stats.billableHours.current / stats.billableHours.target) * 100);
  doc.text(`${stats.billableHours.current} / ${stats.billableHours.target} hours (${bPct}%)`, 14, y);
  y += 10;

  // EFR Goal Progress
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("EFR Goal Progress", 14, y);
  y += 8;

  const efrRows = stats.yearQuarters.map((q) => [
    q,
    String(stats.efrsByQuarter[q] || 0),
    String(stats.efrTarget),
    q === stats.currentQuarter ? "Current" : "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Quarter", "Submitted", "Target", "Status"]],
    body: efrRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Multi-Person Leadership
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Multi-Person Project Leadership", 14, y);
  y += 8;

  const mpRows = stats.yearQuarters.map((q) => [
    q,
    String(stats.multiPersonByQuarter[q] || 0),
    String(stats.multiPersonTarget),
    q === stats.currentQuarter ? "Current" : "",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Quarter", "Count", "Target", "Status"]],
    body: mpRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  // EFR Details (new page if needed)
  if (efrs.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 12;
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(30, 30, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("EFR Submissions Detail", 14, y);
    y += 8;

    const efrDetailRows = efrs.map((e) => [
      e.title,
      e.description || "—",
      e.quarter,
      formatDate(e.submittedAt),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Title", "Description", "Quarter", "Submitted"]],
      body: efrDetailRows,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 75 },
        2: { cellWidth: 25 },
        3: { cellWidth: 28 },
      },
    });
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  doc.save(`goals-dashboard-report-${getTimestamp()}.pdf`);
}

// ─── Excel: Goals & EFRs ────────────────────────────────────
export function exportGoalsExcel(stats: DashboardStats, efrs: Efr[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Assessment Overview
  const overviewData = [
    { "Metric": "Active Assessments", "Value": stats.assessmentCounts.active },
    { "Metric": "Placeholder Assessments", "Value": stats.assessmentCounts.placeholder },
    { "Metric": "Delivered Assessments", "Value": stats.assessmentCounts.delivered },
    { "Metric": "Cancelled Assessments", "Value": stats.assessmentCounts.cancelled },
    { "Metric": "Total Assessments", "Value": stats.assessmentCounts.total },
    { "Metric": "", "Value": "" },
    { "Metric": "Billable Hours (Current)", "Value": stats.billableHours.current },
    { "Metric": "Billable Hours (Target)", "Value": stats.billableHours.target },
    { "Metric": "Billable Hours (%)", "Value": `${Math.round((stats.billableHours.current / stats.billableHours.target) * 100)}%` },
    { "Metric": "", "Value": "" },
    { "Metric": "Generated", "Value": new Date().toLocaleString() },
  ];
  const overviewWs = XLSX.utils.json_to_sheet(overviewData);
  overviewWs["!cols"] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, overviewWs, "Overview");

  // Sheet 2: EFR Progress
  const efrProgressData = stats.yearQuarters.map((q) => ({
    "Quarter": q,
    "Submitted": stats.efrsByQuarter[q] || 0,
    "Target": stats.efrTarget,
    "Status": q === stats.currentQuarter ? "Current Quarter" : "",
  }));
  const efrProgressWs = XLSX.utils.json_to_sheet(efrProgressData);
  efrProgressWs["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, efrProgressWs, "EFR Progress");

  // Sheet 3: Multi-Person Leadership
  const mpData = stats.yearQuarters.map((q) => ({
    "Quarter": q,
    "Count": stats.multiPersonByQuarter[q] || 0,
    "Target": stats.multiPersonTarget,
    "Status": q === stats.currentQuarter ? "Current Quarter" : "",
  }));
  const mpWs = XLSX.utils.json_to_sheet(mpData);
  mpWs["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, mpWs, "Multi-Person Lead");

  // Sheet 4: EFR Submissions
  if (efrs.length > 0) {
    const efrData = efrs.map((e) => ({
      "Title": e.title,
      "Description": e.description || "",
      "Quarter": e.quarter,
      "Submitted Date": formatDate(e.submittedAt),
    }));
    const efrWs = XLSX.utils.json_to_sheet(efrData);
    efrWs["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, efrWs, "EFR Submissions");
  }

  XLSX.writeFile(wb, `goals-dashboard-report-${getTimestamp()}.xlsx`);
}
