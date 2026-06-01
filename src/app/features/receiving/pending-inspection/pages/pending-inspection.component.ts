import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

const MOCK_PENDING: PendingInspection[] = [
  { id: '1', grnNumber: 'GRN-2024-001', supplierName: 'Acme Corporation', receivedDate: '2024-12-10T08:30:00Z', priority: 'High', itemsToInspect: 4, items: [{ itemName: 'Industrial Bearings', quantity: 50, batchNumber: 'B-4521', status: 'Pending' }, { itemName: 'Steel Rods 12mm', quantity: 200, batchNumber: 'SR-8890', status: 'Pending' }, { itemName: 'Hydraulic Seals', quantity: 30, batchNumber: 'HS-3341', status: 'Pending' }, { itemName: 'Pressure Gauges', quantity: 15, batchNumber: 'PG-7723', status: 'Pending' }], status: 'Pending' },
  { id: '2', grnNumber: 'GRN-2024-002', supplierName: 'GlobalTech Industries', receivedDate: '2024-12-11T10:15:00Z', priority: 'Medium', itemsToInspect: 2, items: [{ itemName: 'Circuit Boards v3', quantity: 100, batchNumber: 'CB-X220', status: 'Pending' }, { itemName: 'Power Supply Units', quantity: 50, batchNumber: 'PS-4412', status: 'Pending' }], status: 'Pending' },
  { id: '3', grnNumber: 'GRN-2024-003', supplierName: 'Prime Supplies Inc', receivedDate: '2024-12-12T14:45:00Z', priority: 'Low', itemsToInspect: 1, items: [{ itemName: 'Office Stationery Pack', quantity: 500, batchNumber: 'OS-1001', status: 'Pending' }], status: 'Pending' },
  { id: '4', grnNumber: 'GRN-2024-004', supplierName: 'Allied Parts Co', receivedDate: '2024-12-13T06:00:00Z', priority: 'High', itemsToInspect: 5, items: [{ itemName: 'Fuel Injectors', quantity: 40, batchNumber: 'FI-9012', status: 'Pending' }, { itemName: 'Air Filters', quantity: 80, batchNumber: 'AF-5530', status: 'Pending' }, { itemName: 'Oil Pumps', quantity: 25, batchNumber: 'OP-6789', status: 'Pending' }, { itemName: 'Gasket Sets', quantity: 60, batchNumber: 'GS-2345', status: 'Pending' }, { itemName: 'Timing Belts', quantity: 35, batchNumber: 'TB-7890', status: 'Pending' }], status: 'Pending' },
  { id: '5', grnNumber: 'GRN-2024-005', supplierName: 'Northern Distributors Ltd', receivedDate: '2024-12-14T09:20:00Z', priority: 'Medium', itemsToInspect: 3, items: [{ itemName: 'Safety Helmets', quantity: 150, batchNumber: 'SH-6650', status: 'Pending' }, { itemName: 'Protective Gloves', quantity: 300, batchNumber: 'PG-1123', status: 'Pending' }, { itemName: 'Safety Goggles', quantity: 100, batchNumber: 'SG-9987', status: 'Pending' }], status: 'Pending' },
  { id: '6', grnNumber: 'GRN-2024-006', supplierName: 'QuickShip Logistics', receivedDate: '2024-12-15T11:00:00Z', priority: 'Low', itemsToInspect: 2, items: [{ itemName: 'Packing Materials', quantity: 1000, batchNumber: 'PM-4432', status: 'Pending' }, { itemName: 'Label Rolls', quantity: 50, batchNumber: 'LR-7765', status: 'Pending' }], status: 'Pending' },
  { id: '7', grnNumber: 'GRN-2024-007', supplierName: 'Precision Tools Ltd', receivedDate: '2024-12-16T07:45:00Z', priority: 'High', itemsToInspect: 6, items: [{ itemName: 'Digital Calipers', quantity: 20, batchNumber: 'DC-3344', status: 'Pending' }, { itemName: 'Micrometer Sets', quantity: 15, batchNumber: 'MS-5566', status: 'Pending' }, { itemName: 'Torque Wrenches', quantity: 10, batchNumber: 'TW-7788', status: 'Pending' }, { itemName: 'Dial Gauges', quantity: 12, batchNumber: 'DG-9900', status: 'Pending' }, { itemName: 'Vernier Scales', quantity: 25, batchNumber: 'VS-2233', status: 'Pending' }, { itemName: 'Test Indicators', quantity: 8, batchNumber: 'TI-4455', status: 'Pending' }], status: 'In Progress' },
  { id: '8', grnNumber: 'GRN-2024-008', supplierName: 'Eastern Traders Corp', receivedDate: '2024-12-17T13:30:00Z', priority: 'Medium', itemsToInspect: 3, items: [{ itemName: 'Copper Wire Spools', quantity: 40, batchNumber: 'CW-6677', status: 'Pending' }, { itemName: 'Aluminum Sheets', quantity: 60, batchNumber: 'AS-8899', status: 'Pending' }, { itemName: 'Brass Fittings', quantity: 200, batchNumber: 'BF-0011', status: 'Pending' }], status: 'Pending' },
  { id: '9', grnNumber: 'GRN-2024-009', supplierName: 'Western Wholesale', receivedDate: '2024-12-18T15:10:00Z', priority: 'Low', itemsToInspect: 1, items: [{ itemName: 'Cleaning Chemicals', quantity: 75, batchNumber: 'CC-3322', status: 'Pending' }], status: 'Pending' },
  { id: '10', grnNumber: 'GRN-2024-010', supplierName: 'City Materials Corp', receivedDate: '2024-12-19T08:00:00Z', priority: 'High', itemsToInspect: 4, items: [{ itemName: 'Cement Bags 50kg', quantity: 500, batchNumber: 'CB-5544', status: 'Pending' }, { itemName: 'Steel Rebars 16mm', quantity: 300, batchNumber: 'SR-6677', status: 'Pending' }, { itemName: 'Clay Bricks', quantity: 2000, batchNumber: 'BR-8890', status: 'Pending' }, { itemName: 'Construction Sand', quantity: 10000, batchNumber: 'CS-9901', status: 'Pending' }], status: 'Pending' },
  { id: '11', grnNumber: 'GRN-2024-011', supplierName: 'BlueLine Supply Co', receivedDate: '2024-12-20T10:30:00Z', priority: 'Medium', itemsToInspect: 2, items: [{ itemName: 'LED Panel Lights', quantity: 60, batchNumber: 'LP-1122', status: 'Pending' }, { itemName: 'Electrical Cables', quantity: 500, batchNumber: 'EC-3344', status: 'Pending' }], status: 'Pending' },
  { id: '12', grnNumber: 'GRN-2024-012', supplierName: 'Apex Industrial Parts', receivedDate: '2024-12-21T09:15:00Z', priority: 'Medium', itemsToInspect: 3, items: [{ itemName: 'Conveyor Rollers', quantity: 30, batchNumber: 'CR-5566', status: 'Pending' }, { itemName: 'Drive Chains', quantity: 20, batchNumber: 'DC-7788', status: 'Pending' }, { itemName: 'Motor Mounts', quantity: 45, batchNumber: 'MM-9900', status: 'Pending' }], status: 'Pending' },
];

@Component({
  selector: 'app-pending-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-inspection.component.html',
  styleUrls: ['./pending-inspection.component.scss'],
})
export class PendingInspectionComponent implements OnInit {
  private readonly router = inject(Router);

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

  useMockData = signal(true);

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
    try {
      this.pendingInspections.set(MOCK_PENDING);
      this.totalItems.set(MOCK_PENDING.length);
      this.loading.set(false);
    } catch {
      this.error.set('Failed to load pending inspections');
      this.loading.set(false);
    }
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
