export type ReportValue = string | number | boolean | null | undefined;

export interface ReportDetailRow {
  readonly label: string;
  readonly value: ReportValue;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toFileName(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'report';
}

export function openReportPreview(
  pageTitle: string,
  reportName: string,
  rows: ReadonlyArray<ReportDetailRow>,
): void {
  const existingPreview = document.getElementById('report-preview-overlay');
  if (existingPreview) {
    existingPreview.remove();
  }

  const detailsMarkup = rows
    .map(
      (row) => `
        <tr>
          <th>${escapeHtml(row.label)}</th>
          <td>${escapeHtml(row.value === null || row.value === undefined ? '' : String(row.value))}</td>
        </tr>`,
    )
    .join('');

  const overlay = document.createElement('div');
  overlay.id = 'report-preview-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'report-preview-title');
  overlay.className = 'report-preview-overlay';
  overlay.innerHTML = `
    <div class="report-preview-backdrop"></div>
    <section class="report-preview-panel" tabindex="-1">
      <header class="report-preview-header">
        <div>
          <p class="report-preview-eyebrow">${escapeHtml(pageTitle)}</p>
          <h2 id="report-preview-title">${escapeHtml(reportName)}</h2>
        </div>
        <button type="button" class="report-preview-close" aria-label="Close preview">Close</button>
      </header>
      <div class="report-preview-body">
        <table>
          <tbody>${detailsMarkup}</tbody>
        </table>
      </div>
    </section>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .report-preview-overlay {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .report-preview-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.66);
      backdrop-filter: blur(4px);
    }
    .report-preview-panel {
      position: relative;
      width: min(920px, 100%);
      max-height: min(84vh, 920px);
      overflow: auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
      color: #0f172a;
      outline: none;
    }
    .report-preview-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 24px 28px;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #fff;
    }
    .report-preview-eyebrow {
      margin: 0 0 6px;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.78;
    }
    .report-preview-header h2 {
      margin: 0;
      font-size: 1.5rem;
    }
    .report-preview-close {
      border: 0;
      border-radius: 999px;
      padding: 0.7rem 1rem;
      background: #22d3ee;
      color: #082f49;
      font-weight: 700;
      cursor: pointer;
    }
    .report-preview-close:focus-visible {
      outline: 3px solid #ffffff;
      outline-offset: 3px;
    }
    .report-preview-body table {
      width: 100%;
      border-collapse: collapse;
    }
    .report-preview-body th,
    .report-preview-body td {
      padding: 14px 28px;
      border-top: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
    }
    .report-preview-body th {
      width: 42%;
      color: #475569;
      font-weight: 600;
      background: #f8fafc;
    }
  `;

  const closePreview = (): void => {
    overlay.removeEventListener('click', handleOverlayClick);
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    style.remove();
  };

  const handleOverlayClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.report-preview-close') ||
      target?.classList.contains('report-preview-backdrop')
    ) {
      closePreview();
    }
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closePreview();
    }
  };

  overlay.addEventListener('click', handleOverlayClick);
  document.addEventListener('keydown', handleKeyDown);
  document.body.appendChild(style);
  document.body.appendChild(overlay);
  (overlay.querySelector('.report-preview-panel') as HTMLElement | null)?.focus();
}

export async function downloadReportPdf(
  pageTitle: string,
  reportName: string,
  rows: ReadonlyArray<ReportDetailRow>,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const leftMargin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - leftMargin * 2;
  let cursorY = 22;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(pageTitle, leftMargin, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(reportName, leftMargin, 27);

  cursorY = 48;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Details', leftMargin, cursorY);

  cursorY += 8;
  rows.forEach((row) => {
    const label = `${row.label}:`;
    const value = row.value === null || row.value === undefined ? '' : String(row.value);
    const wrappedValue = doc.splitTextToSize(value, contentWidth - 48);
    const rowHeight = Math.max(8, wrappedValue.length * 5.5);

    if (cursorY + rowHeight > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
      cursorY = 20;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(leftMargin, cursorY + 2, pageWidth - leftMargin, cursorY + 2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, leftMargin, cursorY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(wrappedValue, leftMargin + 48, cursorY + 8);
    cursorY += rowHeight + 6;
  });

  doc.save(`${toFileName(`${pageTitle} ${reportName}`)}.pdf`);
}
