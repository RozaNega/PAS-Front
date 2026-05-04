import { Component, signal, inject } from '@angular/core';
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
}

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent {
  readonly router = inject(Router);

  searchTerm = signal('');
  typeFilter = signal('All Types');
  locationFilter = signal('All Locations');
  statusFilter = signal('All Status');
  purchaseFilter = signal('All Dates');

  propertyTypes = ['All Types', 'Computer', 'Monitor', 'Furniture', 'Equipment', 'Vehicle', 'Network'];
  locations = ['All Locations', 'IT Dept', 'HR Dept', 'ServerRm', 'Parking', 'Finance', 'Sales'];
  statuses = ['All Status', 'Active', 'Maintenance', 'Disposed'];
  purchaseDates = ['All Dates', 'This Week', 'This Month', 'This Year'];

  properties = signal<Property[]>([
    { id: '1', tagNumber: 'TAG-001', name: 'Dell XPS Laptop', type: 'Computer', location: 'IT Dept', value: 2499, status: 'Active' },
    { id: '2', tagNumber: 'TAG-002', name: 'HP Monitor', type: 'Monitor', location: 'IT Dept', value: 350, status: 'Active' },
    { id: '3', tagNumber: 'TAG-003', name: 'Office Chair', type: 'Furniture', location: 'HR Dept', value: 450, status: 'Maintenance' },
    { id: '4', tagNumber: 'TAG-004', name: 'Server Rack', type: 'Equipment', location: 'ServerRm', value: 2800, status: 'Active' },
    { id: '5', tagNumber: 'TAG-005', name: 'Ford Transit', type: 'Vehicle', location: 'Parking', value: 35000, status: 'Active' },
    { id: '6', tagNumber: 'TAG-006', name: 'Cisco Switch', type: 'Network', location: 'IT Dept', value: 1200, status: 'Disposed' }
  ]);

  summary = signal({
    totalProperties: 1234,
    totalValue: 2543890,
    avgValue: 2061,
    thisMonthAdded: 23,
    activeStatus: 1189
  });

  showModal = signal(false);
  selectedProperty = signal<Property | null>(null);
  showBulkActionsDropdown = signal(false);

  filteredProperties = signal<Property[]>([]);

  constructor() {
    this.filterProperties();
  }

  filterProperties(): void {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const location = this.locationFilter();
    const status = this.statusFilter();

    this.filteredProperties.set(
      this.properties().filter(prop => {
        const matchesSearch = prop.tagNumber.toLowerCase().includes(search) || 
                              prop.name.toLowerCase().includes(search);
        const matchesType = type === 'All Types' || prop.type === type;
        const matchesLocation = location === 'All Locations' || prop.location === location;
        const matchesStatus = status === 'All Status' || prop.status === status;
        return matchesSearch && matchesType && matchesLocation && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterProperties();
  }

  applyFilters(): void {
    this.filterProperties();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.typeFilter.set('All Types');
    this.locationFilter.set('All Locations');
    this.statusFilter.set('All Status');
    this.purchaseFilter.set('All Dates');
    this.filterProperties();
  }

  openDetailsModal(property: Property): void {
    this.selectedProperty.set(property);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedProperty.set(null);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Active: 'green',
      Maintenance: 'yellow',
      Disposed: 'red'
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      Active: '🟢',
      Maintenance: '🟡',
      Disposed: '🔴'
    };
    return icons[status] || '⚪';
  }

  getRandomBarWidth(base: number, variance: number): number {
    return base + Math.random() * variance;
  }

  addNewProperty(): void {
    console.log('Add new property');
    this.router.navigate(['/admin/properties/add']);
  }

  saveFilter(): void {
    console.log('Save current filter configuration');
    // Save filter to user preferences
  }

  exportProperties(): void {
    console.log('Export properties list');
    const properties = this.filteredProperties();
    const headers = ['Tag Number', 'Name', 'Type', 'Location', 'Value', 'Status'];
    const csvContent = [
      headers.join(','),
      ...properties.map(p => [
        p.tagNumber,
        p.name,
        p.type,
        p.location,
        p.value,
        p.status
      ].join(','))
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
  }

  printProperties(): void {
    console.log('Print properties list');
    window.print();
  }

  showBulkActions(): void {
    this.showBulkActionsDropdown.set(!this.showBulkActionsDropdown());
  }

  closeBulkActions(): void {
    this.showBulkActionsDropdown.set(false);
  }

  bulkDelete(): void {
    console.log('Bulk delete selected properties');
    this.closeBulkActions();
  }

  bulkTransfer(): void {
    console.log('Bulk transfer selected properties');
    this.closeBulkActions();
  }

  bulkExport(): void {
    console.log('Bulk export selected properties');
    this.closeBulkActions();
  }

  editProperty(property: Property): void {
    console.log('Edit property:', property.tagNumber);
    this.router.navigate(['/admin/properties/edit', property.id]);
  }

  transferProperty(property: Property): void {
    console.log('Transfer property:', property.tagNumber);
    // Open transfer modal
  }

  printLabel(property: Property): void {
    console.log('Print label for:', property.tagNumber);
    // Print QR label
  }

  viewQR(property: Property): void {
    console.log('View QR code for:', property.tagNumber);
    // Show QR code modal
  }

  disposeProperty(property: Property): void {
    console.log('Dispose property:', property.tagNumber);
    // Open disposal confirmation
  }

  viewAttachment(filename: string): void {
    console.log('View attachment:', filename);
    // Open file viewer
  }

  downloadAttachment(filename: string): void {
    console.log('Download attachment:', filename);
    // Download file
  }

  addAttachment(): void {
    console.log('Add new attachment');
    // Open file upload dialog
  }

  viewFullHistory(): void {
    console.log('View full history');
    // Navigate to history page
  }
}
