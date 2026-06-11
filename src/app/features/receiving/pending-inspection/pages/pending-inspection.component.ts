import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InspectionsService, InspectionDto } from '../../../../core/services/inspections.service';

export interface InspectionChecklist {
  packaging: boolean;
  physicalCondition: boolean;
  serialNumbers: boolean;
  accessories: boolean;
  powerOnTest: boolean;
}

export interface InspectItem {
  itemName: string;
  quantity: number;
  batchNumber: string;
  status: string;
}

export interface PendingInspection {
  id: string;
  grnNumber: string;
  supplierName: string;
  receivedDate: string;
  priority: 'High' | 'Medium' | 'Low';
  itemsToInspect: number;
  items: InspectItem[];
  status: 'Pending' | 'In Progress';
}

export interface InspectFormItem extends InspectItem {
  result: 'Pass' | 'Fail' | 'Partial';
  comments: string;
  checklist: InspectionChecklist;
}

export interface InspectForm {
  inspectorName: string;
  inspectionDate: string;
  items: InspectFormItem[];
  disposition: string;
  generalComments: string;
}



@Component({
  selector: 'app-pending-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-inspection.component.html',
  styleUrls: ['./pending-inspection.component.scss'],
})
export class PendingInspectionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly inspectionsService = inject(InspectionsService);

  searchTerm = signal('');
  priorityFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);

  pendingInspections = signal<PendingInspection[]>([]);
  totalItems = signal(0);

  selectedIds = signal<Set<string>>(new Set());

  showInspectModal = signal(false);
  selectedInspection = signal<PendingInspection | null>(null);
  inspectForm = signal<InspectForm | null>(null);

  showDeleteConfirm = signal(false);
  deleteTarget = signal<PendingInspection | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  summaryStats = computed(() => {
    const all = this.pendingInspections();
    return {
      total: all.length,
      highPriority: all.filter(p => p.priority === 'High').length,
      mediumPriority: all.filter(p => p.priority === 'Medium').length,
      lowPriority: all.filter(p => p.priority === 'Low').length,
      inProgress: all.filter(p => p.status === 'In Progress').length,
    };
  });

  filteredPending = computed(() => {
    let result = [...this.pendingInspections()];
    const q = this.searchTerm().toLowerCase().trim();
    if (q) {
      result = result.filter(p =>
        p.grnNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q)
      );
    }
    if (this.priorityFilter() !== 'All') {
      result = result.filter(p => p.priority === this.priorityFilter());
    }
    return result;
  });

  pagedPending = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredPending().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPending().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredPending().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inspectionsService.getAll().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data?.items) && res.data.items.length > 0) {
          this.pendingInspections.set(this.mapToPendingInspections(res.data.items));
          this.totalItems.set(res.data.totalCount);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private mapToPendingInspections(dtos: InspectionDto[]): PendingInspection[] {
    return dtos.map(dto => ({
      id: dto.id,
      grnNumber: dto.grnNumber ?? '',
      supplierName: dto.inspectorName ?? 'Unknown Supplier',
      receivedDate: dto.inspectionDate,
      priority: 'Medium' as const,
      itemsToInspect: dto.items.length,
      items: dto.items.map(item => ({
        itemName: item.itemName ?? 'Unknown Item',
        quantity: item.receivedQuantity,
        batchNumber: item.sku ?? '',
        status: item.isPassed ? 'Passed' : 'Pending',
      })),
      status: this.mapInspectionStatus(dto.status),
    }));
  }

  private mapInspectionStatus(status?: string): 'Pending' | 'In Progress' {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (s.includes('in progress') || s.includes('ongoing')) return 'In Progress';
    return 'Pending';
  }

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onPriorityFilter(e: Event): void {
    this.priorityFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.priorityFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  selectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.pagedPending().map(p => p.id)));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  bulkInspect(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const first = this.pendingInspections().find(p => p.id === ids[0]);
    if (first) {
      this.startInspection(first);
    }
  }

  bulkRelease(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.pendingInspections.update(list =>
      list.map(p => ids.includes(p.id) ? { ...p, status: 'Pending' as const } : p)
    );
    this.notification.set({ type: 'success', message: `${ids.length} GRN(s) approved for release.` });
    this.selectedIds.set(new Set());
    this.autoDismissNotification();
  }

  startInspection(inspection: PendingInspection): void {
    this.selectedInspection.set(inspection);
    const today = new Date().toISOString().split('T')[0];
    const formItems: InspectFormItem[] = inspection.items.map(item => ({
      ...item,
      result: 'Pass',
      comments: '',
      checklist: {
        packaging: true,
        physicalCondition: true,
        serialNumbers: true,
        accessories: true,
        powerOnTest: true,
      },
    }));
    this.inspectForm.set({
      inspectorName: '',
      inspectionDate: today,
      items: formItems,
      disposition: 'Return to Supplier',
      generalComments: '',
    });
    this.showInspectModal.set(true);
  }

  closeInspectModal(): void {
    this.showInspectModal.set(false);
    this.selectedInspection.set(null);
    this.inspectForm.set(null);
  }

  onInspectorNameChange(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.inspectForm.update(f => f ? { ...f, inspectorName: value } : null);
  }

  onInspectionDateChange(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.inspectForm.update(f => f ? { ...f, inspectionDate: value } : null);
  }

  onGeneralCommentsChange(e: Event): void {
    const value = (e.target as HTMLTextAreaElement).value;
    this.inspectForm.update(f => f ? { ...f, generalComments: value } : null);
  }

  onDispositionChange(disposition: string): void {
    this.inspectForm.update(f => f ? { ...f, disposition } : null);
  }

  onChecklistChange(itemIndex: number, field: keyof InspectionChecklist, e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.inspectForm.update(f => {
      if (!f) return null;
      const items = [...f.items];
      items[itemIndex] = {
        ...items[itemIndex],
        checklist: { ...items[itemIndex].checklist, [field]: checked },
      };
      return { ...f, items };
    });
  }

  onItemResultChange(itemIndex: number, result: 'Pass' | 'Fail' | 'Partial'): void {
    this.inspectForm.update(f => {
      if (!f) return null;
      const items = [...f.items];
      items[itemIndex] = { ...items[itemIndex], result };
      return { ...f, items };
    });
  }

  onItemCommentsChange(itemIndex: number, e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this.inspectForm.update(f => {
      if (!f) return null;
      const items = [...f.items];
      items[itemIndex] = { ...items[itemIndex], comments: value };
      return { ...f, items };
    });
  }

  saveInspection(): void {
    const inspection = this.selectedInspection();
    const form = this.inspectForm();
    if (!inspection || !form) return;

    this.pendingInspections.update(list =>
      list.map(p => p.id === inspection.id
        ? { ...p, status: 'In Progress' as const }
        : p
      )
    );
    this.notification.set({ type: 'success', message: `Inspection saved for ${inspection.grnNumber}` });
    this.closeInspectModal();
    this.autoDismissNotification();
  }

  viewGrn(id: string): void {
    void this.router.navigate(['/admin/receiving/grn'], { queryParams: { id } });
  }

  confirmReturnToSupplier(inspection: PendingInspection): void {
    this.deleteTarget.set(inspection);
    this.showDeleteConfirm.set(true);
  }

  cancelReturnToSupplier(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  executeReturnToSupplier(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.pendingInspections.update(list => list.filter(p => p.id !== target.id));
    this.notification.set({ type: 'success', message: `${target.grnNumber} marked as Return to Supplier` });
    this.cancelReturnToSupplier();
    this.autoDismissNotification();
  }

  private autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }
}
