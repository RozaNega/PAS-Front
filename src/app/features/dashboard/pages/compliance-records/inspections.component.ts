import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { InspectionDto } from '../../../../core/services/inspections.service';

interface InspectionChecklistItem {
  task: string;
  passed: boolean;
}

interface Inspection {
  id: string;
  inspectionNumber: string;
  receivingNoteNumber: string;
  inspectionDate: string;
  inspector: string;
  status: 'Pending' | 'Passed' | 'Failed';
  itemsInspected: number;
  itemsPassed: number;
  itemsFailed: number;
  // Additional details
  supplierName: string;
  warehouseLocation: string;
  calibrationDate: string;
  temperatureLog: string;
  referenceStandard: string;
  quarantineAction: string;
  notes: string;
  checklist: InspectionChecklistItem[];
}

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inspections.component.html',
  styleUrls: ['./inspections.component.scss']
})
export class InspectionsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly inspections = signal<Inspection[]>([]);

  ngOnInit(): void {
    this.complianceData.getInspections().subscribe((records) => {
      this.inspections.set(records.map((record) => this.toInspection(record)));
    });
  }

  private toInspection(record: InspectionDto): Inspection {
    const itemsInspected = record.items.reduce((sum, item) => sum + item.inspectedQuantity, 0);
    const itemsPassed = record.items.reduce((sum, item) => sum + item.acceptedQuantity, 0);
    const itemsFailed = record.items.reduce((sum, item) => sum + item.rejectedQuantity, 0);

    return {
      id: record.id,
      inspectionNumber: `INS-${record.id}`,
      receivingNoteNumber: record.grnNumber || record.receivingNoteId,
      inspectionDate: this.toDateOnly(record.inspectionDate),
      inspector: record.inspectorName || record.inspectorId,
      status: record.status ? this.toStatus(record.status) : record.isPassed ? 'Passed' : 'Failed',
      itemsInspected,
      itemsPassed,
      itemsFailed,
      supplierName: '',
      warehouseLocation: '',
      calibrationDate: '',
      temperatureLog: '',
      referenceStandard: '',
      quarantineAction: itemsFailed > 0 ? `${itemsFailed} rejected item(s) recorded.` : 'None required',
      notes: record.deviationNotes || '',
      checklist: record.items.map((item) => ({
        task: `${item.itemName || item.itemId}: accepted ${item.acceptedQuantity}, rejected ${item.rejectedQuantity}`,
        passed: item.isPassed,
      })),
    };
  }

  private toStatus(status: string): Inspection['status'] {
    const normalized = status.toLowerCase();
    if (normalized.includes('pass') || normalized.includes('approved')) return 'Passed';
    if (normalized.includes('fail') || normalized.includes('reject')) return 'Failed';
    return 'Pending';
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
  readonly activeViewInspection = signal<Inspection | null>(null);
  readonly downloadingInspectionId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  onView(inspection: Inspection): void {
    this.activeViewInspection.set(inspection);
  }

  onDownload(inspection: Inspection): void {
    if (this.downloadingInspectionId()) return;

    this.downloadingInspectionId.set(inspection.id);
    this.downloadProgress.set(0);

    const interval = setInterval(() => {
      this.downloadProgress.update(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            this.downloadingInspectionId.set(null);
            this.downloadProgress.set(0);
            await this.triggerPdfDownload(inspection);
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private async triggerPdfDownload(inspection: Inspection): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const leftMargin = 18;
    const contentWidth = pageWidth - leftMargin * 2;
    let cursorY = 22;

    // Header bar style
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 34, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('PAS Quality Assurance - Record Management', leftMargin, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`QA Report: ${inspection.inspectionNumber} | Status: ${inspection.status}`, leftMargin, 27);

    // Section 1: General Info Metadata
    cursorY = 48;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. Core QA Metadata Parameters', leftMargin, cursorY);
    cursorY += 6;

    const rows = [
      { label: 'Inspection Ref', value: inspection.inspectionNumber },
      { label: 'GRN Number', value: inspection.receivingNoteNumber },
      { label: 'Inspection Date', value: inspection.inspectionDate },
      { label: 'Inspector In-charge', value: inspection.inspector },
      { label: 'Verification Status', value: inspection.status },
      { label: 'Total Items Tested', value: `${inspection.itemsInspected} items` },
      { label: 'Passed Items', value: `${inspection.itemsPassed} items` },
      { label: 'Failed Items', value: `${inspection.itemsFailed} items` },
      { label: 'Associated Supplier', value: inspection.supplierName },
      { label: 'Physical Storage Depot', value: inspection.warehouseLocation },
      { label: 'Calibration Date', value: inspection.calibrationDate },
      { label: 'Environmental Temp Log', value: inspection.temperatureLog },
      { label: 'Standards Reference', value: inspection.referenceStandard },
      { label: 'Failed Asset Actions', value: inspection.quarantineAction }
    ];

    rows.forEach(r => {
      if (cursorY + 12 > pdf.internal.pageSize.getHeight() - 18) {
        pdf.addPage();
        cursorY = 20;
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(leftMargin, cursorY + 1, pageWidth - leftMargin, cursorY + 1);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(10);
      pdf.text(`${r.label}:`, leftMargin, cursorY + 6);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(15, 23, 42);
      const wrappedVal = pdf.splitTextToSize(String(r.value), contentWidth - 48);
      pdf.text(wrappedVal, leftMargin + 48, cursorY + 6);
      
      const lineCount = wrappedVal.length;
      cursorY += (lineCount * 5) + 3;
    });

    // Section 2: Operating QA Checklist
    cursorY += 4;
    if (cursorY + 30 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('2. Standard Operating QA Checklist', leftMargin, cursorY);
    cursorY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    inspection.checklist.forEach(item => {
      if (cursorY + 8 > pdf.internal.pageSize.getHeight() - 18) {
        pdf.addPage();
        cursorY = 20;
      }
      
      const statusMark = item.passed ? '[PASSED]' : '[FAILED]';
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(item.passed ? 22 : 220, item.passed ? 163 : 38, item.passed ? 74 : 38);
      pdf.text(statusMark, leftMargin, cursorY);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const wrappedTask = pdf.splitTextToSize(item.task, contentWidth - 25);
      pdf.text(wrappedTask, leftMargin + 22, cursorY);
      
      cursorY += (wrappedTask.length * 5) + 3;
    });

    // Section 3: Notes & Findings
    cursorY += 4;
    if (cursorY + 22 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('3. Inspector Narrative Findings & Decision', leftMargin, cursorY);
    cursorY += 6;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    const notesWrapped = pdf.splitTextToSize(inspection.notes, contentWidth);
    pdf.text(notesWrapped, leftMargin, cursorY);
    cursorY += (notesWrapped.length * 5) + 6;

    // Footnote
    if (cursorY + 12 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('DIGITALLY SECURED & ARCHIVED UNDER PROPERTY AUDIT SYSTEM (PAS) PROTOCOLS.', leftMargin, cursorY);

    pdf.save(`${inspection.inspectionNumber}_QA_Report.pdf`);
  }

  closeModal(): void {
    this.activeViewInspection.set(null);
  }
}

