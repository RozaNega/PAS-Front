import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { ApiService } from '../../../../core/services/api.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { ShelfLocationDto } from '../../../../core/services/shelves.service';
import {
  ItemMasterService,
  ItemMasterListDto,
} from '../../../../core/services/item-master.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { environment } from '../../../../../environments/environment';

type WizardStep = 1 | 2 | 3;
type ShelfOption = { shelfId: string; label: string; available: number };

interface NewRequestForm {
  srNumber: string;
  requester: string;
  department: string;
  requiredBy: string;
  remarks: string;
  justification: string;
  priority: string;
}

interface SelectedItem {
  itemId: string;
  name: string;
  sku: string;
  uom: string;
  available: number;
  quantity: number;
  preferredShelfId: string | null;
  preferredShelfLabel: string;
  shelfOptions: ShelfOption[];
  loadingShelves: boolean;
  notes: string;
}

@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CreateRequestComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly pasApi = inject(PasApiService);
  private readonly apiService = inject(ApiService);
  private readonly inventoryService = inject(InventoryService);
  private readonly itemMasterService = inject(ItemMasterService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly cdr = inject(ChangeDetectorRef);

  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  currentStep: WizardStep = 1;
  readonly isDev = !environment.production;
  isSeedingShelfLocation = false;

  form: NewRequestForm = {
    srNumber: '',
    requester: '',
    department: 'IT Department',
    requiredBy: '',
    remarks: '',
    justification: '',
    priority: 'Medium',
  };

  /** All available catalog items fetched from backend */
  availableItems: ItemMasterListDto[] = [];
  /** Fallback global shelf list (used when an item has no stock locations) */
  private fallbackShelves: ShelfLocationDto[] = [];

  isLoadingItems = false;
  itemLoadError = '';
  shelfLoadError = '';
  searchQuery = '';
  quickAddQuery = '';
  selectedItems: SelectedItem[] = [];
  draftSaved = false;
  submitError = '';
  isSubmitting = false;

  // ── Computed getters ─────────────────────────────────────────────────────

  get filteredItems(): ItemMasterListDto[] {
    if (!this.searchQuery.trim()) return this.availableItems;
    const q = this.searchQuery.toLowerCase();
    return this.availableItems.filter(
      (item) =>
        (item.itemName ?? '').toLowerCase().includes(q) ||
        (item.sku ?? '').toLowerCase().includes(q) ||
        (item.categoryName ?? '').toLowerCase().includes(q),
    );
  }

  get totalItems(): number {
    return this.selectedItems.length;
  }

  get totalQuantity(): number {
    return this.selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  isItemSelected(item: ItemMasterListDto): boolean {
    return this.selectedItems.some((s) => s.itemId === String(item.id));
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadAvailableItems();
    this.prefillUserInfo();
    this.restoreDraft();
    if (typeof setInterval !== 'undefined') {
      this.autoSaveInterval = setInterval(() => this.autoSaveDraft(), 30_000);
    }
  }

  /** Public retry entry-point — called from the template's Retry button. */
  loadItems(): void {
    this.loadAvailableItems();
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
    }
  }

  // ── Item loading ──────────────────────────────────────────────────────────

  private loadAvailableItems(): void {
    this.isLoadingItems = true;
    this.itemLoadError = '';
    this.shelfLoadError = '';

    // Load items and fallback shelves in parallel
    forkJoin({
      items: this.apiService.get<any>('ItemMasters', { pageSize: 200 }).pipe(
        map((res: any) => {
          // The backend may return different shapes — handle all of them
          let rawItems: any[] = [];

          // Shape 1: { data: { items: [...] } }  (paginated wrapper)
          if (res?.data?.items && Array.isArray(res.data.items)) {
            rawItems = res.data.items;
          }
          // Shape 2: { data: [...] }  (direct array in data)
          else if (Array.isArray(res?.data)) {
            rawItems = res.data;
          }
          // Shape 3: { items: [...] }  (items at root)
          else if (Array.isArray(res?.items)) {
            rawItems = res.items;
          }
          // Shape 4: top-level array
          else if (Array.isArray(res)) {
            rawItems = res;
          }

          // Normalize each item — backend may use `name` OR `itemName`
          return rawItems.map((item: any): ItemMasterListDto => {
            const rawUom =
              item.unitOfMeasure ?? item.UnitOfMeasure ?? item.uom ?? item.unit ?? item.Unit;
            const normalizedUom =
              typeof rawUom === 'string' &&
              rawUom.trim() &&
              !/^(yes|no)$/i.test(rawUom.trim())
                ? rawUom.trim()
                : 'PCS';

            const rawName = item.itemName ?? item.ItemName ?? item.name ?? item.Name;
            const itemName = typeof rawName === 'string' ? rawName : String(rawName ?? '');

            const rawSku = item.sku ?? item.Sku;
            const sku = typeof rawSku === 'string' ? rawSku : String(rawSku ?? '');

            return {
              id: item.id ?? item.itemId ?? '',
              sku,
              itemName,
              categoryId: item.categoryId ?? item.CategoryId ?? '',
              categoryName: item.categoryName ?? item.CategoryName ?? item.category ?? '',
              unitOfMeasure: normalizedUom,
              currentStock:
                item.currentStock ?? item.CurrentStock ?? item.stockQuantity ?? item.quantity ?? 0,
              availableStock:
                item.availableStock ?? item.AvailableStock ?? item.available ?? item.quantity ?? 0,
              reservedStock: item.reservedStock ?? 0,
              isLowStock: item.isLowStock ?? false,
              isActive: item.isActive ?? true,
              description: item.description ?? '',
              minStockLevel: item.minStockLevel ?? 0,
              requiresInspection: item.requiresInspection ?? false,
              stockQuantity: item.stockQuantity ?? 0,
            };
          });
        }),
        catchError(() => of([] as ItemMasterListDto[])),
      ),
      shelves: this.inventoryService.getAllShelves().pipe(
        map((res) => res.data ?? []),
        catchError((err: any) => {
          const status = err?.status ?? 0;
          if (status === 401 || status === 403) {
            this.shelfLoadError =
              'Shelf locations are not available for your account. You can still submit the request and let the storekeeper choose.';
          } else {
            this.shelfLoadError = 'Failed to load shelf locations. You can still submit the request.';
          }
          this.cdr.markForCheck();
          return of([] as ShelfLocationDto[]);
        }),
      ),
    }).subscribe({
      next: ({ items, shelves }) => {
        // Filter out inactive items
        this.availableItems = items.filter((item) => item.isActive !== false && item.id);
        this.fallbackShelves = shelves;
        this.isLoadingItems = false;

        if (this.availableItems.length === 0) {
          this.itemLoadError =
            'No items are available in the catalog right now. The backend may not have any active items yet, or the connection may be unavailable.';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingItems = false;
        this.itemLoadError =
          'Failed to load item catalog. Please check your connection and refresh the page.';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Item shelf loading (per selected item) ────────────────────────────────

  private loadShelvesForItem(selected: SelectedItem): void {
    selected.loadingShelves = true;
    this.cdr.markForCheck();

    (this.itemMasterService as any).getById(selected.itemId).subscribe({
      next: (res: any) => {
        const detail = res.data;
        const locations: any[] = detail?.stockLocations ?? [];

        if (locations.length > 0) {
          selected.shelfOptions = locations
            .filter((loc: any) => loc.availableQuantity > 0)
            .map((loc: any) => ({
              shelfId: loc.shelfId,
              label: this.buildShelfLabel(
                loc.warehouseName,
                loc.shelfLocation,
                loc.availableQuantity,
              ),
              available: loc.availableQuantity,
            }));

          // If all locations are out of stock, still show them
          if (selected.shelfOptions.length === 0) {
            selected.shelfOptions = locations.map((loc: any) => ({
              shelfId: loc.shelfId,
              label: this.buildShelfLabel(
                loc.warehouseName,
                loc.shelfLocation,
                loc.availableQuantity,
              ),
              available: loc.availableQuantity,
            }));
          }
        } else {
          // No stock locations — fall back to global shelf list
          selected.shelfOptions = this.buildFallbackOptions();
        }

        // Auto-select the shelf with most available stock
        const best = [...selected.shelfOptions].sort((a, b) => b.available - a.available)[0];
        if (best) {
          selected.preferredShelfId = best.shelfId;
          selected.preferredShelfLabel = best.label;
          selected.available = best.available;
        } else {
          selected.preferredShelfId = null;
          selected.preferredShelfLabel = 'No location selected';
        }

        selected.loadingShelves = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // Fall back to global shelves on error
        selected.shelfOptions = this.buildFallbackOptions();
        const first = selected.shelfOptions[0];
        if (first) {
          selected.preferredShelfId = first.shelfId;
          selected.preferredShelfLabel = first.label;
        }
        selected.loadingShelves = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildShelfLabel(
    warehouse: string | undefined,
    shelf: string | undefined,
    available: number,
  ): string {
    const parts: string[] = [];
    if (warehouse?.trim()) parts.push(warehouse.trim());
    if (shelf?.trim()) parts.push(shelf.trim());
    const location = parts.length > 0 ? parts.join(' › ') : 'Unassigned Shelf';
    return `${location} (${available} available)`;
  }

  private buildFallbackOptions(): ShelfOption[] {
    return this.fallbackShelves.map((shelf) => ({
      shelfId: shelf.id,
      label: this.buildFallbackShelfLabel(shelf),
      available: 0,
    }));
  }

  private buildFallbackShelfLabel(shelf: ShelfLocationDto): string {
    const parts: string[] = [];
    if (shelf.aisle) parts.push(`Aisle ${shelf.aisle}`);
    if (shelf.section) parts.push(`Section ${shelf.section}`);
    if (shelf.level) parts.push(`Level ${shelf.level}`);
    if (shelf.position) parts.push(`Pos ${shelf.position}`);
    return parts.length > 0 ? parts.join(' / ') : `Shelf ${shelf.id.slice(0, 8)}`;
  }

  seedSampleShelfLocation(item: SelectedItem): void {
    if (!this.isDev) return;
    if (this.isSeedingShelfLocation) return;

    this.isSeedingShelfLocation = true;
    this.submitError = '';
    this.cdr.markForCheck();

    const ensureShelfExists$ = this.inventoryService.getAllShelves().pipe(
      map((res) => res.data ?? []),
      catchError(() => of([] as ShelfLocationDto[])),
      switchMap((shelves) => {
        if (shelves.length > 0) return of(shelves);
        return ((this.inventoryService as any).getAllWarehouses() as Observable<any[]>).pipe(
          map((res: any) => res.data ?? []),
          catchError(() => of([])),
          switchMap((warehouses: any[]) => {
            const first = warehouses.find((w) => w?.isActive !== false) ?? warehouses[0];
            if (first?.id) return of(String(first.id));
            return ((this.inventoryService as any).createWarehouse({ name: 'Main Warehouse', location: 'HQ', isActive: true }) as Observable<any>).pipe(
              map((res: any) => String(res.data ?? '')));
          }),
          switchMap((warehouseId) => {
            if (!warehouseId) return of(null);
            return ((this.inventoryService as any).createShelf({
              warehouseId,
              aisle: 'A-01',
              rack: 'R-01',
              shelfNumber: 'S-01',
              zone: 'Z-01',
              binType: 'Standard',
              length: 0,
              width: 0,
              height: 0,
              maxWeight: 0,
              capacity: 0,
            }) as Observable<any>);
          }),
          switchMap(() =>
            this.inventoryService.getAllShelves().pipe(
              map((res) => res.data ?? []),
              catchError(() => of([] as ShelfLocationDto[])),
            ),
          ),
        );
      }),
      finalize(() => {
        this.isSeedingShelfLocation = false;
        this.cdr.markForCheck();
      }),
    );

    ensureShelfExists$.subscribe({
      next: (shelves) => {
        this.fallbackShelves = shelves;
        this.loadShelvesForItem(item);
      },
      error: (err: { error?: { message?: string; detail?: string } }) => {
        this.submitError =
          err.error?.message ?? err.error?.detail ?? 'Failed to add sample shelf location.';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Item selection ────────────────────────────────────────────────────────

  addItem(item: ItemMasterListDto): void {
    if (this.isItemSelected(item)) return;

    const rawUom = item.unitOfMeasure?.trim() || '';
    const uom = rawUom && !/^(yes|no)$/i.test(rawUom) ? rawUom : 'PCS';

    const selected: SelectedItem = {
      itemId: String(item.id),
      name: item.itemName?.trim() || 'Unknown Item',
      sku: item.sku?.trim() || String(item.id),
      uom,
      available: item.stockQuantity,
      quantity: 1,
      preferredShelfId: null,
      preferredShelfLabel: 'Loading locations...',
      shelfOptions: [],
      loadingShelves: true,
      notes: '',
    };

    this.selectedItems = [...this.selectedItems, selected];
    this.autoSaveDraft();
    this.loadShelvesForItem(selected);
    this.cdr.markForCheck();
  }

  removeItem(itemId: string): void {
    this.selectedItems = this.selectedItems.filter((item) => item.itemId !== itemId);
    this.autoSaveDraft();
    this.cdr.markForCheck();
  }

  addItemByNameOrSku(): void {
    const q = this.quickAddQuery.trim().toLowerCase();
    if (!q) return;

    const bySku = this.availableItems.find((i) => (i.sku ?? '').trim().toLowerCase() === q);
    if (bySku) {
      this.addItem(bySku);
      this.quickAddQuery = '';
      this.cdr.markForCheck();
      return;
    }

    const byName = this.availableItems.find((i) => (i.itemName ?? '').trim().toLowerCase() === q);
    if (byName) {
      this.addItem(byName);
      this.quickAddQuery = '';
      this.cdr.markForCheck();
      return;
    }

    const partial = this.availableItems.filter(
      (i) =>
        (i.itemName ?? '').toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q),
    );

    if (partial.length === 1) {
      this.addItem(partial[0]);
      this.quickAddQuery = '';
      this.cdr.markForCheck();
      return;
    }

    alert('Select an item from the suggestions (or type an exact SKU).');
  }

  onShelfChange(item: SelectedItem, shelfId: string): void {
    const nextShelfId = shelfId?.trim() ? shelfId : null;
    const chosen = nextShelfId ? item.shelfOptions.find((opt) => opt.shelfId === nextShelfId) : null;
    if (chosen) {
      item.preferredShelfId = chosen.shelfId;
      item.preferredShelfLabel = chosen.label;
      item.available = chosen.available;
    } else {
      item.preferredShelfId = null;
      item.preferredShelfLabel = 'No location selected';
      item.available = 0;
    }
    this.autoSaveDraft();
  }

  onQuantityChange(item: SelectedItem, rawValue: string): void {
    const parsed = parseInt(rawValue, 10);
    item.quantity = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    this.autoSaveDraft();
  }

  // ── Wizard navigation ─────────────────────────────────────────────────────

  nextStep(): void {
    if (this.currentStep === 1) {
      if (!this.form.srNumber.trim()) {
        alert('Please enter an SR Number.');
        return;
      }
      if (!this.form.requester.trim()) {
        alert('Please enter your name.');
        return;
      }
      if (!this.form.requiredBy) {
        alert('Please select a Required By date.');
        return;
      }
      if (!this.form.remarks.trim()) {
        alert('Please enter remarks / justification.');
        return;
      }
    }

    if (this.currentStep === 2) {
      if (this.selectedItems.length === 0) {
        alert('Please add at least one item to your request.');
        return;
      }
      const itemsStillLoadingLocations = this.selectedItems.filter((item) => item.loadingShelves);
      if (itemsStillLoadingLocations.length > 0) {
        alert('Please wait — shelf locations are still loading for some items.');
        return;
      }
      const itemsMissingShelf = this.selectedItems.filter(
        (item) => item.shelfOptions.length > 0 && !item.preferredShelfId,
      );
      if (itemsMissingShelf.length > 0) {
        alert(
          `Please select a shelf location for: ${itemsMissingShelf.map((i) => i.name).join(', ')}`,
        );
        return;
      }
    }

    if (this.currentStep < 3) {
      this.currentStep = (this.currentStep + 1) as WizardStep;
      this.autoSaveDraft();
      this.cdr.markForCheck();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as WizardStep;
      this.cdr.markForCheck();
    }
  }

  // ── Draft ─────────────────────────────────────────────────────────────────

  private prefillUserInfo(): void {
    const user = this.currentUserService.getCurrentUserValue();
    if (user) {
      if (!this.form.requester) {
        this.form.requester = user.fullName || user.username || '';
      }
      if (!this.form.department && (user as any).department) {
        this.form.department = (user as any).department;
      }
    }
  }

  private restoreDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem('serviceRequestDraft');
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        form: NewRequestForm;
        selectedItems: SelectedItem[];
        currentStep: WizardStep;
      };
      this.form = draft.form;
      // Re-build shelf options for restored items
      this.selectedItems = (draft.selectedItems ?? []).map((item) => {
        const rawShelfId = (item as any).preferredShelfId as unknown;
        const normalizedShelfId =
          typeof rawShelfId === 'string' ? (rawShelfId.trim() ? rawShelfId.trim() : null) : null;

        const rawUom = (item as any).uom as unknown;
        const normalizedUom =
          typeof rawUom === 'string' && rawUom.trim() && !/^(yes|no)$/i.test(rawUom.trim())
            ? rawUom.trim()
            : 'PCS';

        return {
          ...item,
          preferredShelfId: normalizedShelfId,
          uom: normalizedUom,
          shelfOptions: [],
          loadingShelves: true,
        };
      });
      this.currentStep = draft.currentStep ?? 1;
      this.selectedItems.forEach((item) => this.loadShelvesForItem(item));
    } catch {
      /* ignore corrupt draft */
    }
  }

  private autoSaveDraft(): void {
    if (typeof localStorage === 'undefined') return;
    const draft = {
      form: this.form,
      // strip large shelfOptions before saving
      selectedItems: this.selectedItems.map((item) => ({
        ...item,
        shelfOptions: [],
        loadingShelves: false,
      })),
      currentStep: this.currentStep,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem('serviceRequestDraft', JSON.stringify(draft));
    } catch {
      /* quota exceeded — ignore */
    }
  }

  saveDraft(): void {
    this.autoSaveDraft();
    this.draftSaved = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.draftSaved = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  submit(): void {
    if (this.currentStep !== 3) return;
    if (this.isSubmitting) return;

    this.submitError = '';
    this.isSubmitting = true;
    this.cdr.markForCheck();

    const apiPayload = {
      srNumber: this.form.srNumber?.trim() || undefined,
      items: this.selectedItems.map((item) => ({
        itemId: item.itemId,
        srDetailId: '',
        requestedQty: item.quantity,
        preferredShelfId: item.preferredShelfId ?? null,
        notes: item.notes,
      })),
      remarks: this.form.remarks || this.form.justification,
    };

    this.pasApi.createServiceRequest(apiPayload).subscribe({
      next: (response) => {
        const created = this.extractCreatedRequestMeta(response);
        const user = this.currentUserService.getCurrentUserValue();
        this.workflowService.submitRequest(
          {
            employeeId: user?.id || '',
            employeeName: this.form.requester || user?.fullName || user?.username || 'Employee',
            employeeEmail: user?.email || '',
            department: this.form.department || user?.department || '',
            managerId: this.workflowService.getAssignedManagerQueueId(),
            managerName: 'Manager',
            items: this.selectedItems.map((item) => ({
              id: item.itemId,
              name: item.name,
              description: item.name,
              quantity: item.quantity,
              category: 'General',
              specifications: item.notes,
            })),
            priority: (this.form.priority || 'Medium') as any,
            status: 'Draft' as any,
            justification: this.form.remarks || this.form.justification || 'Service request',
            requiredDate: this.form.requiredBy ? new Date(this.form.requiredBy) : new Date(),
            estimatedCost: 0,
          },
          {
            id: created.id,
            srNumber: created.srNumber || this.form.srNumber,
          },
        );

        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('serviceRequestDraft');
        }

        this.isSubmitting = false;
        this.cdr.markForCheck();
        alert('✅ Service request submitted successfully! The manager will be notified.');
        void this.router.navigate(['/employee/requests/pending']);
      },
      error: (err: { status?: number; error?: { message?: string; detail?: string } }) => {
        this.isSubmitting = false;
        const status = err.status ?? 0;
        let msg = 'Failed to submit the request. Please try again.';
        if (status === 0) msg = 'Network error — check your connection.';
        else if (status === 400) msg = `Validation error: ${err.error?.message ?? 'Invalid data.'}`;
        else if (status === 401) msg = 'Your session has expired. Please log in again.';
        else if (status === 403) msg = 'You do not have permission to submit requests.';
        else if (status === 500)
          msg = `Server error: ${err.error?.message ?? err.error?.detail ?? 'Please try again later.'}`;
        this.submitError = msg;
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? Your unsaved changes will be lost.')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('serviceRequestDraft');
      }
      void this.router.navigate(['/employee/dashboard']);
    }
  }

  private extractCreatedRequestMeta(response: unknown): { id?: string; srNumber?: string } {
    if (!response || typeof response !== 'object') return {};
    const root = response as Record<string, unknown>;
    const data = root['data'] ?? root['Data'];
    if (typeof data === 'string' && data.trim()) {
      return { id: data.trim(), srNumber: this.form.srNumber };
    }
    if (data && typeof data === 'object') {
      const row = data as Record<string, unknown>;
      const srNumber =
        row['srNumber'] ??
        row['requestNumber'] ??
        row['srNo'] ??
        row['serviceRequestNumber'] ??
        row['number'];
      return {
        id: row['id'] != null ? String(row['id']) : undefined,
        srNumber: srNumber != null ? String(srNumber) : this.form.srNumber,
      };
    }
    const id = root['id'] ?? root['Id'];
    return { id: id != null ? String(id) : undefined, srNumber: this.form.srNumber };
  }
}
