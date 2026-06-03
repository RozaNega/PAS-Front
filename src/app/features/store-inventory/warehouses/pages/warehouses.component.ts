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
  items: number;
  value: number;
  capacity: number;
  occupancy: number;
  shelfCount: number;
  status: 'Active' | 'Limited' | 'Inactive';
  managerName: string;
  contactNumber: string;
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
    warehouseCode: '',
    location: '',
    capacity: 10000,
    managerName: '',
    contactNumber: '',
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
      { id: 'wh-001', name: 'Main Warehouse', code: 'MW-001', location: 'Addis Ababa, Main District', items: 3250, value: 4875000, capacity: 5000, occupancy: 65, shelfCount: 24, status: 'Active', managerName: 'Ahmed Hassan', contactNumber: '+251 911 000 001', createdAt: '2025-01-15T08:00:00.000Z', description: 'Primary storage facility for general merchandise' },
      { id: 'wh-002', name: 'Branch Warehouse A', code: 'BW-A-001', location: 'Addis Ababa, Branch Zone', items: 1350, value: 2025000, capacity: 3000, occupancy: 45, shelfCount: 16, status: 'Active', managerName: 'Fatima Ali', contactNumber: '+251 911 000 002', createdAt: '2025-02-10T08:00:00.000Z', description: 'Secondary storage for regional distribution' },
      { id: 'wh-003', name: 'Cold Storage Facility', code: 'CS-001', location: 'Addis Ababa, Industrial Area', items: 1200, value: 3600000, capacity: 1500, occupancy: 80, shelfCount: 12, status: 'Active', managerName: 'Mohammed Seid', contactNumber: '+251 911 000 003', createdAt: '2025-03-05T08:00:00.000Z', description: 'Temperature controlled storage for perishables' },
      { id: 'wh-004', name: 'Bole Logistics Hub', code: 'BLH-001', location: 'Addis Ababa, Bole', items: 2800, value: 4200000, capacity: 4000, occupancy: 70, shelfCount: 20, status: 'Active', managerName: 'Sara Tekle', contactNumber: '+251 911 000 004', createdAt: '2025-01-20T08:00:00.000Z', description: 'Central logistics hub near Bole International Airport' },
      { id: 'wh-005', name: 'Eastern Distribution Center', code: 'EDC-002', location: 'Dire Dawa, Industrial Zone', items: 900, value: 1350000, capacity: 2500, occupancy: 36, shelfCount: 10, status: 'Limited', managerName: 'Kebede Assefa', contactNumber: '+251 911 000 005', createdAt: '2025-04-01T08:00:00.000Z', description: 'Regional distribution for eastern Ethiopia' },
      { id: 'wh-006', name: 'Northern Regional WH', code: 'NRW-001', location: 'Mekelle, Quiha District', items: 450, value: 675000, capacity: 2000, occupancy: 23, shelfCount: 8, status: 'Limited', managerName: 'Tigist Hailu', contactNumber: '+251 911 000 006', createdAt: '2025-04-15T08:00:00.000Z', description: 'Regional warehouse serving Tigray region' },
      { id: 'wh-007', name: 'Hawassa Textile Storage', code: 'HTS-001', location: 'Hawassa, Industrial Park', items: 1800, value: 2700000, capacity: 2200, occupancy: 82, shelfCount: 14, status: 'Active', managerName: 'Dawit Eshetu', contactNumber: '+251 911 000 007', createdAt: '2025-02-20T08:00:00.000Z', description: 'Specialized storage for textile and garment industry' },
      { id: 'wh-008', name: 'Jimma Agricultural WH', code: 'JAW-001', location: 'Jimma, Coffee Zone', items: 600, value: 900000, capacity: 1800, occupancy: 33, shelfCount: 9, status: 'Inactive', managerName: 'Lemlem Berhanu', contactNumber: '+251 911 000 008', createdAt: '2025-05-01T08:00:00.000Z', description: 'Agricultural product storage, currently under renovation' },
      { id: 'wh-009', name: 'Gondar Historic Depot', code: 'GHD-003', location: 'Gondar, City Center', items: 300, value: 450000, capacity: 1200, occupancy: 25, shelfCount: 6, status: 'Inactive', managerName: 'Tesfaye Ayele', contactNumber: '+251 911 000 009', createdAt: '2025-03-20T08:00:00.000Z', description: 'Heritage storage facility, pending structural upgrades' },
      { id: 'wh-010', name: 'Adama Industrial Park WH', code: 'AIPW-002', location: 'Adama, Oromia Special Zone', items: 2200, value: 3300000, capacity: 3500, occupancy: 63, shelfCount: 18, status: 'Active', managerName: 'Meron Tadesse', contactNumber: '+251 911 000 010', createdAt: '2025-01-10T08:00:00.000Z', description: 'Industrial park warehouse for manufacturing inputs' },
    ];
  }

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.bulkSelection.set(new Set());
    this.warehousesService.getAll().subscribe({
      next: (response) => {
        const rows = Array.isArray(response.data) ? response.data : [];
        this.warehouses.set(
          rows.map((wh: WarehouseDto) => ({
            id: wh.id,
            name: wh.warehouseName,
            code: wh.warehouseCode,
            location: wh.location || '',
            items: wh.currentUtilization ?? 0,
            value: (wh.currentUtilization ?? 0) * 1500,
            capacity: wh.capacity ?? 10000,
            occupancy: wh.capacity ? Math.round(((wh.currentUtilization ?? 0) / wh.capacity) * 100) : 0,
            shelfCount: Math.max(1, Math.round((wh.currentUtilization ?? 0) / 100)),
            status: wh.isActive ? 'Active' : 'Inactive' as 'Active' | 'Inactive',
            managerName: wh.managerName || '',
            contactNumber: wh.contactNumber || '',
            createdAt: wh.createdAt || new Date().toISOString(),
            description: wh.description || '',
          })),
        );
        if (rows.length === 0) {
          this.loadError.set(
            response.success === false
              ? response.message || 'No warehouses returned from the API.'
              : 'No warehouses in the database yet.',
          );
        } else {
          this.loadError.set(null);
        }
        if (this.warehouses().length < 5) {
          this.useMockFallback();
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
        this.useMockFallback();
        this.notification.set({ type: 'warning', message: msg + ' Showing mock data.' });
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
    const count = selected.size;
    this.warehouses.update(whs => whs.filter(w => !selected.has(w.id)));
    this.notification.set({ type: 'success', message: `${count} warehouse${count !== 1 ? 's' : ''} deleted successfully.` });
    this.bulkSelection.set(new Set());
    this.page.set(1);
  }

  openAddModal(): void {
    this.selectedWarehouse.set(null);
    this.modalForm = {
      warehouseName: '',
      warehouseCode: '',
      location: '',
      capacity: 10000,
      managerName: '',
      contactNumber: '',
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
      warehouseCode: warehouse.code,
      location: warehouse.location,
      capacity: warehouse.capacity,
      managerName: warehouse.managerName,
      contactNumber: warehouse.contactNumber,
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
    if (!this.modalForm.warehouseCode.trim()) errors['warehouseCode'] = 'Warehouse code is required';
    if (!this.modalForm.location.trim()) errors['location'] = 'Location is required';
    if (this.modalForm.capacity <= 0) errors['capacity'] = 'Capacity must be greater than 0';
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveWarehouse(): void {
    if (!this.validateForm()) return;
    const editing = this.selectedWarehouse();
    if (editing) {
      const updated: Warehouse = {
        ...editing,
        name: this.modalForm.warehouseName,
        code: this.modalForm.warehouseCode,
        location: this.modalForm.location,
        capacity: this.modalForm.capacity,
        managerName: this.modalForm.managerName,
        contactNumber: this.modalForm.contactNumber,
        status: this.modalForm.isActive ? 'Active' : 'Inactive',
        occupancy: this.modalForm.isActive ? Math.max(10, editing.occupancy) : Math.min(10, editing.occupancy),
      };
      this.warehouses.update(whs => whs.map(w => w.id === editing.id ? updated : w));
      this.notification.set({ type: 'success', message: `Warehouse "${updated.name}" updated successfully.` });
    } else {
      const newWh: Warehouse = {
        id: 'wh-' + String(Date.now()).slice(-6),
        name: this.modalForm.warehouseName,
        code: this.modalForm.warehouseCode,
        location: this.modalForm.location,
        items: 0, value: 0,
        capacity: this.modalForm.capacity,
        occupancy: 0, shelfCount: 0,
        status: this.modalForm.isActive ? 'Active' : 'Inactive',
        managerName: this.modalForm.managerName,
        contactNumber: this.modalForm.contactNumber,
        createdAt: new Date().toISOString(),
        description: '',
      };
      this.warehouses.update(whs => [...whs, newWh]);
      this.notification.set({ type: 'success', message: `Warehouse "${newWh.name}" created successfully.` });
    }
    this.closeModal();
  }

  confirmDelete(): void {
    const wh = this.warehouseToDelete();
    if (!wh) return;
    this.warehouses.update(whs => whs.filter(w => w.id !== wh.id));
    this.notification.set({ type: 'success', message: `Warehouse "${wh.name}" deleted successfully.` });
    this.closeModal();
    this.page.set(1);
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
