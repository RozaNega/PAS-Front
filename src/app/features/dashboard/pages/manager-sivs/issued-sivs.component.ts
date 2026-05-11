import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
  issuedBy: string;
}

@Component({
  selector: 'app-issued-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-sivs.component.html',
  styleUrls: ['./issued-sivs.component.scss']
})
export class IssuedSIVsComponent {
  private readonly router = inject(Router);

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
    }
  ]);

  viewDetails(id: string): void {
    void this.router.navigate(['/manager/sivs/all']);
  }

  downloadPdf(sivNumber: string): void {
    alert(`Downloading PDF for ${sivNumber}...`);
  }
}
