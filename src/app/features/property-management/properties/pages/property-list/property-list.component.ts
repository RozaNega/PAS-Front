import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}
