import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SIV {
  id: string;
  sivNumber: string;
  date: string;
  srNumber: string;
  requester: string;
}

@Component({
  selector: 'app-sivs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sivs.component.html',
  styleUrls: ['./sivs.component.scss']
})
export class SIVsComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };

  sivs = signal<SIV[]>([
    { id: '1', sivNumber: 'SIV-2024-045', date: 'Dec 15', srNumber: 'SR-2024-123', requester: 'John Doe' },
    { id: '2', sivNumber: 'SIV-2024-044', date: 'Dec 14', srNumber: 'SR-2024-122', requester: 'Sarah Smith' },
    { id: '3', sivNumber: 'SIV-2024-043', date: 'Dec 13', srNumber: 'SR-2024-120', requester: 'Lisa Wong' },
    { id: '4', sivNumber: 'SIV-2024-042', date: 'Dec 12', srNumber: 'SR-2024-118', requester: 'Mike John' },
    { id: '5', sivNumber: 'SIV-2024-041', date: 'Dec 11', srNumber: 'SR-2024-115', requester: 'John Doe' }
  ]);

  summary = signal({
    totalSIVs: 156,
    thisWeek: 23,
    thisMonth: 89,
    totalValue: 45678
  });

  showModal = signal(false);
  showPrintView = signal(false);
  selectedSIV = signal<SIV | null>(null);

  modalFormData = signal({
    selectedSR: 'SR-2024-122',
    sivNumber: 'SIV-2024-046',
    issueDate: '2024-12-15',
    issuedBy: 'John Doe (Store Officer)',
    recipientSignature: ''
  });

  openCreateModal(): void {
    this.modalFormData.set({
      selectedSR: 'SR-2024-122',
      sivNumber: 'SIV-2024-' + (this.sivs().length + 46),
      issueDate: new Date().toISOString().split('T')[0],
      issuedBy: 'John Doe (Store Officer)',
      recipientSignature: ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  openPrintView(siv: SIV): void {
    this.selectedSIV.set(siv);
    this.showPrintView.set(true);
  }

  closePrintView(): void {
    this.showPrintView.set(false);
    this.selectedSIV.set(null);
  }

  generateSIV(): void {
    console.log('Generating SIV:', this.modalFormData().sivNumber);
    this.closeModal();
  }

  printSIV(): void {
    console.log('Printing SIV:', this.selectedSIV()?.sivNumber);
  }

  downloadPDF(): void {
    console.log('Downloading PDF for:', this.selectedSIV()?.sivNumber);
  }

  emailSIV(): void {
    console.log('Emailing SIV:', this.selectedSIV()?.sivNumber);
  }
}
