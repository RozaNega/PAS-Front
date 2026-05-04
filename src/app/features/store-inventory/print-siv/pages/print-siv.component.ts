import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SIV {
  sivNumber: string;
  date: string;
  requester: string;
  department: string;
  totalItems: number;
  totalValue: number;
}

@Component({
  selector: 'app-print-siv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-siv.component.html',
  styleUrls: ['./print-siv.component.scss']
})
export class PrintSIVComponent {
  currentStep = signal(1);
  totalSteps = 3;

  selectedSIV = signal<SIV | null>(null);
  sivs = signal<SIV[]>([
    { sivNumber: 'SIV-2024-045', date: 'Dec 15, 2024', requester: 'John Doe', department: 'IT', totalItems: 3, totalValue: 5348 },
    { sivNumber: 'SIV-2024-044', date: 'Dec 14, 2024', requester: 'Sarah Smith', department: 'HR', totalItems: 2, totalValue: 900 },
    { sivNumber: 'SIV-2024-043', date: 'Dec 14, 2024', requester: 'Peter Chen', department: 'Finance', totalItems: 2, totalValue: 1500 },
    { sivNumber: 'SIV-2024-042', date: 'Dec 13, 2024', requester: 'Mike Wilson', department: 'Ops', totalItems: 2, totalValue: 250 }
  ]);

  copies = signal(1);
  paperSize = signal('A4');
  orientation = signal('Portrait');
  color = signal('Color');

  includeLetterhead = signal(true);
  showSignatures = signal(true);
  includeReturnPolicy = signal(false);
  includeQRCode = signal(false);

  showBatchPrintModal = signal(false);

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  selectSIV(siv: SIV): void {
    this.selectedSIV.set(siv);
  }

  printSIV(): void {
    console.log('Printing SIV:', this.selectedSIV()?.sivNumber);
  }

  downloadPDF(): void {
    console.log('Downloading PDF:', this.selectedSIV()?.sivNumber);
  }

  previewFullPage(): void {
    console.log('Preview full page');
  }

  cancel(): void {
    console.log('Cancel print');
  }

  openBatchPrintModal(): void {
    this.showBatchPrintModal.set(true);
  }

  closeBatchPrintModal(): void {
    this.showBatchPrintModal.set(false);
  }

  printAll(): void {
    console.log('Print all selected SIVs');
  }

  getStepTitle(): string {
    switch(this.currentStep()) {
      case 1: return 'Select SIV';
      case 2: return 'Selected SIV Details';
      case 3: return 'Print Options';
      default: return '';
    }
  }
}
