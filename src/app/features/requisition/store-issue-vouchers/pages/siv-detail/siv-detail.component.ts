import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { SIVService } from '../../services/siv.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { StoreIssueVoucherDetail, SIV_STATUSES } from '../../models/siv.model';

@Component({
  selector: 'app-siv-detail',
  standalone: false,
  templateUrl: './siv-detail.component.html',
  styleUrls: ['./siv-detail.component.scss']
})
export class SIVDetailComponent implements OnInit {
  siv: StoreIssueVoucherDetail | null = null;
  loading = false;
  statuses = SIV_STATUSES;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private sivService: SIVService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSIV(id);
    }
  }

  loadSIV(id: string): void {
    this.loading = true;
    this.sivService.getStoreIssueVoucherById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.siv = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Failed to load Store Issue Voucher');
      }
    });
  }

  onPrint(): void {
    if (this.siv) {
      this.sivService.generateSIVPDF(this.siv.id).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `SIV_${this.siv?.sivNumber}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.notificationService.error('Failed to generate PDF');
        }
      });
    }
  }

  onApprove(): void {
    if (this.siv && this.siv.status === 'Pending') {
      this.sivService.approveSIV({ id: this.siv.id }).subscribe({
        next: () => {
          this.notificationService.success('SIV approved successfully');
          this.loadSIV(this.siv!.id);
        },
        error: () => {
          this.notificationService.error('Failed to approve SIV');
        }
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  getStatusColor(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.color || 'secondary';
  }

  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.label || status;
  }

  getStatusIcon(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj?.icon || 'fa-question-circle';
  }

  calculateTotalValue(): number {
    if (!this.siv?.items) return 0;
    return this.siv.items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  }

  get canApprove(): boolean {
    return this.siv?.status === 'Pending';
  }
}
