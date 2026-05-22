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
  items?: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
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
      issuedBy: 'Storekeeper',
      items: [
        { itemName: 'Dell Laptop', quantity: 2, unitPrice: 1200, totalPrice: 2400 },
        { itemName: 'Wireless Mouse', quantity: 5, unitPrice: 25, totalPrice: 125 },
        { itemName: 'USB Cable', quantity: 10, unitPrice: 15, totalPrice: 150 }
      ]
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
      totalValue: 2800,
      items: [
        { itemName: 'HP Printer', quantity: 1, unitPrice: 2800, totalPrice: 2800 }
      ]
    }
  ]);

  protected selectedSiv = signal<StoreIssueVoucher | null>(null);
  protected showDetailsModal = signal(false);

  viewDetails(siv: StoreIssueVoucher): void {
    this.selectedSiv.set(siv);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedSiv.set(null);
  }

  downloadPdf(siv: StoreIssueVoucher): void {
    console.log('Downloading PDF for:', siv.sivNumber);
    
    // Create a simple PDF-like content
    const content = `
      STORE ISSUE VOUCHER
      ==================
      
      SIV Number: ${siv.sivNumber}
      Request Number: ${siv.requestNumber}
      Requester: ${siv.requesterName}
      Department: ${siv.department}
      Status: ${siv.status}
      Issue Date: ${siv.issueDate}
      ${siv.issuedBy ? `Issued By: ${siv.issuedBy}` : ''}
      
      ITEMS:
      ------
      ${siv.items?.map(item => 
        `${item.itemName} - Qty: ${item.quantity} - Unit Price: $${item.unitPrice} - Total: $${item.totalPrice}`
      ).join('\n      ') || 'No items'}
      
      Total Items: ${siv.totalItems}
      Total Value: $${siv.totalValue.toLocaleString()}
    `;

    // Create a blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${siv.sivNumber}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    alert(`Downloaded ${siv.sivNumber} as text file. In production, this would be a PDF.`);
  }

  viewSiv(siv: StoreIssueVoucher): void {
    this.viewDetails(siv);
  }
}
