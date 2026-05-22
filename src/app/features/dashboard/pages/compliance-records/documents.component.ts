import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Document {
  id: string;
  documentName: string;
  entityType: string;
  entityId: string;
  uploadedDate: string;
  uploadedBy: string;
  fileSize: string;
  fileType: string;
  // Additional details
  hash: string;
  retentionPeriod: string;
  classification: 'Confidential' | 'Internal' | 'Public';
  uploaderIp: string;
  status: 'Verified' | 'Pending Review' | 'Archived';
  storageLocation: string;
  description: string;
  mockContent: string[];
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Document[] = [
    {
      id: 'seed-1',
      documentName: 'Disposal_Approval_001.pdf',
      entityType: 'DisposalRecord',
      entityId: 'DISP-2024-001',
      uploadedDate: '2024-01-25',
      uploadedBy: 'Officer A',
      fileSize: '2.5 MB',
      fileType: 'PDF',
      hash: 'SHA256: 8f3b23c9e8104d4f6c7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      retentionPeriod: '7 Years (Expires 2031-01-25)',
      classification: 'Confidential',
      uploaderIp: '192.168.1.104',
      status: 'Verified',
      storageLocation: 'Secure AWS S3 Bucket: /records/disposal/2024/001',
      description: 'Official authorization letter signed by Director of Asset Management approving the high-value equipment disposal protocol.',
      mockContent: [
        '--- ASSET DISPOSAL AUTHORIZATION FORM ---',
        'Reference ID: DISP-2024-001',
        'Pursuant to Section 12.4 of the Corporate Asset Disposal Policy,',
        'the listed IT Hardware at Headquarters has been evaluated and deemed',
        'obsolete. Approved for immediate secure eco-friendly recycling.',
        'Authorized Signatory: Director Henok Abera',
        'Digital Signature Stamp Checked & Verified.'
      ]
    },
    {
      id: 'seed-2',
      documentName: 'Inspection_Report_001.pdf',
      entityType: 'Inspection',
      entityId: 'INS-2024-001',
      uploadedDate: '2024-01-20',
      uploadedBy: 'Inspector B',
      fileSize: '1.2 MB',
      fileType: 'PDF',
      hash: 'SHA256: 3c9e8f9a0b1c2d3e4f5a6b7c8d9e8f3b23c9e8104d4f6c7a8b9c0d1e2f3a4b5c',
      retentionPeriod: '5 Years (Expires 2029-01-20)',
      classification: 'Internal',
      uploaderIp: '192.168.2.15',
      status: 'Verified',
      storageLocation: 'AWS S3 Cold Storage: /records/inspections/2024/INS-001',
      description: 'Comprehensive physical quality and quantitative check list on the received shipment of professional workspace monitors.',
      mockContent: [
        '--- GOODS PHYSICAL INSPECTION LOG ---',
        'Inspection Reference: INS-2024-001',
        'Batch received matches Packing Slip GRN-2024-001.',
        '50 units scrutinized under standard lighting test conditions.',
        '48 displays passed performance, color accuracy & pixel verification.',
        '2 units rejected due to corner back-light bleed & physical bezel scuffs.',
        'Report compiled by Senior Quality Assurance Inspector.'
      ]
    }
  ];

  // Dynamic connected documents
  protected readonly documents = computed<Document[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    const mapped = reqs.map(req => {
      const hashStr = `SHA256: ${this.generateSimpleHash(req.id)}`;
      return {
        id: `doc_${req.id}`,
        documentName: `Request_Report_${req.srNumber}.pdf`,
        entityType: 'ServiceRequest',
        entityId: req.id,
        uploadedDate: new Date(req.submittedDate).toISOString().split('T')[0],
        uploadedBy: req.employeeName,
        fileSize: '1.5 MB',
        fileType: 'PDF' as const,
        hash: hashStr,
        retentionPeriod: '5 Years (Expires 2029)',
        classification: (req.priority === 'Urgent' ? 'Confidential' : 'Internal') as 'Confidential' | 'Internal' | 'Public',
        uploaderIp: '192.168.2.44',
        status: (req.status === 'Completed' || req.status === 'Manager Approved' || req.status === 'Admin Approved' ? 'Verified' : 'Pending Review') as 'Verified' | 'Pending Review' | 'Archived',
        storageLocation: `Secure AWS S3 Bucket: /records/requisitions/${req.srNumber}`,
        description: `Official digital audit trail document for service request ${req.srNumber} submitted under department ${req.department}. Justification: ${req.justification}`,
        mockContent: [
          `--- SERVICE REQUEST AUDIT RECORD ---`,
          `Reference Number: ${req.srNumber}`,
          `Requester Name: ${req.employeeName}`,
          `Department Unit: ${req.department}`,
          `Priority Level: ${req.priority}`,
          `Current Status: ${req.status}`,
          `Submitted Date: ${new Date(req.submittedDate).toLocaleDateString()}`,
          `Items Requested:`,
          ...req.items.map(item => `  - ${item.name} [Qty: ${item.quantity}]`),
          `Justification Remarks:`,
          `  ${req.justification}`
        ]
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });

  readonly activeViewDoc = signal<Document | null>(null);
  readonly downloadingDocId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);

  private generateSimpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padEnd(16, 'f') + 'e8104d4f6c7a8b9c0';
  }

  onView(doc: Document): void {
    this.activeViewDoc.set(doc);
  }

  onDownload(doc: Document): void {
    if (this.downloadingDocId()) return;

    this.downloadingDocId.set(doc.id);
    this.downloadProgress.set(0);

    const interval = setInterval(() => {
      this.downloadProgress.update(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            this.downloadingDocId.set(null);
            this.downloadProgress.set(0);
            await this.triggerPdfDownload(doc);
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  }

  private async triggerPdfDownload(docItem: Document): Promise<void> {
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
    pdf.text('PAS Digital Archive - Record Management', leftMargin, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Document Ref: ${docItem.documentName}`, leftMargin, 27);

    // Section 1: Core Metadata
    cursorY = 48;
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. Core Metadata', leftMargin, cursorY);
    cursorY += 6;

    const rows = [
      { label: 'Document Name', value: docItem.documentName },
      { label: 'Entity Scope', value: `${docItem.entityType} [ID: ${docItem.entityId}]` },
      { label: 'Uploaded By', value: `${docItem.uploadedBy} (IP: ${docItem.uploaderIp})` },
      { label: 'Uploaded Date', value: docItem.uploadedDate },
      { label: 'File Size & Type', value: `${docItem.fileSize} (${docItem.fileType})` },
      { label: 'Cryptographic Hash', value: docItem.hash },
      { label: 'Security Classification', value: docItem.classification },
      { label: 'Internal Verification Status', value: docItem.status },
      { label: 'Storage Route', value: docItem.storageLocation }
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

    // Section 2: Document Description
    cursorY += 4;
    if (cursorY + 22 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('2. Description Narrative', leftMargin, cursorY);
    cursorY += 6;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    const descWrapped = pdf.splitTextToSize(docItem.description, contentWidth);
    pdf.text(descWrapped, leftMargin, cursorY);
    cursorY += (descWrapped.length * 5) + 6;

    // Section 3: Paper Contents
    if (cursorY + 30 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('3. Digits & Verification Log Output', leftMargin, cursorY);
    cursorY += 8;

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    
    // Draw box for paper log
    const boxStartY = cursorY - 2;
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(51, 65, 85);
    
    docItem.mockContent.forEach(line => {
      if (cursorY + 8 > pdf.internal.pageSize.getHeight() - 18) {
        pdf.rect(leftMargin - 2, boxStartY, contentWidth + 4, cursorY - boxStartY, 'S');
        pdf.addPage();
        cursorY = 25;
      }
      pdf.text(line, leftMargin, cursorY);
      cursorY += 6;
    });

    pdf.rect(leftMargin - 2, boxStartY, contentWidth + 4, cursorY - boxStartY - 2, 'S');

    // Footnote
    cursorY += 8;
    if (cursorY + 12 > pdf.internal.pageSize.getHeight() - 18) {
      pdf.addPage();
      cursorY = 20;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('DIGITALLY SECURED & ARCHIVED UNDER PROPERTY AUDIT SYSTEM (PAS) PROTOCOLS.', leftMargin, cursorY);

    pdf.save(`${docItem.documentName.replace('.pdf', '')}_PAS_Record.pdf`);
  }

  closeModal(): void {
    this.activeViewDoc.set(null);
  }

  getDisplayName(documentName: string): string {
    // Remove file extension for display
    return documentName.replace(/\.(pdf|doc|docx|txt|xlsx|xls)$/i, '');
  }
}
