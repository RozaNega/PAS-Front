import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StoreIssueVoucher {
  id: string;
  sivNumber: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  status: 'Pending' | 'Issued';
  issueDate: string;
  totalItems: number;
  totalValue: number;
  issuedBy?: string;
}

@Component({
  selector: 'app-all-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-sivs.component.html',
  styleUrls: ['./all-sivs.component.scss']
})
export class AllSIVsComponent {
  protected readonly sivs = signal<StoreIssueVoucher[]>([
    {
      id: '1',
      sivNumber: 'SIV-2024-001',
      requestNumber: 'SR-2024-001',
      requesterName: 'John Doe',
      department: 'IT',
      status: 'Issued',
      issueDate: '2024-01-20',
      totalItems: 3,
      totalValue: 5348,
      issuedBy: 'Storekeeper'
    },
    {
      id: '2',
      sivNumber: 'SIV-2024-002',
      requestNumber: 'SR-2024-002',
      requesterName: 'Peter Chen',
      department: 'Operations',
      status: 'Pending',
      issueDate: '2024-01-21',
      totalItems: 1,
      totalValue: 2800
    }
  ]);
}
