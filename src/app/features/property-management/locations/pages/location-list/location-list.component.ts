import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LocationService, LocationDto } from '../../services/location.service';

interface Location {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  propertiesCount: number;
  status: 'Active' | 'Inactive';
  description: string;
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  maxCapacity: number;
  allowStorage: boolean;
  generateQR: boolean;
  createdAt: string;
}

interface LocationNode extends Location {
  children: LocationNode[];
  expanded: boolean;
}

type ModalMode = 'add-edit' | 'detail' | 'delete' | null;

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss']
})
export class LocationListComponent {
  private readonly locationService = inject(LocationService);

  searchTerm = signal('');
  typeFilter = signal('All Types');
  parentFilter = signal('All');
  viewMode = signal<'tree' | 'list'>('tree');
  page = signal(1);
  pageSize = 10;
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: string; message: string } | null>(null);
  showModal = signal(false);
  modalMode = signal<ModalMode>(null);
  selectedLocation = signal<Location | null>(null);
  locationToDelete = signal<Location | null>(null);
  expandedNodes = signal<Set<string>>(new Set());

  locationTypes = ['All Types', 'Building', 'Floor', 'Department', 'Room', 'Warehouse', 'Aisle', 'Shelf'];
  parentOptions = ['All'];

  modalForm = {
    name: '',
    type: 'Department',
    parentId: null as string | null,
    description: '',
    contactPerson: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    maxCapacity: 0,
    allowStorage: true,
    active: true,
    generateQR: true,
  };

  formErrors = signal<Record<string, string>>({});

  locations = signal<Location[]>([]);

  locationStats = computed(() => {
    const locs = this.locations();
    return {
      total: locs.length,
      buildings: locs.filter(l => l.type === 'Building').length,
      floors: locs.filter(l => l.type === 'Floor').length,
      departments: locs.filter(l => l.type === 'Department').length,
      rooms: locs.filter(l => l.type === 'Room').length,
      warehouses: locs.filter(l => l.type === 'Warehouse').length,
      active: locs.filter(l => l.status === 'Active').length,
      inactive: locs.filter(l => l.status === 'Inactive').length,
    };
  });

  filteredLocations = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const parent = this.parentFilter();
    return this.locations().filter(loc => {
      const matchesSearch = !search ||
        loc.name.toLowerCase().includes(search) ||
        loc.type.toLowerCase().includes(search) ||
        loc.city.toLowerCase().includes(search);
      const matchesType = type === 'All Types' || loc.type === type;
      const matchesParent = parent === 'All' || loc.parentId === parent;
      return matchesSearch && matchesType && matchesParent;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLocations().length / this.pageSize))
  );

  pagedLocations = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredLocations().slice(start, start + this.pageSize);
  });

  treeStructure = computed(() => this.buildTree(this.filteredLocations()));

  donutData = computed(() => {
    const locs = this.locations();
    const stats = this.locationStats();
    const entries = [
      { label: 'Buildings', value: stats.buildings, color: '#6366f1' },
      { label: 'Floors', value: stats.floors, color: '#059669' },
      { label: 'Departments', value: stats.departments, color: '#9333ea' },
      { label: 'Rooms', value: stats.rooms, color: '#d97706' },
      { label: 'Warehouses', value: stats.warehouses, color: '#dc2626' },
      { label: 'Aisles', value: locs.filter(l => l.type === 'Aisle').length, color: '#0891b2' },
      { label: 'Shelves', value: locs.filter(l => l.type === 'Shelf').length, color: '#db2777' },
    ];
    const total = entries.reduce((s, e) => s + e.value, 0) || 1;
    const r = 50;
    const circumference = 2 * Math.PI * r;
    let cum = 0;
    return entries.map(e => {
      const pct = e.value / total;
      const offset = cum;
      cum += pct * circumference;
      return { ...e, pct: Math.round(pct * 100), offset, circumference };
    });
  });

  readonly circumference = 2 * Math.PI * 50;

  getDonutOffset(index: number): number {
    return this.donutData()[index]?.offset ?? 0;
  }

  expandAll(): void {
    const allIds = new Set(this.locations().filter(l => l.parentId !== null).map(l => l.parentId!).filter(Boolean));
    this.expandedNodes.set(allIds);
  }

  collapseAll(): void {
    this.expandedNodes.set(new Set());
  }

  typePct(type: string): number {
    const stats = this.locationStats();
    const map: Record<string, number> = {
      Building: stats.buildings, Floor: stats.floors, Department: stats.departments,
      Room: stats.rooms, Warehouse: stats.warehouses,
    };
    const val = map[type] ?? 0;
    return stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
  }

  constructor() {
    effect(() => {
      if (this.notification()) {
        setTimeout(() => this.notification.set(null), 4000);
      }
    });
    this.loadLocations();
  }

  loadLocations(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.locationService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.length > 0) {
          const locations: Location[] = (response.data as LocationDto[]).map((loc) => {
            return {
              id: loc.id,
              name: loc.name || 'Location',
              type: this.inferLocationType(loc.name || ''),
              parentId: null,
              propertiesCount: 0,
              status: loc.isActive ? 'Active' : 'Inactive',
              description: '',
              contactPerson: '',
              phone: '',
              email: '',
              addressLine1: loc.address || '',
              addressLine2: '',
              city: loc.city || '',
              zipCode: '',
              latitude: '',
              longitude: '',
              maxCapacity: 0,
              allowStorage: true,
              generateQR: false,
              createdAt: new Date().toISOString(),
            };
          });
          this.locations.set(locations);
          this.page.set(1);
        } else {
          this.loadError.set(response.message || 'Failed to load locations');
        }
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error loading locations:', error);
        let msg = 'Failed to reach the server.';
        if (error instanceof HttpErrorResponse) {
          if (error.status === 0) {
            msg = 'Cannot reach the API (network). Is the backend running?';
          } else {
            msg = `HTTP ${error.status}: ${error.message || 'request failed'}.`;
          }
        }
        this.loadError.set(msg);
        this.isLoading.set(false);
      },
    });
  }

  private inferLocationType(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('floor') || n.includes('ground') || n.includes('first') || n.includes('second')) return 'Floor';
    if (n.includes('department') || n.includes('dept') || n.includes('finance') || n.includes('human resource') || n.includes('it ') || n.includes('operation')) return 'Department';
    if (n.includes('warehouse') || n.includes('store')) return 'Warehouse';
    if (n.includes('aisle')) return 'Aisle';
    if (n.includes('shelf')) return 'Shelf';
    if (n.includes('room') || n.includes('office') || n.includes('server') || n.includes('conference')) return 'Room';
    if (n.includes('building') || n.includes('hq') || n.includes('campus') || n.includes('branch')) return 'Building';
    return 'Building';
  }

  private buildTree(locations: Location[]): LocationNode[] {
    const map = new Map<string, LocationNode>();
    const roots: LocationNode[] = [];
    const expanded = this.expandedNodes();

    locations.forEach(loc => {
      map.set(loc.id, { ...loc, children: [], expanded: expanded.has(loc.id) });
    });

    locations.forEach(loc => {
      const node = map.get(loc.id);
      if (!node) return;
      if (loc.parentId && map.has(loc.parentId)) {
        const parent = map.get(loc.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  toggleNode(nodeId: string): void {
    const expanded = new Set(this.expandedNodes());
    if (expanded.has(nodeId)) {
      expanded.delete(nodeId);
    } else {
      expanded.add(nodeId);
    }
    this.expandedNodes.set(expanded);
  }

  isNodeExpanded(nodeId: string): boolean {
    return this.expandedNodes().has(nodeId);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.page.set(1);
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value);
    this.page.set(1);
  }

  onParentFilterChange(value: string): void {
    this.parentFilter.set(value);
    this.page.set(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set('All Types');
    this.parentFilter.set('All');
    this.page.set(1);
  }

  setViewMode(mode: 'tree' | 'list'): void {
    this.viewMode.set(mode);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  openAddModal(): void {
    this.selectedLocation.set(null);
    this.modalForm = {
      name: '',
      type: 'Department',
      parentId: null,
      description: '',
      contactPerson: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      zipCode: '',
      latitude: '',
      longitude: '',
      maxCapacity: 0,
      allowStorage: true,
      active: true,
      generateQR: true,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openEditModal(location: Location): void {
    this.selectedLocation.set(location);
    this.modalForm = {
      name: location.name,
      type: location.type,
      parentId: location.parentId,
      description: location.description,
      contactPerson: location.contactPerson,
      phone: location.phone,
      email: location.email,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      zipCode: location.zipCode,
      latitude: location.latitude,
      longitude: location.longitude,
      maxCapacity: location.maxCapacity,
      allowStorage: location.allowStorage,
      active: location.status === 'Active',
      generateQR: location.generateQR,
    };
    this.formErrors.set({});
    this.modalMode.set('add-edit');
    this.showModal.set(true);
  }

  openDetailModal(location: Location): void {
    this.selectedLocation.set(location);
    this.modalMode.set('detail');
    this.showModal.set(true);
  }

  openDeleteModal(location: Location): void {
    this.locationToDelete.set(location);
    this.modalMode.set('delete');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalMode.set(null);
    this.selectedLocation.set(null);
    this.locationToDelete.set(null);
    this.formErrors.set({});
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.modalForm.name.trim()) {
      errors['name'] = 'Location name is required';
    }
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveLocation(): void {
    if (!this.validateForm()) return;
    const data = this.modalForm;
    const editing = this.selectedLocation();

    if (editing) {
      const updated: Location = {
        ...editing,
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        description: data.description,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        maxCapacity: data.maxCapacity,
        allowStorage: data.allowStorage,
        generateQR: data.generateQR,
        status: data.active ? 'Active' : 'Inactive',
      };

      this.locationService.update(editing.id, {
        name: data.name,
        address: data.addressLine1,
        city: data.city,
        isActive: data.active,
      }).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadLocations();
            this.notification.set({ type: 'success', message: `Location "${updated.name}" updated successfully.` });
          } else {
            this.notification.set({ type: 'error', message: 'Failed to update: ' + (res.message || 'Unknown error') });
          }
          this.closeModal();
        },
        error: (err) => {
          this.notification.set({ type: 'error', message: 'Error updating location: ' + (err?.error?.message || err?.message || 'Network error') });
          this.closeModal();
        },
      });
    } else {
      const payload = {
        name: data.name,
        type: data.type,
        parentId: data.parentId,
        address: data.addressLine1,
        city: data.city,
        isActive: data.active,
      };

      this.locationService.create(payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadLocations();
            this.notification.set({ type: 'success', message: `Location "${data.name}" created successfully.` });
          } else {
            this.notification.set({ type: 'error', message: 'Failed to create: ' + (res.message || 'Unknown error') });
          }
          this.closeModal();
        },
        error: (err) => {
          this.notification.set({ type: 'error', message: 'Error creating location: ' + (err?.error?.message || err?.message || 'Network error') });
          this.closeModal();
        },
      });
    }
  }

  confirmDelete(): void {
    const loc = this.locationToDelete();
    if (!loc) return;
    this.locations.update(locs => locs.filter(l => l.id !== loc.id));
    this.notification.set({ type: 'success', message: `Location "${loc.name}" deleted successfully.` });
    this.closeModal();
    this.page.set(1);
  }

  toggleStatus(id: string): void {
    const loc = this.locations().find(l => l.id === id);
    if (!loc) return;
    const newStatus: 'Active' | 'Inactive' = loc.status === 'Active' ? 'Inactive' : 'Active';
    this.locations.update(locs =>
      locs.map(l => l.id === id ? { ...l, status: newStatus } : l)
    );
    this.notification.set({ type: 'success', message: `Location "${loc.name}" is now ${newStatus}.` });
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.modalForm.latitude = position.coords.latitude.toString();
          this.modalForm.longitude = position.coords.longitude.toString();
        },
        (err) => {
          this.notification.set({ type: 'error', message: 'Failed to get current location: ' + err.message });
        }
      );
    }
  }

  retryLoad(): void {
    this.loadLocations();
  }

  exportCSV(): void {
    const locs = this.filteredLocations();
    const header = 'Name,Type,Parent,Status,City,Description,Contact,Phone,Email,Capacity';
    const rows = locs.map(l => {
      const parent = l.parentId ? (this.locations().find(p => p.id === l.parentId)?.name || '') : '';
      return `"${l.name}","${l.type}","${parent}","${l.status}","${l.city}","${l.description}","${l.contactPerson}","${l.phone}","${l.email}",${l.maxCapacity}`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: `Exported ${locs.length} locations to CSV.` });
  }

  getParentName(location: Location): string {
    if (!location.parentId) return '';
    const parent = this.locations().find(l => l.id === location.parentId);
    return parent ? parent.name : '';
  }

  hasParentName(location: Location): string | null {
    if (!location.parentId) return null;
    return this.getParentName(location);
  }

  getIconClass(type: string): string {
    const map: Record<string, string> = {
      Building: 'icon-building',
      Floor: 'icon-floor',
      Department: 'icon-department',
      Room: 'icon-room',
      Warehouse: 'icon-warehouse',
      Aisle: 'icon-aisle',
      Shelf: 'icon-shelf',
    };
    return map[type] || 'icon-default';
  }

  getIconClassSolid(type: string): string {
    const map: Record<string, string> = {
      Building: 'bi bi-building',
      Floor: 'bi bi-layers-fill',
      Department: 'bi bi-door-closed',
      Room: 'bi bi-door-closed-fill',
      Warehouse: 'bi bi-box-seam-fill',
      Aisle: 'bi bi-columns-gap',
      Shelf: 'bi bi-stack',
    };
    return map[type] || 'bi bi-geo-alt';
  }

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Building: 'badge-building',
      Floor: 'badge-floor',
      Department: 'badge-department',
      Room: 'badge-room',
      Warehouse: 'badge-warehouse',
      Aisle: 'badge-aisle',
      Shelf: 'badge-shelf',
    };
    return map[type] || 'badge-default';
  }

  getStatusBadgeClass(status: string): string {
    return status === 'Active' ? 'badge-active' : 'badge-inactive';
  }

  getStatusIcon(status: string): string {
    return status === 'Active' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
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
    return this.selectedLocation() !== null;
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

  activePct = computed(() => {
    const stats = this.locationStats();
    return stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
  });

  inactivePct = computed(() => {
    const stats = this.locationStats();
    return stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0;
  });

  hasActiveFilters(): boolean {
    return this.searchTerm() !== '' || this.typeFilter() !== 'All Types' || this.parentFilter() !== 'All';
  }
}
