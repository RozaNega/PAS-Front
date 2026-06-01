import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { SafetyBoxService, SafetyBoxDto } from '../../services/safety-box.service';
import { LocationService } from '../../../locations/services/location.service';

interface SafetyBox {
  id: string;
  boxNumber: string;
  location: string;
  totalShelves: number;
  occupiedShelves: number;
  status: 'Empty' | 'Low' | 'Moderate' | 'High' | 'Full';
  description: string;
  keyCardRequired: boolean;
  biometricAccess: boolean;
  cctvMonitored: boolean;
  access247: boolean;
  accessCode: string;
  createdAt: string;
}

type ModalMode = 'add-edit' | 'detail' | 'delete' | null;

@Component({
  selector: 'app-safety-box-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './safety-box-list.component.html',
  styleUrls: ['./safety-box-list.component.scss']
})
export class SafetyBoxListComponent {
  private readonly safetyBoxService = inject(SafetyBoxService);
  private readonly locationService = inject(LocationService);

  searchTerm = signal('');
  locationFilter = signal('All');
  viewMode = signal<'grid' | 'list'>('grid');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedBox = signal<SafetyBox | null>(null);
  boxToDelete = signal<SafetyBox | null>(null);

  locationOptions = signal<string[]>(['All']);
  mockUsed = false;

  modalForm = {
    boxNumber: '',
    location: '',
    totalShelves: 12,
    description: '',
    keyCardRequired: true,
    biometricAccess: false,
    cctvMonitored: true,
    access247: true,
    accessCode: '',
  };

  formErrors = signal<Record<string, string>>({});

  safetyBoxes = signal<SafetyBox[]>([]);

  statusDistribution = computed(() => {
    const boxes = this.safetyBoxes();
    const empty = boxes.filter(b => b.status === 'Empty').length;
    const low = boxes.filter(b => b.status === 'Low').length;
    const moderate = boxes.filter(b => b.status === 'Moderate').length;
    const high = boxes.filter(b => b.status === 'High').length;
    const full = boxes.filter(b => b.status === 'Full').length;
    const total = boxes.length || 1;
    return { empty, low, moderate, high, full, total };
  });

  totalBoxes = computed(() => this.safetyBoxes().length);
  totalShelves = computed(() => this.safetyBoxes().reduce((s, b) => s + b.totalShelves, 0));
  occupiedShelves = computed(() => this.safetyBoxes().reduce((s, b) => s + b.occupiedShelves, 0));
  avgOccupancy = computed(() => {
    const boxes = this.safetyBoxes();
    if (boxes.length === 0) return 0;
    const pcts = boxes.map(b => b.totalShelves > 0 ? (b.occupiedShelves / b.totalShelves) * 100 : 0);
    return Math.round(pcts.reduce((s, p) => s + p, 0) / boxes.length);
  });
  secureBoxes = computed(() => this.safetyBoxes().filter(b => b.keyCardRequired && b.cctvMonitored).length);

