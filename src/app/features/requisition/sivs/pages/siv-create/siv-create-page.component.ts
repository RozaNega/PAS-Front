import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ServiceRequestService,
  ServiceRequestDto,
  ServiceRequestDetailDto,
} from '../../../service-requests/services/service-request.service';
import {
  StoreIssueVoucherService,
  CreateStoreIssueVoucherItemRequest,
} from '../../services/siv.service';

function isGuidString(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export interface SivDraftLine {
  srDetailId: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitOfMeasure: string;
  pendingQty: number;
  issuedQty: number;
  shelfId: string;
}

@Component({
  selector: 'app-siv-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './siv-create-page.component.html',
  styleUrls: ['./siv-create-page.component.scss'],
})
export class SivCreatePageComponent implements OnInit {
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly sivService = inject(StoreIssueVoucherService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentYear = new Date().getFullYear();

  approvedRequests = signal<ServiceRequestDto[]>([]);
  selectedSrId = signal('');
  detail = signal<ServiceRequestDetailDto | null>(null);
  draftLines = signal<SivDraftLine[]>([]);

  loadingList = signal(false);
  loadingDetail = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  notes = signal('');

  ngOnInit(): void {
    this.loadApprovedRequests();
    const pre = this.route.snapshot.queryParamMap.get('serviceRequestId');
    if (pre) {
      this.selectedSrId.set(pre);
      this.loadServiceRequestDetail(pre);
    }
  }

  loadApprovedRequests(): void {
    this.loadingList.set(true);
    this.error.set(null);
    this.serviceRequestService.getAll({ status: 'Approved' }).subscribe({
      next: (res) => {
        this.loadingList.set(false);
        if (res.success !== false && Array.isArray(res.data)) {
          this.approvedRequests.set(res.data);
        } else {
          this.error.set(res.message || 'Could not load approved service requests.');
        }
      },
      error: (err: unknown) => {
        this.loadingList.set(false);
        this.error.set(this.httpErrorMessage(err, 'Failed to load service requests.'));
      },
    });
  }

  onServiceRequestChange(id: string): void {
    this.selectedSrId.set(id);
    this.detail.set(null);
    this.draftLines.set([]);
    if (!id) return;
    this.loadServiceRequestDetail(id);
  }

  loadServiceRequestDetail(id: string): void {
    this.loadingDetail.set(true);
    this.error.set(null);
    this.serviceRequestService.getById(id).subscribe({
      next: (res) => {
        this.loadingDetail.set(false);
        if (res.success && res.data) {
          const d = res.data;
          this.detail.set(d);
          const lines: SivDraftLine[] = (d.items ?? [])
            .map((i) => {
              const requested = Number(i.requestedQty) || 0;
              const issued = Number(i.issuedQty) || 0;
              const explicitPending = Number(i.pendingQty);
              const derivedPending = Math.max(0, requested - issued);
              const pending =
                Number.isFinite(explicitPending) && explicitPending > 0
                  ? explicitPending
                  : derivedPending;
              const rawItemId = (i.itemId ?? '').toString().trim();
              const itemId = rawItemId.length ? rawItemId : i.id;
              return { i, pending, itemId };
            })
            .filter(({ pending }) => pending > 0)
            .map(({ i, pending, itemId }) => ({
              srDetailId: i.id,
              itemId,
              itemName: i.itemName ?? '—',
              sku: i.sku ?? '—',
              unitOfMeasure: i.unitOfMeasure ?? '—',
              pendingQty: pending,
              issuedQty: pending,
              shelfId: i.shelfId && isGuidString(i.shelfId) ? i.shelfId : '',
            }));
          this.draftLines.set(lines);
          if (lines.length) {
            this.error.set(null);
          } else {
            this.error.set(
              'This service request has no remaining quantity to issue (all lines are fully issued, or the SR has no line items).',
            );
          }
        } else {
          this.error.set(res.message || 'Failed to load service request.');
        }
      },
      error: (err: unknown) => {
        this.loadingDetail.set(false);
        this.error.set(this.httpErrorMessage(err, 'Failed to load service request details.'));
      },
    });
  }

  updateLineQty(index: number, value: number): void {
    const rows = [...this.draftLines()];
    const row = rows[index];
    if (!row) return;
    const n = Number.isFinite(value) ? Math.floor(value) : 0;
    row.issuedQty = Math.max(0, Math.min(row.pendingQty, n));
    rows[index] = row;
    this.draftLines.set(rows);
  }

  updateLineShelf(index: number, value: string): void {
    const rows = [...this.draftLines()];
    const row = rows[index];
    if (!row) return;
    row.shelfId = value.trim();
    rows[index] = row;
    this.draftLines.set(rows);
  }

  submit(): void {
    const d = this.detail();
    const srId = this.selectedSrId().trim();
    if (!srId) {
      this.showError('Select an approved service request from the list first.');
      return;
    }
    if (!d) {
      this.showError('Wait for the service request details to finish loading, or pick a different SR.');
      return;
    }
    const issuedToId = this.resolveIssuedToId(d);
    if (!issuedToId) {
      this.showError(
        'This service request has no requester / employee id for “issued to”. Fix the SR in the backend or map the correct field.',
      );
      return;
    }
    const items: CreateStoreIssueVoucherItemRequest[] = this.draftLines()
      .filter((l) => l.issuedQty > 0)
      .map((l) => {
        const row: CreateStoreIssueVoucherItemRequest = {
          itemId: l.itemId,
          srDetailId: l.srDetailId,
          issuedQty: l.issuedQty,
        };
        if (l.shelfId && isGuidString(l.shelfId)) {
          row.shelfId = l.shelfId;
        }
        return row;
      });
    if (!items.length) {
      this.showError(
        'Add at least one line with issue quantity greater than zero. If the table is empty, this SR has nothing left to issue.',
      );
      return;
    }
    const department = (d.department ?? 'General').trim() || 'General';
    this.submitting.set(true);
    this.error.set(null);
    this.sivService
      .create({
        serviceRequestId: srId,
        issuedToId,
        department,
        notes: this.notes().trim() || undefined,
        items,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.success !== false) {
            let newId: string | undefined;
            if (typeof res.data === 'string' && res.data.trim()) {
              newId = res.data.trim();
            } else if (res.data && typeof res.data === 'object' && 'id' in (res.data as object)) {
              const raw = (res.data as { id: unknown }).id;
              newId = raw !== undefined && raw !== null ? String(raw) : undefined;
            }
            if (newId) {
              void this.router.navigate(['/admin/sivs', newId]);
            } else {
              void this.router.navigate(['/admin/sivs'], { queryParams: { created: '1' } });
            }
          } else {
            this.showError(res.message || 'Create SIV was rejected by the server.');
          }
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.showError(this.httpErrorMessage(err, 'Create SIV failed (network or server error).'));
        },
      });
  }

  /** Backend payloads sometimes use different property names for the recipient user id. */
  private resolveIssuedToId(d: ServiceRequestDetailDto): string {
    const o = d as unknown as Record<string, unknown>;
    const candidates: unknown[] = [
      d.requesterId,
      o['requesterId'],
      o['employeeId'],
      o['requesterUserId'],
      o['userId'],
      o['createdById'],
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null) {
        const s = String(c).trim();
        if (s.length) return s;
      }
    }
    return '';
  }

  cancel(): void {
    void this.router.navigate(['/admin/sivs']);
  }

  private showError(msg: string): void {
    this.error.set(msg);
    queueMicrotask(() => {
      document.getElementById('siv-create-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private httpErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const httpErr = err as {
        error?: { message?: string; title?: string } | string;
        status?: number;
        statusText?: string;
      };
      const body = httpErr.error;
      let msg = fallback;
      if (body && typeof body === 'object') {
        if (body.message) msg = body.message;
        else if (body.title) msg = body.title;
      } else if (typeof body === 'string') {
        msg = body;
      }
      if (httpErr.status) {
        msg = `[${httpErr.status} ${httpErr.statusText ?? ''}] ${msg}`;
      }
      return msg;
    }
    return fallback;
  }
}
