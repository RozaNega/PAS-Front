import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Rejection {
  id: string;
  requestNumber: string;
  rejecter: string;
  department: string;
  rejectionDate: string;
  value: number;
  reason: string;
}

@Component({
  selector: 'app-rejection-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejection-analysis.component.html',
  styleUrls: ['./rejection-analysis.component.scss']
})
export class RejectionAnalysisComponent {
  protected readonly rejections = signal<Rejection[]>([
    { id: '1', requestNumber: 'SR-2024-004', rejecter: 'Manager B', department: 'Finance', rejectionDate: '2024-01-19', value: 1200, reason: 'Budget exceeded' }
  ]);
}