  filteredBoxes = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const loc = this.locationFilter();
    return this.safetyBoxes().filter(b => {
      const matchesSearch = !search ||
        b.boxNumber.toLowerCase().includes(search) ||
        b.location.toLowerCase().includes(search);
      const matchesLocation = loc === 'All' || b.location === loc;
      return matchesSearch && matchesLocation;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBoxes().length / this.pageSize))
  );

  pagedBoxes = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredBoxes().slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      if (this.notification()) {
        setTimeout(() => this.notification.set(null), 4000);
      }
    });
    this.loadData();
  }

  private createMockBoxes(): SafetyBox[] {
    const locs = ['HQ Bole', 'Adama Office', 'Bahir Dar Campus', 'Central Warehouse', 'Finance Dept', 'HR Dept', 'IT Dept', 'Dire Dawa Branch', 'Executive Suite'];
    const statuses: ('Empty' | 'Low' | 'Moderate' | 'High' | 'Full')[] = ['Empty', 'Low', 'Moderate', 'High', 'Full'];
    const ts = '2025-05-15T10:00:00.000Z';

    return [
      { id: 'sb-001', boxNumber: 'SB-001', location: 'HQ Bole', totalShelves: 12, occupiedShelves: 8, status: 'Moderate', description: 'Main server room safety box', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: true, accessCode: 'EMP-001', createdAt: ts },
      { id: 'sb-002', boxNumber: 'SB-002', location: 'HQ Bole', totalShelves: 8, occupiedShelves: 3, status: 'Low', description: 'Network equipment storage', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: true, accessCode: 'EMP-002', createdAt: ts },
      { id: 'sb-003', boxNumber: 'SB-003', location: 'Finance Dept', totalShelves: 10, occupiedShelves: 10, status: 'Full', description: 'Financial records and cash', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: false, accessCode: 'EMP-003', createdAt: ts },
      { id: 'sb-004', boxNumber: 'SB-004', location: 'Central Warehouse', totalShelves: 6, occupiedShelves: 0, status: 'Empty', description: 'New unused safety box', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: true, accessCode: '', createdAt: ts },
      { id: 'sb-005', boxNumber: 'SB-005', location: 'HR Dept', totalShelves: 8, occupiedShelves: 5, status: 'Moderate', description: 'Personnel files storage', keyCardRequired: true, biometricAccess: false, cctvMonitored: false, access247: false, accessCode: 'EMP-005', createdAt: ts },
      { id: 'sb-006', boxNumber: 'SB-006', location: 'IT Dept', totalShelves: 6, occupiedShelves: 4, status: 'Moderate', description: 'IT equipment spares', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: true, accessCode: 'EMP-006', createdAt: ts },
      { id: 'sb-007', boxNumber: 'SB-007', location: 'Executive Suite', totalShelves: 10, occupiedShelves: 7, status: 'Moderate', description: 'Executive documents and assets', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: true, accessCode: 'EMP-007', createdAt: ts },
      { id: 'sb-008', boxNumber: 'SB-008', location: 'Adama Office', totalShelves: 8, occupiedShelves: 2, status: 'Low', description: 'Regional office storage', keyCardRequired: false, biometricAccess: false, cctvMonitored: true, access247: false, accessCode: '', createdAt: ts },
      { id: 'sb-009', boxNumber: 'SB-009', location: 'Bahir Dar Campus', totalShelves: 12, occupiedShelves: 9, status: 'High', description: 'Campus equipment storage', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: true, accessCode: 'EMP-009', createdAt: ts },
      { id: 'sb-010', boxNumber: 'SB-010', location: 'Central Warehouse', totalShelves: 10, occupiedShelves: 6, status: 'Moderate', description: 'Warehouse inventory storage', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: true, accessCode: 'EMP-010', createdAt: ts },
      { id: 'sb-011', boxNumber: 'SB-011', location: 'HQ Bole', totalShelves: 4, occupiedShelves: 4, status: 'Full', description: 'Critical spare keys cabinet', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: true, accessCode: 'EMP-011', createdAt: ts },
      { id: 'sb-012', boxNumber: 'SB-012', location: 'Finance Dept', totalShelves: 6, occupiedShelves: 1, status: 'Low', description: 'Petty cash box', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: false, accessCode: 'EMP-012', createdAt: ts },
      { id: 'sb-013', boxNumber: 'SB-013', location: 'Dire Dawa Branch', totalShelves: 8, occupiedShelves: 3, status: 'Low', description: 'Branch office secure storage', keyCardRequired: false, biometricAccess: false, cctvMonitored: false, access247: false, accessCode: '', createdAt: ts },
      { id: 'sb-014', boxNumber: 'SB-014', location: 'IT Dept', totalShelves: 6, occupiedShelves: 6, status: 'Full', description: 'Server spare parts', keyCardRequired: true, biometricAccess: true, cctvMonitored: true, access247: true, accessCode: 'EMP-014', createdAt: ts },
      { id: 'sb-015', boxNumber: 'SB-015', location: 'Central Warehouse', totalShelves: 12, occupiedShelves: 5, status: 'Moderate', description: 'General storage expansion', keyCardRequired: true, biometricAccess: false, cctvMonitored: true, access247: true, accessCode: 'EMP-015', createdAt: ts },
    ];
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.locationService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const names = response.data.map(l => l.name);
          this.locationOptions.set(['All', ...names]);
        }
      },
      error: () => {}
    });

    this.safetyBoxService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          const boxes: SafetyBox[] = response.data.map((dto: SafetyBoxDto) => ({
            id: dto.id,
            boxNumber: dto.boxNumber,
            location: dto.locationId,
            totalShelves: dto.capacity,
            occupiedShelves: dto.currentCount,
            status: this.calcStatus(dto.currentCount, dto.capacity),
            description: dto.description || '',
            keyCardRequired: false,
            biometricAccess: false,
            cctvMonitored: false,
            access247: false,
            accessCode: '',
            createdAt: new Date().toISOString(),
          }));
          this.safetyBoxes.set(boxes);
          this.page.set(1);
        } else {
          this.useMockFallback();
        }
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading safety boxes:', error);
        let msg = 'Failed to reach the server.';
        if (error instanceof HttpErrorResponse) {
          msg = error.status === 0 ? 'Cannot reach the API (network).' : `HTTP ${error.status}.`;
        }
        this.useMockFallback();
        this.notification.set({ type: 'warning', message: msg + ' Showing sample data.' });
        this.isLoading.set(false);
      },
    });
  }

  private useMockFallback(): void {
    if (this.mockUsed) return;
    this.mockUsed = true;
    const existing = this.safetyBoxes();
    const mock = this.createMockBoxes();
    if (existing.length < 3) {
      this.safetyBoxes.set(mock);
      this.page.set(1);
      this.notification.set({ type: 'info', message: 'Showing sample data. Connect to the API for live data.' });
    }
  }

  private calcStatus(count: number, capacity: number): SafetyBox['status'] {
    if (count === 0) return 'Empty';
    const pct = (count / capacity) * 100;
    if (pct <= 30) return 'Low';
    if (pct <= 60) return 'Moderate';
    if (pct <= 80) return 'High';
    return 'Full';
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onLocationFilterChange(value: string): void {
    this.locationFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.locationFilter.set('All');
    this.page.set(1);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  openAddModal(): void {
    this.selectedBox.set(null);
    this.modalForm = {
      boxNumber: 'SB-' + String(this.safetyBoxes().length + 1).padStart(3, '0'),
      location: '',
      totalShelves: 12,
      description: '',
      keyCardRequired: true,
      biometricAccess: false,
      cctvMonitored: true,
      access247: true,
      accessCode: '',
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openEditModal(box: SafetyBox): void {
    this.selectedBox.set(box);
    this.modalForm = {
      boxNumber: box.boxNumber,
      location: box.location,
      totalShelves: box.totalShelves,
      description: box.description,
      keyCardRequired: box.keyCardRequired,
      biometricAccess: box.biometricAccess,
      cctvMonitored: box.cctvMonitored,
      access247: box.access247,
      accessCode: box.accessCode,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openDetailModal(box: SafetyBox): void {
    this.selectedBox.set(box);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openDeleteModal(box: SafetyBox): void {
    this.boxToDelete.set(box);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedBox.set(null);
    this.boxToDelete.set(null);
    this.formErrors.set({});
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.boxNumber.trim()) errors['boxNumber'] = 'Box number is required';
    if (!this.modalForm.location) errors['location'] = 'Location is required';
    if (this.modalForm.totalShelves < 1) errors['totalShelves'] = 'Must have at least 1 shelf';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveBox(): void {
    if (!this.validateForm()) return;
    const data = this.modalForm;
    const editing = this.selectedBox();

    if (editing) {
      const updated: SafetyBox = {
        ...editing,
        boxNumber: data.boxNumber,
        location: data.location,
        totalShelves: data.totalShelves,
        description: data.description,
        keyCardRequired: data.keyCardRequired,
        biometricAccess: data.biometricAccess,
        cctvMonitored: data.cctvMonitored,
        access247: data.access247,
        accessCode: data.accessCode,
      };
      this.safetyBoxes.update(boxes => boxes.map(b => b.id === editing.id ? updated : b));
      this.notification.set({ type: 'success', message: `Safety box "${updated.boxNumber}" updated.` });
    } else {
      const newBox: SafetyBox = {
        id: 'sb-' + String(Date.now()).slice(-6),
        boxNumber: data.boxNumber,
        location: data.location,
        totalShelves: data.totalShelves,
        occupiedShelves: 0,
        status: 'Empty',
        description: data.description,
        keyCardRequired: data.keyCardRequired,
        biometricAccess: data.biometricAccess,
        cctvMonitored: data.cctvMonitored,
        access247: data.access247,
        accessCode: data.accessCode,
        createdAt: new Date().toISOString(),
      };
      this.safetyBoxes.update(boxes => [...boxes, newBox]);
      this.notification.set({ type: 'success', message: `Safety box "${newBox.boxNumber}" created.` });
    }
    this.closeModal();
  }

  confirmDelete(): void {
    const box = this.boxToDelete();
    if (!box) return;
    this.safetyBoxes.update(boxes => boxes.filter(b => b.id !== box.id));
    this.notification.set({ type: 'success', message: `Safety box "${box.boxNumber}" deleted.` });
    this.closeModal();
    this.page.set(1);
  }

  exportCSV(): void {
    const boxes = this.filteredBoxes();
    const header = 'Box Number,Location,Total Shelves,Occupied,Status,Description,Key Card,Biometric,CCTV,24/7,Access Code';
    const rows = boxes.map(b =>
      `"${b.boxNumber}","${b.location}",${b.totalShelves},${b.occupiedShelves},"${b.status}","${b.description}",${b.keyCardRequired},${b.biometricAccess},${b.cctvMonitored},${b.access247},"${b.accessCode}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safety-boxes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${boxes.length} safety boxes to CSV.` });
  }

  getOccupancyPct(box: SafetyBox): number {
    return box.totalShelves > 0 ? Math.round((box.occupiedShelves / box.totalShelves) * 100) : 0;
  }

  getOccupancyColor(pct: number): string {
    if (pct === 0) return '#6b7280';
    if (pct <= 30) return '#10b981';
    if (pct <= 60) return '#f59e0b';
    if (pct <= 80) return '#f97316';
    return '#ef4444';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      Empty: 'bi-box-seam',
      Low: 'bi-emoji-smile',
      Moderate: 'bi-exclamation-triangle',
      High: 'bi-exclamation-diamond',
      Full: 'bi-x-octagon',
    };
    return icons[status] || 'bi-question-circle';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      Empty: 'badge-gray',
      Low: 'badge-green',
      Moderate: 'badge-yellow',
      High: 'badge-orange',
      Full: 'badge-red',
    };
    return classes[status] || 'badge-gray';
  }

  formatNumber(value: number): string {
    return value.toLocaleString();
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  isEditing(): boolean {
    return this.selectedBox() !== null;
  }

  isMockBadge(): boolean {
    return this.mockUsed;
  }

  fieldError(field: string): string {
    return this.formErrors()[field] || '';
  }

  notificationIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'bi-check-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      error: 'bi-x-circle-fill',
      info: 'bi-info-circle-fill',
    };
    return icons[type] || 'bi-info-circle-fill';
  }

  statusPct(key: 'empty' | 'low' | 'moderate' | 'high' | 'full'): number {
    const d = this.statusDistribution();
    const map: Record<string, number> = { empty: d.empty, low: d.low, moderate: d.moderate, high: d.high, full: d.full };
    return Math.round((map[key] / d.total) * 100);
  }

  occupiedPct = computed(() => {
    const t = this.totalShelves();
    return t > 0 ? Math.round((this.occupiedShelves() / t) * 100) : 0;
  });

  securePct = computed(() => {
    const t = this.totalBoxes();
    return t > 0 ? Math.round((this.secureBoxes() / t) * 100) : 0;
  });

  fullHighPct = computed(() => {
    const d = this.statusDistribution();
    return d.total > 0 ? Math.round(((d.full + d.high) / d.total) * 100) : 0;
  });

  donutData = computed(() => {
    const d = this.statusDistribution();
    const entries = [
      { label: 'Empty', value: d.empty, color: '#6b7280' },
      { label: 'Low', value: d.low, color: '#10b981' },
      { label: 'Moderate', value: d.moderate, color: '#f59e0b' },
      { label: 'High', value: d.high, color: '#f97316' },
      { label: 'Full', value: d.full, color: '#ef4444' },
    ];
    const circumference = 2 * Math.PI * 50;
    let cum = 0;
    return entries.map(e => {
      const pct = e.value / d.total;
      const offset = cum;
      cum += pct * circumference;
      return { ...e, pct: Math.round(pct * 100), offset, circumference };
    });
  });

  readonly circumference = 2 * Math.PI * 50;

  getDonutOffset(index: number): number {
    return this.donutData()[index]?.offset ?? 0;
  }

  securityData = computed(() => {
    const boxes = this.safetyBoxes();
    return [
      { label: 'Key Card', value: boxes.filter(b => b.keyCardRequired).length, color: '#6366f1', total: boxes.length },
      { label: 'Biometric', value: boxes.filter(b => b.biometricAccess).length, color: '#8b5cf6', total: boxes.length },
      { label: 'CCTV', value: boxes.filter(b => b.cctvMonitored).length, color: '#059669', total: boxes.length },
      { label: '24/7 Access', value: boxes.filter(b => b.access247).length, color: '#0891b2', total: boxes.length },
    ];
  });

  filterByStatus(status: string | null): void {
    this.searchTerm.set('');
    this.locationFilter.set('All');
    this.page.set(1);
  }

  hasActiveFilters(): boolean {
    return this.searchTerm() !== '' || this.locationFilter() !== 'All';
  }
}
