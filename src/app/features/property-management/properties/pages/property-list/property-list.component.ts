import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

const MOCK_PROPERTIES: Property[] = [
  { id: '1', tagNumber: 'TAG-001', name: 'Dell XPS Laptop', type: 'Computer', location: 'IT Dept', value: 2499, status: 'Active', serialNumber: 'C02XK2L8Q6PJ', purchaseDate: '2024-11-15T00:00:00.000Z', poNumber: 'PO-2024-1234', supplier: 'Tech Supplies PLC', assignedTo: 'John Doe', warrantyEnd: '2026-11-14T00:00:00.000Z' },
  { id: '2', tagNumber: 'TAG-002', name: 'HP Monitor 27"', type: 'Monitor', location: 'IT Dept', value: 350, status: 'Active', serialNumber: 'HP27-MN-8932', purchaseDate: '2024-10-01T00:00:00.000Z', poNumber: 'PO-2024-0892', supplier: 'OfficeTech Trading', assignedTo: 'Sarah Smith', warrantyEnd: '2026-10-01T00:00:00.000Z' },
  { id: '3', tagNumber: 'TAG-003', name: 'Executive Office Chair', type: 'Furniture', location: 'HR Dept', value: 450, status: 'Maintenance', serialNumber: 'CHR-EXEC-4521', purchaseDate: '2023-06-20T00:00:00.000Z', poNumber: 'PO-2023-0456', supplier: 'Furniture World PLC', assignedTo: 'HR Team', warrantyEnd: '2025-06-20T00:00:00.000Z' },
  { id: '4', tagNumber: 'TAG-004', name: 'Dell PowerEdge R740', type: 'Equipment', location: 'ServerRm', value: 2800, status: 'Active', serialNumber: 'R740-SRV-001', purchaseDate: '2024-08-15T00:00:00.000Z', poNumber: 'PO-2024-0567', supplier: 'Server Solutions Inc', assignedTo: 'IT Admin', warrantyEnd: '2027-08-15T00:00:00.000Z' },
  { id: '5', tagNumber: 'TAG-005', name: 'Ford Transit Van', type: 'Vehicle', location: 'Parking', value: 35000, status: 'Active', serialNumber: 'FTV-2024-789', purchaseDate: '2024-03-10T00:00:00.000Z', poNumber: 'PO-2024-0123', supplier: 'EthioMotors PLC', assignedTo: 'Logistics Team', warrantyEnd: '2028-03-10T00:00:00.000Z' },
  { id: '6', tagNumber: 'TAG-006', name: 'Cisco Catalyst 9300', type: 'Network', location: 'IT Dept', value: 1200, status: 'Disposed', serialNumber: 'C9300-NET-456', purchaseDate: '2020-01-15T00:00:00.000Z', poNumber: 'PO-2020-0011', supplier: 'Network Systems Ltd', assignedTo: null, warrantyEnd: '2023-01-15T00:00:00.000Z' },
  { id: '7', tagNumber: 'TAG-007', name: 'MacBook Pro 16"', type: 'Computer', location: 'Finance', value: 3200, status: 'Active', serialNumber: 'MBP16-2024-001', purchaseDate: '2024-09-01T00:00:00.000Z', poNumber: 'PO-2024-0789', supplier: 'Tech Supplies PLC', assignedTo: 'Finance Director', warrantyEnd: '2026-09-01T00:00:00.000Z' },
  { id: '8', tagNumber: 'TAG-008', name: 'L-Shaped Desk', type: 'Furniture', location: 'Admin', value: 680, status: 'Active', serialNumber: 'DSK-LSH-012', purchaseDate: '2024-07-15T00:00:00.000Z', poNumber: 'PO-2024-0450', supplier: 'Furniture World PLC', assignedTo: 'Admin Team', warrantyEnd: '2027-07-15T00:00:00.000Z' },
  { id: '9', tagNumber: 'TAG-009', name: 'Epson L15150 Printer', type: 'Equipment', location: 'HR Dept', value: 890, status: 'Maintenance', serialNumber: 'L15150-PRN-003', purchaseDate: '2023-11-20T00:00:00.000Z', poNumber: 'PO-2023-0891', supplier: 'OfficeTech Trading', assignedTo: 'HR Admin', warrantyEnd: '2025-11-20T00:00:00.000Z' },
  { id: '10', tagNumber: 'TAG-010', name: 'Toyota Hilux', type: 'Vehicle', location: 'Parking', value: 45000, status: 'Active', serialNumber: 'HLX-2024-456', purchaseDate: '2024-05-10T00:00:00.000Z', poNumber: 'PO-2024-0345', supplier: 'EthioMotors PLC', assignedTo: 'Field Team', warrantyEnd: '2029-05-10T00:00:00.000Z' },
  { id: '11', tagNumber: 'TAG-011', name: 'Ubiquiti Access Points', type: 'Network', location: 'ServerRm', value: 560, status: 'Active', serialNumber: 'UAP-AC-789', purchaseDate: '2024-10-01T00:00:00.000Z', poNumber: 'PO-2024-0912', supplier: 'Network Systems Ltd', assignedTo: 'IT Admin', warrantyEnd: '2026-10-01T00:00:00.000Z' },
  { id: '12', tagNumber: 'TAG-012', name: 'Samsung 49" Monitor', type: 'Monitor', location: 'IT Dept', value: 1200, status: 'Active', serialNumber: 'S49-CR-001', purchaseDate: '2024-12-01T00:00:00.000Z', poNumber: 'PO-2024-1123', supplier: 'Tech Supplies PLC', assignedTo: 'John Doe', warrantyEnd: '2027-12-01T00:00:00.000Z' },
  { id: '13', tagNumber: 'TAG-013', name: 'Conference Table', type: 'Furniture', location: 'Admin', value: 2100, status: 'Active', serialNumber: 'CNF-TBL-002', purchaseDate: '2024-04-20T00:00:00.000Z', poNumber: 'PO-2024-0290', supplier: 'Furniture World PLC', assignedTo: null, warrantyEnd: '2027-04-20T00:00:00.000Z' },
  { id: '14', tagNumber: 'TAG-014', name: 'HP LaserJet M404', type: 'Equipment', location: 'Finance', value: 420, status: 'Disposed', serialNumber: 'M404-PRN-007', purchaseDate: '2019-08-15T00:00:00.000Z', poNumber: 'PO-2019-0056', supplier: 'OfficeTech Trading', assignedTo: null, warrantyEnd: '2022-08-15T00:00:00.000Z' },
  { id: '15', tagNumber: 'TAG-015', name: 'UPS Backup System', type: 'Equipment', location: 'ServerRm', value: 1800, status: 'Active', serialNumber: 'UPS-SRV-002', purchaseDate: '2024-11-01T00:00:00.000Z', poNumber: 'PO-2024-1011', supplier: 'Server Solutions Inc', assignedTo: 'IT Admin', warrantyEnd: '2027-11-01T00:00:00.000Z' }
];

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent {
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

  allProperties = signal<Property[]>(MOCK_PROPERTIES);

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
