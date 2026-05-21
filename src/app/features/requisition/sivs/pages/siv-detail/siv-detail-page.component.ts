import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  StoreIssueVoucherService,
  StoreIssueVoucherDetailDto,
} from '../../services/siv.service';

@Component({
  selector: 'app-siv-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="siv-detail-page p-3">
      <div class="d-flex align-items-center gap-2 mb-3">
        <button type="button" class="btn btn-outline-secondary btn-sm" (click)="goBack()">
          <i class="bi bi-arrow-left"></i> Back
        </button>
        <a routerLink="/admin/sivs" class="btn btn-outline-primary btn-sm">All SIVs</a>
      </div>

      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Loading voucher…</p>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (siv()) {
        @let v = siv()!;
        <div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 class="h5 mb-0">{{ v.sivNumber }}</h2>
              <small class="text-muted">SR {{ v.serviceRequestNumber }}</small>
            </div>
            <span class="badge bg-secondary">{{ v.status }}</span>
          </div>
          <div class="card-body row g-3">
            <div class="col-md-4">
              <div class="text-muted small">Issued to</div>
              <div>{{ v.issuedToName }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted small">Issued by</div>
              <div>{{ v.issuedByName }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted small">Department</div>
              <div>{{ v.department || '—' }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted small">Issue date</div>
              <div>{{ v.issueDate | date: 'medium' }}</div>
            </div>
            <div class="col-md-4">
              <div class="text-muted small">Items / Qty</div>
              <div>{{ v.totalItems }} / {{ v.totalQuantity }}</div>
            </div>
            @if (v.notes) {
              <div class="col-12">
                <div class="text-muted small">Notes</div>
                <div>{{ v.notes }}</div>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">Line items</div>
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>UoM</th>
                  <th class="text-end">Issued qty</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                @for (it of v.items; track it.id) {
                  <tr>
                    <td>{{ it.itemName }}</td>
                    <td>{{ it.sku }}</td>
                    <td>{{ it.unitOfMeasure }}</td>
                    <td class="text-end">{{ it.issuedQty }}</td>
                    <td>{{ it.shelfLocation || it.shelfId || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-3 d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="print()">
            <i class="bi bi-printer"></i> Print
          </button>
          <a class="btn btn-outline-primary" [routerLink]="['/admin/requisitions', v.serviceRequestId]">
            View service request
          </a>
        </div>
      }
    </div>
  `,
})
export class SivDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sivService = inject(StoreIssueVoucherService);

  readonly siv = signal<StoreIssueVoucherDetailDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('Missing SIV id');
      return;
    }
    this.sivService.getById(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          this.siv.set({ ...d, items: d.items ?? [] });
          this.error.set(null);
        } else {
          this.error.set(res.message || 'Could not load SIV');
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'error' in err
            ? String((err as { error?: { message?: string } }).error?.message ?? 'Request failed')
            : 'Request failed';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/sivs']);
  }

  print(): void {
    window.print();
  }
}
