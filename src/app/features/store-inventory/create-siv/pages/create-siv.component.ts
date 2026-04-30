import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Requisition {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  priority: string;
  requiredBy: string;
}

interface SIVItem {
  name: string;
  sku: string;
  requested: number;
  approved: number;
  available: number;
  quantityToIssue: number;
  shelfLocation: string;
  notes: string;
}

@Component({
  selector: 'app-create-siv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-siv.component.html',
  styleUrls: ['./create-siv.component.scss']
})
export class CreateSIVComponent {
  currentStep = signal(1);
  totalSteps = 4;

  selectedRequisition = signal<Requisition | null>(null);
  sivNumber = signal('SIV-2024-047');
  issueDate = signal('2024-12-15');
  issuedBy = signal('John Doe (Store Officer)');

  requisitions = signal<Requisition[]>([
    { id: '1', srNumber: 'SR-2024-123', requester: 'John Doe', department: 'IT', priority: 'Urgent', requiredBy: 'Dec 18' },
    { id: '2', srNumber: 'SR-2024-122', requester: 'Sarah Smith', department: 'HR', priority: 'Medium', requiredBy: 'Dec 20' },
    { id: '3', srNumber: 'SR-2024-119', requester: 'Peter Chen', department: 'Finance', priority: 'Urgent', requiredBy: 'Dec 19' },
    { id: '4', srNumber: 'SR-2024-118', requester: 'Mike Wilson', department: 'Ops', priority: 'Normal', requiredBy: 'Dec 25' }
  ]);

  sivItems = signal<SIVItem[]>([
    { name: 'USB Cables', sku: 'CAB-004', requested: 50, approved: 50, available: 55, quantityToIssue: 50, shelfLocation: 'A-03-S-02', notes: 'Pick from main shelf' },
    { name: 'A4 Paper', sku: 'PAP-005', requested: 10, approved: 10, available: 120, quantityToIssue: 10, shelfLocation: 'B-01-S-04', notes: 'Standard A4 paper' }
  ]);

  printSIV = signal(true);
  sendEmail = signal(true);
  sendSMS = signal(false);
  requireManagerSignature = signal(false);

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

  selectRequisition(req: Requisition): void {
    this.selectedRequisition.set(req);
  }

  generateSIV(): void {
    console.log('Generating SIV:', this.sivNumber());
  }

  cancel(): void {
    console.log('Cancel SIV creation');
  }

  getStepTitle(): string {
    switch(this.currentStep()) {
      case 1: return 'Select Approved Requisition';
      case 2: return 'Selected Requisition Details';
      case 3: return 'Items to Issue';
      case 4: return 'SIV Information';
      default: return '';
    }
  }
}
