import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

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
export class InspectionsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Inspection[] = [
    {
      id: 'seed-1',
      inspectionNumber: 'INS-2024-001',
      receivingNoteNumber: 'GRN-2024-001',
      inspectionDate: '2024-01-20',
      inspector: 'Inspector A',
      status: 'Passed',
      itemsInspected: 50,
      itemsPassed: 48,
      itemsFailed: 2,
      supplierName: 'Alpha Tech Logistics Ltd.',
      warehouseLocation: 'Main Depot - Shelf Sector B-4',
      calibrationDate: '2024-01-05 (Certified)',
      temperatureLog: '19.4 °C (Within range)',
      referenceStandard: 'ISO-9001:2015 Quality Management Protocol',
      quarantineAction: '2 Defective items tagged and moved to Quarantine Cage C.',
      notes: 'Excellent batch with negligible deviation. The two failed monitors exhibited corner back-light bleed exceeding the 5% tolerance threshold. Recommended action: Proceed with storage for the 48 passed units.',
      checklist: [
        { task: 'Verifying shipment dimensions & packing slips match SIV', passed: true },
        { task: 'Physical inspection for frame fractures or screen damage', passed: true },
        { task: 'Backlight uniformity & pixel stress test run for 10 minutes', passed: true },
        { task: 'Power supply calibration and electric safety ground check', passed: true },
        { task: 'Sealing of compliant devices with verified security label tags', passed: true }
      ]
    }
  ];

  // Dynamic connected inspections
  protected readonly inspections = computed<Inspection[]>(() => {
    const reqs = this.workflowService.getAllRequests();

    const mapped = reqs.map(req => {
      // Sum requested quantity
      const totalQty = req.items.reduce((sum, it) => sum + it.quantity, 0);
      const isCompliant = req.status === 'Completed' || req.status === 'Manager Approved' || req.status === 'Admin Approved';
      
      const checklist: InspectionChecklistItem[] = req.items.flatMap(item => [
        { task: `Verify technical specifications for ${item.name}`, passed: true },
        { task: `Confirm received quantity of ${item.quantity} units for ${item.name}`, passed: true },
        { task: `Electrical integrity & circuit check for ${item.name}`, passed: isCompliant }
      ]);

      return {
        id: `insp_${req.id}`,
        inspectionNumber: `INS-${req.srNumber.replace('SR-', '')}`,
        receivingNoteNumber: `GRN-${req.srNumber.replace('SR-', '')}`,
        inspectionDate: new Date(req.submittedDate).toISOString().split('T')[0],
        inspector: req.managerName || 'System Inspector',
        status: (isCompliant ? 'Passed' : 'Pending') as 'Pending' | 'Passed' | 'Failed',
        itemsInspected: totalQty,
        itemsPassed: isCompliant ? totalQty : 0,
        itemsFailed: 0,
        supplierName: 'Global Tech Distributors Inc.',
        warehouseLocation: `Main Depot - ${req.department}`,
        calibrationDate: '2024-01-10 (Verified)',
        temperatureLog: '20.4 °C (Stable)',
        referenceStandard: 'ISO-9001 Quality Standard & Corporate Assets Directive',
        quarantineAction: isCompliant ? 'None required' : 'Held under initial warehouse review status',
        notes: `Quality assurance inspection conducted for service request ${req.srNumber} submitted by ${req.employeeName}. Justification remarks: ${req.justification}`,
        checklist
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });

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
