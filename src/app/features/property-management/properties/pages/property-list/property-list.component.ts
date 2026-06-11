import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PropertiesService, PropertyDto } from '../../../../../core/services/properties.service';

interface Property {
  id: string;
  tagNumber: string;
  name: string;
  type: string;
  location: string;
  value: number;
  status: 'Active' | 'Maintenance' | 'Disposed';
  serialNumber?: string;
  purchaseDate?: string;
  poNumber?: string;
  supplier?: string;
  assignedTo?: string | null;
  warrantyEnd?: string;
}

interface StatCard {
  label: string;
  value: string;
  pct: number;
  color: string;
  icon: string;
}

interface DonutSegment {
  label: string;
  value: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface BarItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent implements OnInit {
  private readonly propertiesService = inject(PropertiesService);
  readonly router = inject(Router);
  readonly Math = Math;

  searchTerm = signal('');
  typeFilter = signal('All Types');
  locationFilter = signal('All Locations');
  statusFilter = signal('All Status');
  purchaseFilter = signal('All Dates');

  propertyTypes = ['All Types', 'Computer', 'Monitor', 'Furniture', 'Equipment', 'Vehicle', 'Network'];
  locations = ['All Locations', 'IT Dept', 'HR Dept', 'ServerRm', 'Parking', 'Finance', 'Admin'];
  statuses = ['All Status', 'Active', 'Maintenance', 'Disposed'];
  purchaseDates = ['All Dates', 'This Week', 'This Month', 'This Year'];

  allProperties = signal<Property[]>([]);

  filteredProperties = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const location = this.locationFilter();
    const status = this.statusFilter();
    return this.allProperties().filter(prop => {
      const matchesSearch = !search || prop.tagNumber.toLowerCase().includes(search) || prop.name.toLowerCase().includes(search);
      const matchesType = type === 'All Types' || prop.type === type;
      const matchesLocation = location === 'All Locations' || prop.location === location;
      const matchesStatus = status === 'All Status' || prop.status === status;
      return matchesSearch && matchesType && matchesLocation && matchesStatus;
    });
  });

  currentPage = signal(1);
  readonly pageSize = 5;

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProperties().length / this.pageSize)));

  paginatedProperties = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProperties().slice(start, start + this.pageSize);
  });

  statCards = computed((): StatCard[] => {
    const props = this.filteredProperties();
    const total = props.length;
    const active = props.filter(p => p.status === 'Active').length;
    const maintenance = props.filter(p => p.status === 'Maintenance').length;
    const disposed = props.filter(p => p.status === 'Disposed').length;
    const totalValue = props.reduce((sum, p) => sum + p.value, 0);
    const avgValue = total > 0 ? Math.round(totalValue / total) : 0;

    return [
      { label: 'Total Properties', value: total.toLocaleString(), pct: 100, color: '#3b82f6', icon: 'box' },
      { label: 'Active', value: active.toLocaleString(), pct: total > 0 ? Math.round(active / total * 100) : 0, color: '#10b981', icon: 'check-circle' },
      { label: 'Maintenance', value: maintenance.toLocaleString(), pct: total > 0 ? Math.round(maintenance / total * 100) : 0, color: '#f59e0b', icon: 'tools' },
      { label: 'Disposed', value: disposed.toLocaleString(), pct: total > 0 ? Math.round(disposed / total * 100) : 0, color: '#ef4444', icon: 'archive' },
      { label: 'Total Value', value: `ETB ${totalValue.toLocaleString()}`, pct: Math.min(100, total > 0 ? Math.round(totalValue / (Math.max(...this.allProperties().map(p => p.value)) * total) * 100) : 0), color: '#8b5cf6', icon: 'currency-dollar' },
      { label: 'Avg Value', value: `ETB ${avgValue.toLocaleString()}`, pct: Math.min(100, Math.round(avgValue / 50000 * 100)), color: '#ec4899', icon: 'graph-up' }
    ];
  });

  private typeDist = computed((): { name: string; count: number; pct: number }[] => {
    const counts = new Map<string, number>();
    this.filteredProperties().forEach(p => counts.set(p.type, (counts.get(p.type) || 0) + 1));
    const total = this.filteredProperties().length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) }));
  });

  private locDist = computed((): { name: string; count: number; pct: number }[] => {
    const counts = new Map<string, number>();
    this.filteredProperties().forEach(p => counts.set(p.location, (counts.get(p.location) || 0) + 1));
    const total = this.filteredProperties().length || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) }));
  });

  typeBars = computed((): BarItem[] =>
    this.typeDist().map((d, i) => ({ name: d.name, value: d.count, pct: d.pct, color: BAR_COLORS[i % BAR_COLORS.length] }))
  );

  locationBars = computed((): BarItem[] =>
    this.locDist().map((d, i) => ({ name: d.name, value: d.count, pct: d.pct, color: BAR_COLORS[(i + 2) % BAR_COLORS.length] }))
  );

  donutSegments = computed((): DonutSegment[] => {
    const C = 2 * Math.PI * 50;
    let cumulative = 0;
    return this.typeBars().map(bar => {
      const dashLength = C * bar.pct / 100;
      const seg: DonutSegment = {
        label: bar.name,
        value: bar.value,
        pct: bar.pct,
        color: bar.color,
        dashArray: `${dashLength} ${C}`,
        dashOffset: cumulative
      };
      cumulative += dashLength;
      return seg;
    });
  });

  showModal = signal(false);
  selectedProperty = signal<Property | null>(null);
  showConfirmDelete = signal(false);
  propertyToDelete = signal<Property | null>(null);
  showBulkActionsDropdown = signal(false);
  notification = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  ngOnInit(): void {
    this.propertiesService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.allProperties.set(response.data.map(dto => this.mapToProperty(dto)));
        }
      },
      error: () => {
        this.showNotification('Failed to load properties', 'error');
      }
    });
  }

  private mapToProperty(dto: PropertyDto): Property {
    return {
      id: dto.id,
      tagNumber: dto.id,
      name: dto.name,
      type: dto.propertyTypeId || 'Equipment',
      location: dto.locationId || 'Unassigned',
      value: dto.currentValue,
      status: dto.isActive ? 'Active' : 'Disposed',
      serialNumber: dto.description,
    };
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set('All Types');
    this.locationFilter.set('All Locations');
    this.statusFilter.set('All Status');
    this.purchaseFilter.set('All Dates');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  openDetailsModal(property: Property): void {
    this.selectedProperty.set(property);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedProperty.set(null);
  }

  requestDelete(property: Property): void {
    this.propertyToDelete.set(property);
    this.showConfirmDelete.set(true);
  }

  cancelDelete(): void {
    this.showConfirmDelete.set(false);
    this.propertyToDelete.set(null);
  }

  confirmDelete(): void {
    const prop = this.propertyToDelete();
    if (prop) {
      this.allProperties.update(list => list.filter(p => p.id !== prop.id));
      this.showNotification(`Property ${prop.tagNumber} has been removed`, 'success');
    }
    this.cancelDelete();
  }

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    this.notification.set({ message, type });
    setTimeout(() => this.notification.set(null), 3500);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      Active: 'green',
      Maintenance: 'yellow',
      Disposed: 'red'
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      Active: 'bi bi-check-circle-fill',
      Maintenance: 'bi bi-exclamation-triangle-fill',
      Disposed: 'bi bi-archive-fill'
    };
    return icons[status] || 'bi bi-question-circle';
  }

  addNewProperty(): void {
    this.router.navigate(['/admin/properties/add']);
  }

  navigateToEdit(property: Property): void {
    this.router.navigate(['/admin/properties/edit', property.id]);
  }

  exportProperties(): void {
    const properties = this.filteredProperties();
    const headers = ['Tag Number', 'Name', 'Type', 'Location', 'Value', 'Status'];
    const csvContent = [
      headers.join(','),
      ...properties.map(p => [p.tagNumber, p.name, p.type, p.location, p.value, p.status].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'properties_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.showNotification('Properties exported successfully', 'success');
  }

  printProperties(): void {
    window.print();
  }

  showBulkActions(): void {
    this.showBulkActionsDropdown.update(v => !v);
  }

  closeBulkActions(): void {
    this.showBulkActionsDropdown.set(false);
  }

  bulkDelete(): void {
    this.showNotification('Bulk delete not implemented', 'info');
    this.closeBulkActions();
  }

  bulkTransfer(): void {
    this.showNotification('Bulk transfer not implemented', 'info');
    this.closeBulkActions();
  }

  bulkExport(): void {
    this.exportProperties();
    this.closeBulkActions();
  }

  transferProperty(property: Property): void {
    this.showNotification(`Transfer initiated for ${property.tagNumber}`, 'info');
  }

  printLabel(property: Property): void {
    this.showNotification(`Printing label for ${property.tagNumber}`, 'info');
  }

  viewQR(property: Property): void {
    this.showNotification(`QR code for ${property.tagNumber}`, 'info');
  }

  disposeProperty(property: Property): void {
    this.requestDelete(property);
  }

  viewAttachment(filename: string): void {
    this.showNotification(`Opening ${filename}`, 'info');
  }

  downloadAttachment(filename: string): void {
    this.showNotification(`Downloading ${filename}`, 'info');
  }

  addAttachment(): void {
    this.showNotification('File upload dialog opened', 'info');
  }

  viewFullHistory(): void {
    this.showNotification('Viewing full history', 'info');
  }

  saveFilter(): void {
    this.showNotification('Filter configuration saved', 'success');
  }

  getPageRange(): number[] {
    const tp = this.totalPages();
    return Array.from({ length: tp }, (_, i) => i + 1);
  }

  getSerial(property: Property): string {
    return property.serialNumber || 'N/A';
  }

  getSupplier(property: Property): string {
    return property.supplier || 'N/A';
  }

  getAssignedTo(property: Property): string {
    return property.assignedTo || 'Unassigned';
  }
}
