import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ManagerDataService,
  ManagerSivRow as StoreIssueVoucher,
} from '../../../../core/services/manager-data.service';
import { downloadReportPdf } from '../compliance-reports/report-actions.util';

@Component({
  selector: 'app-all-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-sivs.component.html',
  styleUrls: ['./_sivs-common.scss']
})
export class AllSIVsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);
  private readonly router = inject(Router);

  protected readonly title = 'All SIVs';
  protected readonly subtitle = 'Store Issue Vouchers — complete list';
  protected readonly sivs = signal<StoreIssueVoucher[]>([]);

  protected selectedSiv = signal<StoreIssueVoucher | null>(null);
  protected showDetailsModal = signal(false);

  get totalCount(): number { return this.sivs().length; }
  get pendingCount(): number { return this.sivs().filter(s => s.status === 'Pending').length; }
  get issuedCount(): number { return this.sivs().filter(s => s.status === 'Issued').length; }
  get totalValue(): number { return this.sivs().reduce((s, v) => s + v.totalValue, 0); }

  ngOnInit(): void {
    this.managerData.getSivs().subscribe((sivs) => this.sivs.set(sivs));
  }

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  getStatusClass(s: string): string {
    return s === 'Issued' ? 'status-badge status-badge--issued' : 'status-badge status-badge--pending';
  }

  viewDetails(siv: StoreIssueVoucher): void {
    this.selectedSiv.set(siv);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedSiv.set(null);
  }

  async downloadPdf(siv: StoreIssueVoucher): Promise<void> {
    await downloadReportPdf('Store Issue Voucher', siv.sivNumber, [
      { label: 'SIV Number', value: siv.sivNumber },
      { label: 'Request Number', value: siv.requestNumber },
      { label: 'Requester', value: siv.requesterName },
      { label: 'Department', value: siv.department },
      { label: 'Status', value: siv.status },
      { label: 'Issue Date', value: siv.issueDate },
      { label: 'Issued By', value: siv.issuedBy || 'N/A' },
      { label: 'Total Items', value: siv.totalItems },
      { label: 'Total Value', value: `$${siv.totalValue.toLocaleString()}` },
      {
        label: 'Items',
        value:
          siv.items
            ?.map(
              (item) =>
                `${item.itemName} | Qty: ${item.quantity} | Unit: $${item.unitPrice.toLocaleString()} | Total: $${item.totalPrice.toLocaleString()}`,
            )
            .join('\n') || 'No items',
      },
    ]);
  }

  viewSiv(siv: StoreIssueVoucher): void {
    this.viewDetails(siv);
  }
}
