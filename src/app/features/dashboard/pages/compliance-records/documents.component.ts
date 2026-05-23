import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

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
export class DocumentsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly documents = signal<Document[]>([]);

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.documents.set(requests.map((request) => this.toDocument(request)));
    });
  }

  private toDocument(request: ServiceRequestDto): Document {
    const requestNumber = request.requestNumber || request.id;
    return {
      id: `doc_${request.id}`,
      documentName: `Service_Request_${requestNumber}.pdf`,
      entityType: 'ServiceRequest',
      entityId: request.id,
      uploadedDate: this.toDateOnly(request.requestDate),
      uploadedBy: request.requesterName || request.requesterId,
      fileSize: 'Generated from backend record',
      fileType: 'PDF',
      hash: '',
      retentionPeriod: '',
      classification: 'Internal',
      uploaderIp: '',
      status: this.isVerified(request.status) ? 'Verified' : 'Pending Review',
      storageLocation: '',
      description: request.reason || `Backend service request record ${requestNumber}`,
      mockContent: [
        '--- SERVICE REQUEST RECORD ---',
        `Reference Number: ${requestNumber}`,
        `Requester Name: ${request.requesterName || request.requesterId}`,
        `Department: ${request.department || ''}`,
        `Item: ${request.itemName || request.itemId}`,
        `Quantity: ${request.quantity}`,
        `Current Status: ${request.status}`,
        `Request Date: ${this.toDateOnly(request.requestDate)}`,
        `Reason: ${request.reason || ''}`,
      ],
    };
  }

  private isVerified(status: string): boolean {
    const normalized = status?.toLowerCase() ?? '';
    return normalized.includes('approved') || normalized.includes('complete') || normalized.includes('issued');
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
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

