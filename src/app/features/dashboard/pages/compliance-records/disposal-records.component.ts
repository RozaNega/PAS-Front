import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DisposalRecord {
  id: string;
  disposalNumber: string;
  propertyCode: string;
  disposalDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  disposalReason: string;
  estimatedValue: number;
}

@Component({
  selector: 'app-disposal-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposal-records.component.html',
  styleUrls: ['./disposal-records.component.scss']
})
export class DisposalRecordsComponent {
  protected readonly records = signal<DisposalRecord[]>([
    { id: '1', disposalNumber: 'DISP-2024-001', propertyCode: 'PROP-001', disposalDate: '2024-01-25', status: 'Pending', disposalReason: 'End of life', estimatedValue: 5000 }
  ]);
}
