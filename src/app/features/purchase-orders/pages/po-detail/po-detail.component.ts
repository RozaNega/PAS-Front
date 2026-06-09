import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseOrderService } from '../../../../core/services/purchase-order.service';
import { PurchaseOrder } from '../../../../core/models/purchase-order.model';

@Component({
  selector: 'app-po-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './po-detail.component.html',
  styleUrls: ['./po-detail.component.scss'],
})
export class PoDetailComponent implements OnInit {
  private readonly poService = inject(PurchaseOrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly po = signal<PurchaseOrder | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly rejectReason = signal('');
  readonly showRejectModal = signal(false);

  statusEquals(po: PurchaseOrder, expected: string): boolean {
    return (po.status ?? '').toLowerCase() === expected.toLowerCase();
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'req-badge--neutral';
      case 'pending approval':
        return 'req-badge--warning';
      case 'approved':
        return 'req-badge--success';
      case 'rejected':
        return 'req-badge--danger';
      case 'ordered':
        return 'req-badge--info';
      case 'received':
        return 'req-badge--primary';
      case 'completed':
        return 'req-badge--success';
      case 'cancelled':
        return 'req-badge--danger';
      default:
        return 'req-badge--neutral';
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '\u2014';
    return `$${value.toLocaleString()}`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No purchase order ID provided.');
      this.loading.set(false);
      return;
    }
    this.loadPo(id);
  }

  private loadPo(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    try {
      const found = this.poService.getById(id);
      if (found) {
        this.po.set(found);
      } else {
        this.error.set('Purchase order not found.');
      }
    } catch (err) {
      this.error.set('Failed to load purchase order.');
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/purchase-orders']);
  }

  approve(): void {
    const current = this.po();
    if (!current) return;
    this.poService.approve(current.id, current.createdBy);
    this.loadPo(current.id);
  }

  openRejectModal(): void {
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
  }

  confirmReject(): void {
    const current = this.po();
    if (!current || !this.rejectReason().trim()) return;
    this.poService.reject(current.id, current.createdBy, this.rejectReason().trim());
    this.showRejectModal.set(false);
    this.loadPo(current.id);
  }

  markOrdered(): void {
    const current = this.po();
    if (!current) return;
    this.poService.markOrdered(current.id);
    this.loadPo(current.id);
  }

  markReceived(): void {
    const current = this.po();
    if (!current) return;
    this.poService.markReceived(current.id);
    this.loadPo(current.id);
  }

  markCompleted(): void {
    const current = this.po();
    if (!current) return;
    this.poService.markCompleted(current.id);
    this.loadPo(current.id);
  }

  cancel(): void {
    const current = this.po();
    if (!current) return;
    this.poService.cancel(current.id);
    this.loadPo(current.id);
  }

  trackByItemId(index: number, item: { id: string }): string {
    return item.id;
  }
}
