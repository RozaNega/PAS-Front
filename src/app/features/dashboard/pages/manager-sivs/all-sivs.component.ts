import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  styleUrls: ['./all-sivs.component.scss']
})
export class AllSIVsComponent implements OnInit {
  private readonly managerData = inject(ManagerDataService);

  protected readonly sivs = signal<StoreIssueVoucher[]>([]);

  protected selectedSiv = signal<StoreIssueVoucher | null>(null);
  protected showDetailsModal = signal(false);

  ngOnInit(): void {
    this.managerData.getSivs().subscribe((sivs) => this.sivs.set(sivs));
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
