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

  locations = signal<Array<{ id: string; name: string }>>([]);
  locationOptions = signal<string[]>(['All']);

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

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.locationService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.locations.set(response.data.map(l => ({ id: l.id, name: l.name })));
          const names = response.data.map(l => l.name);
          this.locationOptions.set(['All', ...names]);
        }
        this.loadSafetyBoxes();
      },
      error: () => {
        this.loadSafetyBoxes();
      }
    });
  }

  private loadSafetyBoxes(): void {
    this.safetyBoxService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          const locs = this.locations();
          const boxes: SafetyBox[] = response.data.map((dto: SafetyBoxDto) => ({
            id: dto.id,
            boxNumber: dto.boxNumber,
            location: locs.find(l => l.id === dto.locationId)?.name || dto.locationId,
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
          this.loadError.set('No safety boxes found');
        }
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading safety boxes:', error);
        let msg = 'Failed to reach the server.';
        if (error instanceof HttpErrorResponse) {
          msg = error.status === 0 ? 'Cannot reach the API (network).' : `HTTP ${error.status}.`;
        }
        this.loadError.set(msg);
        this.isLoading.set(false);
      },
    });
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
      location: this.getLocationNameById(box.location),
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

  private getLocationIdByName(name: string): string {
    const loc = this.locations().find(l => l.name === name);
    return loc ? loc.id : name;
  }

  private getLocationNameById(id: string): string {
    const loc = this.locations().find(l => l.id === id);
    return loc ? loc.name : id;
  }

  saveBox(): void {
    if (!this.validateForm()) return;
    const data = this.modalForm;
    const editing = this.selectedBox();
    const locationId = this.getLocationIdByName(data.location);

    if (editing) {
      this.safetyBoxService.update(editing.id, {
        boxNumber: data.boxNumber,
        locationId: locationId,
        totalShelves: data.totalShelves,
        description: data.description,
      }).subscribe({
        next: (response) => {
          if (response.success) {
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
            this.notification.set({ type: 'error', message: response.message || 'Failed to update safety box.' });
          }
          this.closeModal();
        },
        error: (error: unknown) => {
          console.error('Error updating safety box:', error);
          this.notification.set({ type: 'error', message: 'Failed to update safety box. Please try again.' });
          this.closeModal();
        },
      });
    } else {
      this.safetyBoxService.create({
        boxNumber: data.boxNumber,
        locationId: locationId,
        totalShelves: data.totalShelves,
        description: data.description,
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const newBox: SafetyBox = {
              id: response.data || 'sb-' + String(Date.now()).slice(-6),
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
          } else {
            this.notification.set({ type: 'error', message: response.message || 'Failed to create safety box.' });
          }
          this.closeModal();
        },
        error: (error: unknown) => {
          console.error('Error creating safety box:', error);
          this.notification.set({ type: 'error', message: 'Failed to create safety box. Please try again.' });
          this.closeModal();
        },
      });
    }
  }

  confirmDelete(): void {
    const box = this.boxToDelete();
    if (!box) return;
    this.safetyBoxService.delete(box.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.safetyBoxes.update(boxes => boxes.filter(b => b.id !== box.id));
          this.notification.set({ type: 'success', message: `Safety box "${box.boxNumber}" deleted.` });
        } else {
          this.notification.set({ type: 'error', message: response.message || 'Failed to delete safety box.' });
        }
        this.closeModal();
        this.page.set(1);
      },
      error: (error: unknown) => {
        console.error('Error deleting safety box:', error);
        this.notification.set({ type: 'error', message: 'Failed to delete safety box. Please try again.' });
        this.closeModal();
        this.page.set(1);
      },
    });
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
