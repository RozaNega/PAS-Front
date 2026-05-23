import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ManagerDataService,
  ManagerSivRow as StoreIssueVoucher,
} from '../../../../core/services/manager-data.service';
import { downloadReportPdf } from '../compliance-reports/report-actions.util';

@Component({
  selector: 'app-issued-sivs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-sivs.component.html',
  styleUrls: ['./issued-sivs.component.scss']
})
export class IssuedSIVsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly managerData = inject(ManagerDataService);

  protected readonly sivs = signal<StoreIssueVoucher[]>([]);

  protected selectedSiv = signal<StoreIssueVoucher | null>(null);
  protected showDetailsModal = signal(false);

  ngOnInit(): void {
    this.managerData
      .getSivs()
      .subscribe((sivs) => this.sivs.set(sivs.filter((siv) => siv.status === 'Issued')));
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
    ]);
  }
}
