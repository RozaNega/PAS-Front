import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';

echarts.use([BarChart, PieChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  address: string;
  city: string;
  country: string;
  items: number;
  value: number;
  capacity: number;
  occupancy: number;
  shelfCount: number;
  status: 'Active' | 'Limited' | 'Inactive';
  managerName: string;
  contactNumber: string;
  contactEmail: string;
  createdAt: string;
  description: string;
}

type ModalMode = 'add-edit' | 'detail' | 'delete' | null;

interface ShelfInfo {
  label: string;
  items: number;
  occupancy: number;
}

@Component({
  selector: 'app-warehouses',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.component.scss']
})
export class WarehousesComponent {
  private readonly warehousesService = inject(WarehousesService);

  searchTerm = signal('');
  statusFilter = signal('All');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedWarehouse = signal<Warehouse | null>(null);
  warehouseToDelete = signal<Warehouse | null>(null);

  statuses = ['All', 'Active', 'Limited', 'Inactive'];
  mockUsed = false;

  modalForm = {
    warehouseName: '',
    locationCode: '',
    address: '',
    city: '',
    country: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    isActive: true,
  };

  formErrors = signal<Record<string, string>>({});
  warehouses = signal<Warehouse[]>([]);
  bulkSelection = signal<Set<string>>(new Set());

  statusDistribution = computed(() => {
    const whs = this.warehouses();
    const active = whs.filter(w => w.status === 'Active').length;
    const limited = whs.filter(w => w.status === 'Limited').length;
    const inactive = whs.filter(w => w.status === 'Inactive').length;
    const total = whs.length || 1;
    return { active, limited, inactive, total };
  });

  totalWarehouses = computed(() => this.warehouses().length);
  totalItems = computed(() => this.warehouses().reduce((sum, w) => sum + w.items, 0));
  totalValue = computed(() => this.warehouses().reduce((sum, w) => sum + w.value, 0));
  avgOccupancy = computed(() => {
    const whs = this.warehouses();
    if (whs.length === 0) return 0;
    return Math.round(whs.reduce((sum, w) => sum + w.occupancy, 0) / whs.length);
  });
  activeWarehouseCount = computed(() => this.warehouses().filter(w => w.status === 'Active').length);
  capacityUtilization = computed(() => {
    const whs = this.warehouses();
    if (whs.length === 0) return 0;
    const totalCap = whs.reduce((sum, w) => sum + w.capacity, 0);
    if (totalCap === 0) return 0;
    const totalItems = whs.reduce((sum, w) => sum + w.items, 0);
    return Math.round((totalItems / totalCap) * 100);
  });

  filteredWarehouses = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    return this.warehouses().filter(w => {
      const matchesSearch = !search ||
        w.name.toLowerCase().includes(search) ||
        w.code.toLowerCase().includes(search) ||
        w.location.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || w.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredWarehouses().length / this.pageSize))
  );

  pagedWarehouses = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredWarehouses().slice(start, start + this.pageSize);
  });

  selectAllChecked = computed(() => {
    const paged = this.pagedWarehouses();
    const selected = this.bulkSelection();
    return paged.length > 0 && paged.every(w => selected.has(w.id));
  });

  showBulkActions = computed(() => this.bulkSelection().size > 0);

  detailShelves = signal<ShelfInfo[]>([]);

  occupancyChartOptions = computed(() => {
    const whs = this.warehouses();
    if (whs.length === 0) return {};
    const names = [...whs].map(w => w.name).reverse();
    const values = [...whs].map(w => w.occupancy).reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          return `<strong>${p.name}</strong><br/>Occupancy: <strong>${p.value}%</strong>`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: values.map((v: number) => ({
          value: v,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: this.getOccupancyColor(v) + '44' },
              { offset: 1, color: this.getOccupancyColor(v) }
            ]),
            borderRadius: [0, 6, 6, 0]
          }
        })),
        barWidth: 14,
        barMaxWidth: 20,
        animationDuration: 1200,
        animationEasing: 'cubicOut'
      }]
    };
  });

  statusChartOptions = computed(() => {
    const dist = this.statusDistribution();
    if (dist.total === 0) return {};
    return {
      tooltip: {
        trigger: 'item',
        formatter: (p: { name: string; value: number; percent: number }) =>
          `<strong>${p.name}</strong><br/>${p.value} warehouse${p.value !== 1 ? 's' : ''} (<strong>${p.percent}%</strong>)`
      },
      series: [{
        type: 'pie',
        radius: ['55%', '75%'],
        avoidLabelOverlap: true,
        center: ['50%', '50%'],
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}\n{d}%',
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          lineHeight: 16
        },
        labelLine: { length: 12, length2: 8, lineStyle: { color: '#334155' } },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
        },
        data: [
          { value: dist.active, name: 'Active', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#10b981' }]) } },
          { value: dist.limited, name: 'Limited', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#f59e0b' }]) } },
          { value: dist.inactive, name: 'Inactive', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#ef4444' }]) } },
        ],
        animationDuration: 1000,
        animationEasing: 'cubicOut'
      }]
    };
  });

  constructor() {
    effect(() => {
      if (this.notification()) {
        setTimeout(() => this.notification.set(null), 4000);
      }
    });
    this.loadWarehouses();
  }

  private createMockWarehouses(): Warehouse[] {
    return [
      { id: 'wh-001', name: 'Main Warehouse', code: 'MW-001', location: 'Addis Ababa, Main District', address: 'Bole Road, Main District', city: 'Addis Ababa', country: 'Ethiopia', items: 3250, value: 4875000, capacity: 5000, occupancy: 65, shelfCount: 24, status: 'Active', managerName: 'Ahmed Hassan', contactNumber: '+251 911 000 001', contactEmail: 'main.wh@example.com', createdAt: '2025-01-15T08:00:00.000Z', description: 'Primary storage facility for general merchandise' },
      { id: 'wh-002', name: 'Branch Warehouse A', code: 'BW-A-001', location: 'Addis Ababa, Branch Zone', address: 'CMC Branch Zone', city: 'Addis Ababa', country: 'Ethiopia', items: 1350, value: 2025000, capacity: 3000, occupancy: 45, shelfCount: 16, status: 'Active', managerName: 'Fatima Ali', contactNumber: '+251 911 000 002', contactEmail: 'branch.a@example.com', createdAt: '2025-02-10T08:00:00.000Z', description: 'Secondary storage for regional distribution' },
      { id: 'wh-003', name: 'Cold Storage Facility', code: 'CS-001', location: 'Addis Ababa, Industrial Area', address: 'Akaki Industrial Area', city: 'Addis Ababa', country: 'Ethiopia', items: 1200, value: 3600000, capacity: 1500, occupancy: 80, shelfCount: 12, status: 'Active', managerName: 'Mohammed Seid', contactNumber: '+251 911 000 003', contactEmail: 'cold.storage@example.com', createdAt: '2025-03-05T08:00:00.000Z', description: 'Temperature controlled storage for perishables' },
      { id: 'wh-004', name: 'Bole Logistics Hub', code: 'BLH-001', location: 'Addis Ababa, Bole', address: 'Bole Road', city: 'Addis Ababa', country: 'Ethiopia', items: 2800, value: 4200000, capacity: 4000, occupancy: 70, shelfCount: 20, status: 'Active', managerName: 'Sara Tekle', contactNumber: '+251 911 000 004', contactEmail: 'bole.log@example.com', createdAt: '2025-01-20T08:00:00.000Z', description: 'Central logistics hub near Bole International Airport' },
      { id: 'wh-005', name: 'Eastern Distribution Center', code: 'EDC-002', location: 'Dire Dawa, Industrial Zone', address: 'Industrial Zone', city: 'Dire Dawa', country: 'Ethiopia', items: 900, value: 1350000, capacity: 2500, occupancy: 36, shelfCount: 10, status: 'Limited', managerName: 'Kebede Assefa', contactNumber: '+251 911 000 005', contactEmail: 'eastern.dc@example.com', createdAt: '2025-04-01T08:00:00.000Z', description: 'Regional distribution for eastern Ethiopia' },
      { id: 'wh-006', name: 'Northern Regional WH', code: 'NRW-001', location: 'Mekelle, Quiha District', address: 'Quiha District', city: 'Mekelle', country: 'Ethiopia', items: 450, value: 675000, capacity: 2000, occupancy: 23, shelfCount: 8, status: 'Limited', managerName: 'Tigist Hailu', contactNumber: '+251 911 000 006', contactEmail: 'northern.wh@example.com', createdAt: '2025-04-15T08:00:00.000Z', description: 'Regional warehouse serving Tigray region' },
      { id: 'wh-007', name: 'Hawassa Textile Storage', code: 'HTS-001', location: 'Hawassa, Industrial Park', address: 'Industrial Park', city: 'Hawassa', country: 'Ethiopia', items: 1800, value: 2700000, capacity: 2200, occupancy: 82, shelfCount: 14, status: 'Active', managerName: 'Dawit Eshetu', contactNumber: '+251 911 000 007', contactEmail: 'hawassa.ts@example.com', createdAt: '2025-02-20T08:00:00.000Z', description: 'Specialized storage for textile and garment industry' },
      { id: 'wh-008', name: 'Jimma Agricultural WH', code: 'JAW-001', location: 'Jimma, Coffee Zone', address: 'Coffee Zone', city: 'Jimma', country: 'Ethiopia', items: 600, value: 900000, capacity: 1800, occupancy: 33, shelfCount: 9, status: 'Inactive', managerName: 'Lemlem Berhanu', contactNumber: '+251 911 000 008', contactEmail: 'jimma.ag@example.com', createdAt: '2025-05-01T08:00:00.000Z', description: 'Agricultural product storage, currently under renovation' },
      { id: 'wh-009', name: 'Gondar Historic Depot', code: 'GHD-003', location: 'Gondar, City Center', address: 'City Center', city: 'Gondar', country: 'Ethiopia', items: 300, value: 450000, capacity: 1200, occupancy: 25, shelfCount: 6, status: 'Inactive', managerName: 'Tesfaye Ayele', contactNumber: '+251 911 000 009', contactEmail: 'gondar.hd@example.com', createdAt: '2025-03-20T08:00:00.000Z', description: 'Heritage storage facility, pending structural upgrades' },
      { id: 'wh-010', name: 'Adama Industrial Park WH', code: 'AIPW-002', location: 'Adama, Oromia Special Zone', address: 'Oromia Special Zone', city: 'Adama', country: 'Ethiopia', items: 2200, value: 3300000, capacity: 3500, occupancy: 63, shelfCount: 18, status: 'Active', managerName: 'Meron Tadesse', contactNumber: '+251 911 000 010', contactEmail: 'adama.ipwh@example.com', createdAt: '2025-01-10T08:00:00.000Z', description: 'Industrial park warehouse for manufacturing inputs' },
    ];
  }

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.bulkSelection.set(new Set());
    this.warehousesService.getAll().subscribe({
      next: (response) => {
        console.log('[Warehouse] GET response:', JSON.stringify({ success: response.success, message: response.message, dataCount: Array.isArray(response.data) ? response.data.length : 'not-array' }));
        const rows = Array.isArray(response.data) ? response.data : [];
        this.warehouses.set(
          rows.map((wh: WarehouseDto) => {
            const totalShelves = wh.totalShelves ?? 0;
            const totalItems = wh.totalItems ?? 0;
            const computedCapacity = totalShelves * 100; // backend has no capacity field; derive a value for the UI
            const computedUtilization = totalItems;
            return {
              id: wh.id,
              name: wh.warehouseName,
              code: wh.locationCode,
              location: [wh.address, wh.city, wh.country].filter(Boolean).join(', '),
              address: wh.address || '',
              city: wh.city || '',
              country: wh.country || '',
              items: computedUtilization,
              value: computedUtilization * 1500,
              capacity: computedCapacity,
              occupancy: computedCapacity ? Math.round((computedUtilization / computedCapacity) * 100) : 0,
              shelfCount: Math.max(1, totalShelves),
              status: (wh.isActive ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
              managerName: wh.contactPerson || '',
              contactNumber: wh.contactPhone || '',
              contactEmail: wh.contactEmail || '',
              createdAt: wh.createdAt || new Date().toISOString(),
              description: '',
            };
          })
        );
        if (this.warehouses().length === 0) {
          this.loadError.set('No warehouses found. Create a warehouse first.');
        }
        this.page.set(1);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading warehouses:', error);
        let msg = 'Failed to reach the server.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) {
            msg = 'Cannot reach the API (network). Is the backend running on port 5028?';
          } else {
            msg = `HTTP ${error.status}: ${error.message || 'request failed'}.`;
          }
        }
        this.loadError.set(msg);
        this.isLoading.set(false);
      },
    });
  }

  private useMockFallback(): void {
    if (this.mockUsed) return;
    this.mockUsed = true;
    const existing = this.warehouses();
    const mock = this.createMockWarehouses();
    if (existing.length < 5) {
      const existingIds = new Set(existing.map(w => w.id));
      const merged = [...existing, ...mock.filter(w => !existingIds.has(w.id))];
      this.warehouses.set(merged);
      this.page.set(1);
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.page.set(1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  toggleSelect(id: string): void {
    this.bulkSelection.update(sel => {
      const next = new Set(sel);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleSelectAll(): void {
    this.bulkSelection.update(sel => {
      const paged = this.pagedWarehouses();
      const allSelected = paged.every(w => sel.has(w.id));
      if (allSelected) {
        const next = new Set(sel);
        paged.forEach(w => next.delete(w.id));
        return next;
      } else {
        const next = new Set(sel);
        paged.forEach(w => next.add(w.id));
        return next;
      }
    });
  }

  deleteSelected(): void {
    const selected = this.bulkSelection();
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    let completed = 0;
    let failed = 0;
    ids.forEach(id => {
      this.warehousesService.delete(id).subscribe({
        next: () => {
          completed++;
          if (completed + failed === ids.length) {
            this.notification.set({
              type: failed > 0 ? 'warning' : 'success',
              message: failed > 0
                ? `${completed} deleted, ${failed} failed.`
                : `${ids.length} warehouse${ids.length !== 1 ? 's' : ''} deleted successfully.`
            });
            this.bulkSelection.set(new Set());
            this.loadWarehouses();
          }
        },
        error: () => {
          failed++;
          if (completed + failed === ids.length) {
            this.notification.set({
              type: failed > 0 ? 'warning' : 'success',
              message: failed > 0
                ? `${completed} deleted, ${failed} failed.`
                : `${ids.length} warehouse${ids.length !== 1 ? 's' : ''} deleted successfully.`
            });
            this.bulkSelection.set(new Set());
            this.loadWarehouses();
          }
        },
      });
    });
  }

  openAddModal(): void {
    this.selectedWarehouse.set(null);
    this.modalForm = {
      warehouseName: '',
      locationCode: '',
      address: '',
      city: '',
      country: '',
      contactPerson: '',
      contactPhone: '',
      contactEmail: '',
      isActive: true,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openEditModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    this.modalForm = {
      warehouseName: warehouse.name,
      locationCode: warehouse.code,
      address: warehouse.address,
      city: warehouse.city,
      country: warehouse.country,
      contactPerson: warehouse.managerName,
      contactPhone: warehouse.contactNumber,
      contactEmail: warehouse.contactEmail || '',
      isActive: warehouse.status === 'Active',
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openDetailModal(warehouse: Warehouse): void {
    this.selectedWarehouse.set(warehouse);
    const shelfCount = warehouse.shelfCount || 8;
    const perShelf = Math.round(warehouse.items / shelfCount);
    const perOcc = Math.round(warehouse.occupancy / shelfCount);
    const shelves: ShelfInfo[] = [];
    for (let i = 0; i < Math.min(shelfCount, 12); i++) {
      const aisle = String.fromCharCode(65 + (i % 8));
      const rack = `R-${String(i + 1).padStart(2, '0')}`;
      shelves.push({
        label: `${aisle}-${rack}`,
        items: perShelf + (i === 0 ? warehouse.items - perShelf * shelfCount : 0),
        occupancy: Math.min(100, perOcc + (i % 5) * 3),
      });
    }
    this.detailShelves.set(shelves);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openDeleteModal(warehouse: Warehouse): void {
    this.warehouseToDelete.set(warehouse);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedWarehouse.set(null);
    this.warehouseToDelete.set(null);
    this.formErrors.set({});
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.warehouseName.trim()) errors['warehouseName'] = 'Warehouse name is required';
    if (!this.modalForm.locationCode.trim()) errors['locationCode'] = 'Location code is required';
    if (!this.modalForm.address.trim()) errors['address'] = 'Address is required';
    if (!this.modalForm.city.trim()) errors['city'] = 'City is required';
    if (!this.modalForm.country.trim()) errors['country'] = 'Country is required';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  private extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      if (e['error'] && typeof e['error'] === 'object') {
        const body = e['error'] as Record<string, unknown>;
        if (body['message']) return String(body['message']);
        if (body['title']) return String(body['title']);
        if (body['errors']) {
          const vals = Object.values(body['errors']).flat();
          return vals.join('; ');
        }
      }
      if (e['message']) return String(e['message']);
    }
    return 'Unknown error';
  }

  saveWarehouse(): void {
    if (!this.validateForm()) return;
    const editing = this.selectedWarehouse();
    if (editing) {
      this.warehousesService.update({
        id: editing.id,
        warehouseName: this.modalForm.warehouseName,
        locationCode: this.modalForm.locationCode,
        address: this.modalForm.address,
        city: this.modalForm.city,
        country: this.modalForm.country,
        contactPerson: this.modalForm.contactPerson,
        contactPhone: this.modalForm.contactPhone,
        contactEmail: this.modalForm.contactEmail,
        isActive: this.modalForm.isActive,
      }).subscribe({
        next: () => {
          this.notification.set({ type: 'success', message: `Warehouse "${this.modalForm.warehouseName}" updated successfully.` });
          this.closeModal();
          this.loadWarehouses();
        },
        error: (err: unknown) => {
          console.error('Update warehouse error:', err);
          this.notification.set({ type: 'error', message: `Failed to update warehouse: ${this.extractErrorMessage(err)}` });
        },
      });
    } else {
      const payload = {
        warehouseName: this.modalForm.warehouseName,
        locationCode: this.modalForm.locationCode,
        address: this.modalForm.address,
        city: this.modalForm.city,
        country: this.modalForm.country,
        contactPerson: this.modalForm.contactPerson,
        contactPhone: this.modalForm.contactPhone,
        contactEmail: this.modalForm.contactEmail,
      };
      console.log('[Warehouse] CREATE payload:', JSON.stringify(payload));
      this.warehousesService.create(payload).subscribe({
        next: (res) => {
          console.log('[Warehouse] CREATE response:', JSON.stringify(res));
          if (res.success) {
            this.notification.set({ type: 'success', message: `Warehouse "${this.modalForm.warehouseName}" created successfully.` });
            this.closeModal();
            this.loadWarehouses();
          } else {
            this.notification.set({ type: 'error', message: `Failed to create warehouse: ${res.message || 'Server returned failure'}` });
          }
        },
        error: (err: unknown) => {
          console.error('[Warehouse] CREATE error:', err);
          this.notification.set({ type: 'error', message: `Failed to create warehouse: ${this.extractErrorMessage(err)}` });
        },
      });
    }
  }

  confirmDelete(): void {
    const wh = this.warehouseToDelete();
    if (!wh) return;
    this.warehousesService.delete(wh.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notification.set({ type: 'success', message: `Warehouse "${wh.name}" deleted successfully.` });
          this.closeModal();
          this.loadWarehouses();
        } else {
          this.notification.set({ type: 'error', message: `Failed to delete warehouse: ${res.message || 'Server returned failure'}` });
        }
      },
      error: (err: unknown) => {
        console.error('Delete warehouse error:', err);
        this.notification.set({ type: 'error', message: `Failed to delete warehouse: ${this.extractErrorMessage(err)}` });
      },
    });
  }

  exportCSV(): void {
    const whs = this.filteredWarehouses();
    const header = 'Name,Code,Location,Items,Stock Value,Capacity,Occupancy %,Status,Manager,Contact,Created';
    const rows = whs.map(w =>
      `"${w.name}","${w.code}","${w.location}",${w.items},${w.value},${w.capacity},${w.occupancy},"${w.status}","${w.managerName}","${w.contactNumber}","${w.createdAt}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${whs.length} warehouses to CSV.` });
  }

  getOccupancyColor(occ: number): string {
    if (occ >= 80) return '#dc2626';
    if (occ >= 60) return '#f59e0b';
    if (occ >= 30) return '#10b981';
    return '#6b7280';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      Active: 'bi-check-circle-fill',
      Limited: 'bi-exclamation-triangle-fill',
      Inactive: 'bi-x-circle-fill',
    };
    return icons[status] || 'bi-question-circle';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      Active: 'badge-active',
      Limited: 'badge-limited',
      Inactive: 'badge-inactive',
    };
    return classes[status] || 'badge-inactive';
  }

  formatValue(value: number): string {
    if (value >= 1000000) return 'Br ' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return 'Br ' + (value / 1000).toFixed(0) + 'K';
    return 'Br ' + value.toString();
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
    return this.selectedWarehouse() !== null;
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
}
