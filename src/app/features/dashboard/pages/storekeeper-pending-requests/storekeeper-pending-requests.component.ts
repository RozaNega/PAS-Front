import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService, ServiceRequest } from '../../../../core/services/workflow.service';
import { ApiService } from '../../../../core/services/api.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

interface ItemStockInfo {
  itemName: string;
  sku: string;
  requestedQty: number;
  availableStock: number;
  status: 'pending' | 'available' | 'insufficient' | 'not-found';
}

interface RequestWithStock {
  request: ServiceRequest;
  expanded: boolean;
  stockChecked: boolean;
  items: ItemStockInfo[];
}

@Component({
  selector: 'app-storekeeper-pending-requests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="pending-requests">
      <header class="page-header">
        <div class="header-content">
          <h1>Pending Requests</h1>
          <p>Service requests awaiting stock verification — check availability before manager approval</p>
        </div>
        <div class="header-actions">
          <button type="button" class="action-btn secondary" (click)="loadRequests()">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </header>

      @if (notification(); as n) {
        <div class="notification" [class.success]="n.type === 'success'" [class.error]="n.type === 'error'">
          <i [class]="n.type === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill'"></i>
          <span>{{ n.message }}</span>
        </div>
      }

      @if (loading()) {
        <div class="loading">Loading requests...</div>
      }

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>SR Number</th>
              <th>Requester</th>
              <th>Department</th>
              <th>Items</th>
              <th>Priority</th>
              <th>Date</th>
              <th>Stock Status</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.request.id) {
              <tr>
                <td><span class="mono">{{ row.request.srNumber }}</span></td>
                <td>{{ row.request.employeeName }}</td>
                <td>{{ row.request.department }}</td>
                <td>
                  <button class="link-btn" (click)="toggleExpand(row)">
                    {{ row.request.items.length }} item(s) <i class="bi" [class.bi-chevron-down]="!row.expanded" [class.bi-chevron-up]="row.expanded"></i>
                  </button>
                </td>
                <td>
                  <span class="priority-tag" [style.background]="priorityColor(row.request.priority) + '18'" [style.color]="priorityColor(row.request.priority)">
                    {{ row.request.priority }}
                  </span>
                </td>
                <td class="text-nowrap">{{ row.request.submittedDate | date:'shortDate' }}</td>
                <td>
                  @if (!row.stockChecked) {
                    <span class="badge badge-secondary">Not checked</span>
                  } @else if (allAvailable(row)) {
                    <span class="badge badge-success"><i class="bi bi-check-lg"></i> Available</span>
                  } @else {
                    <span class="badge badge-danger"><i class="bi bi-x-lg"></i> Issues</span>
                  }
                </td>
                <td class="text-right">
                  @if (!row.stockChecked) {
                    <button type="button" class="action-btn primary small" (click)="checkStock(row)" [disabled]="checkingIds().has(row.request.id)">
                      <i class="bi bi-search"></i> {{ checkingIds().has(row.request.id) ? 'Checking...' : 'Check Stock' }}
                    </button>
                  } @else {
                    <div class="btn-group">
                      <button type="button" class="action-btn success small" (click)="confirmAvailable(row)" [disabled]="!allAvailable(row)">
                        <i class="bi bi-check-lg"></i> Available
                      </button>
                      <button type="button" class="action-btn danger small" (click)="confirmInsufficient(row)">
                        <i class="bi bi-x-lg"></i> Insufficient
                      </button>
                    </div>
                  }
                </td>
              </tr>
              @if (row.expanded) {
                <tr class="detail-row">
                  <td colspan="8">
                    <div class="detail-table-wrap">
                      <table class="detail-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Requested</th>
                            <th>Available</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (item of row.items; track item.itemName) {
                            <tr>
                              <td>{{ item.itemName }}</td>
                              <td><span class="mono">{{ item.sku || '—' }}</span></td>
                              <td>{{ item.requestedQty }}</td>
                              <td>{{ item.availableStock }}</td>
                              <td>
                                @if (item.status === 'pending') {
                                  <span class="badge badge-secondary">Checking...</span>
                                } @else if (item.status === 'available') {
                                  <span class="badge badge-success">Available</span>
                                } @else if (item.status === 'insufficient') {
                                  <span class="badge badge-danger">Insufficient (needs {{ item.requestedQty - item.availableStock }} more)</span>
                                } @else {
                                  <span class="badge badge-warning">Not found in inventory</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              }
            } @empty {
              <tr><td colspan="8" class="empty-state">No pending requests waiting for stock verification</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .pending-requests { padding: 24px; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    .header-content h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .header-content p { margin: 4px 0 0; color: #64748b; font-size: 0.875rem; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .action-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 6px;
      font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
    }
    .action-btn.primary { background: #3b82f6; color: #fff; }
    .action-btn.primary:hover { background: #2563eb; }
    .action-btn.success { background: #10b981; color: #fff; }
    .action-btn.success:hover { background: #059669; }
    .action-btn.danger { background: #ef4444; color: #fff; }
    .action-btn.danger:hover { background: #dc2626; }
    .action-btn.secondary { background: #f1f5f9; color: #334155; }
    .action-btn.secondary:hover { background: #e2e8f0; }
    .action-btn.small { padding: 4px 10px; font-size: 0.8rem; }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-group { display: flex; gap: 4px; }
    .notification {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem;
    }
    .notification.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .notification.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .loading { padding: 48px; text-align: center; color: #64748b; font-size: 0.9rem; }
    .table-wrap { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.05em; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .data-table td { padding: 12px 16px; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-nowrap { white-space: nowrap; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85em; letter-spacing: 0.02em; }
    .link-btn {
      background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 0.875rem; padding: 0; display: inline-flex; align-items: center; gap: 4px;
    }
    .link-btn:hover { text-decoration: underline; color: #2563eb; }
    .priority-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
    .badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-secondary { background: #f1f5f9; color: #475569; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .empty-state { text-align: center; padding: 48px; color: #94a3b8; }
    .detail-row td { padding: 0; background: #f8fafc; }
    .detail-table-wrap { padding: 12px 16px; }
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table th {
      padding: 8px 12px; text-align: left; font-size: 0.7rem; font-weight: 600; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;
    }
    .detail-table td { padding: 8px 12px; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9; }
  `]
})
export class StorekeeperPendingRequestsComponent {
  private readonly workflowService = inject(WorkflowService);
  private readonly apiService = inject(ApiService);
  private readonly currentUserService = inject(CurrentUserService);

  readonly loading = signal(false);
  readonly checkingIds = signal(new Set<string>());
  readonly notification = signal<{ type: string; message: string } | null>(null);

  readonly rows = computed<RequestWithStock[]>(() => {
    const all = this.workflowService.getAllRequests();
    const expandedIds = new Set(this._expandedIds());
    const stockMap = this._stockMap();
    return all
      .filter(r => r.status === 'Submitted' || r.status === 'Under Review')
      .map(r => {
        const existing = stockMap.get(r.id);
        return {
          request: r,
          expanded: expandedIds.has(r.id),
          stockChecked: existing !== undefined,
          items: existing ?? r.items.map(i => ({
            itemName: i.name,
            sku: (i as any).sku || '',
            requestedQty: i.quantity,
            availableStock: 0,
            status: 'pending' as const,
          })),
        };
      });
  });

  private readonly _expandedIds = signal(new Set<string>());
  private readonly _stockMap = signal(new Map<string, ItemStockInfo[]>());

  loadRequests(): void {
    // Force recompute — computed signal auto-tracks get all requesets.
  }

  toggleExpand(row: RequestWithStock): void {
    const set = new Set(this._expandedIds());
    if (set.has(row.request.id)) {
      set.delete(row.request.id);
    } else {
      set.add(row.request.id);
    }
    this._expandedIds.set(set);
  }

  checkStock(row: RequestWithStock): void {
    const ids = new Set(this.checkingIds());
    ids.add(row.request.id);
    this.checkingIds.set(ids);

    this.apiService.get<any>('ItemMasters', { pageSize: 200 }).subscribe({
      next: (res) => {
        const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        const stockInfo: ItemStockInfo[] = row.request.items.map(reqItem => {
          const match = items.find((inv: any) =>
            String(inv.id) === String(reqItem.id) ||
            String(inv.itemName)?.toLowerCase() === String(reqItem.name)?.toLowerCase() ||
            String(inv.sku)?.toLowerCase() === String(reqItem.name)?.toLowerCase()
          );
          if (!match) {
            return {
              itemName: reqItem.name,
              sku: '',
              requestedQty: reqItem.quantity,
              availableStock: 0,
              status: 'not-found' as const,
            };
          }
          const available = Number(match.availableStock ?? match.currentStock ?? match.stockQuantity ?? 0);
          return {
            itemName: match.itemName || match.name || reqItem.name,
            sku: match.sku || '',
            requestedQty: reqItem.quantity,
            availableStock: available,
            status: available >= reqItem.quantity ? 'available' : 'insufficient',
          };
        });

        const map = new Map(this._stockMap());
        map.set(row.request.id, stockInfo);
        this._stockMap.set(map);

        const cids = new Set(this.checkingIds());
        cids.delete(row.request.id);
        this.checkingIds.set(cids);

        row.items = stockInfo;
        row.stockChecked = true;
      },
      error: () => {
        this.notification.set({ type: 'error', message: 'Failed to load inventory data' });
        const cids = new Set(this.checkingIds());
        cids.delete(row.request.id);
        this.checkingIds.set(cids);
      },
    });
  }

  confirmAvailable(row: RequestWithStock): void {
    const storekeeperName = this.storekeeperName();
    this.workflowService.confirmStockAvailable(row.request.id, storekeeperName, 'Stock verified as available');
    this.notification.set({ type: 'success', message: `Stock marked available for ${row.request.srNumber}` });
  }

  confirmInsufficient(row: RequestWithStock): void {
    const notes = prompt('Enter notes about insufficient stock:');
    if (notes === null) return;
    const storekeeperName = this.storekeeperName();
    this.workflowService.confirmStockInsufficient(row.request.id, storekeeperName, notes || undefined);
    this.notification.set({ type: 'error', message: `Stock marked insufficient for ${row.request.srNumber}` });
  }

  allAvailable(row: RequestWithStock): boolean {
    return row.items.length > 0 && row.items.every(i => i.status === 'available');
  }

  priorityColor(p: string): string {
    const map: Record<string, string> = { Urgent: '#ef4444', High: '#f97316', Medium: '#eab308', Normal: '#3b82f6', Low: '#64748b' };
    return map[p] || '#64748b';
  }

  private storekeeperName(): string {
    return this.currentUserService.getCurrentUserValue()?.fullName || 'Storekeeper';
  }
}
