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
}

@Component({
  selector: 'app-pending-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-sivs.component.html',
  styleUrls: ['./pending-sivs.component.scss']
})
export class PendingSIVsComponent {
  protected readonly sivs = signal<StoreIssueVoucher[]>([
    {
      id: '1',
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

  issueSiv(id: string): void {
    if (confirm('Are you sure you want to issue this SIV?')) {
      this.sivs.update((sivs) => sivs.filter((s) => s.id !== id));
      alert('SIV has been successfully issued.');
    }
  }
}
