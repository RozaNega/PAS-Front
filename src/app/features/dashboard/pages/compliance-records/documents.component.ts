import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Document {
  id: string;
  documentName: string;
  entityType: string;
  entityId: string;
  uploadedDate: string;
  uploadedBy: string;
  fileSize: string;
  fileType: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent {
  protected readonly documents = signal<Document[]>([
    { id: '1', documentName: 'Disposal_Approval_001.pdf', entityType: 'DisposalRecord', entityId: 'DISP-2024-001', uploadedDate: '2024-01-25', uploadedBy: 'Officer A', fileSize: '2.5 MB', fileType: 'PDF' },
    { id: '2', documentName: 'Inspection_Report_001.pdf', entityType: 'Inspection', entityId: 'INS-2024-001', uploadedDate: '2024-01-20', uploadedBy: 'Inspector B', fileSize: '1.2 MB', fileType: 'PDF' }
  ]);
}
