import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Location {
  id: string;
  name: string;
  type: string;
  icon: string;
  parentId: string | null;
  propertiesCount: number;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss']
})
export class LocationListComponent {
  searchTerm = signal('');
  typeFilter = signal('All Types');
  parentFilter = signal('All');
  viewMode = signal('tree');
  showModal = signal(false);
  selectedLocation = signal<Location | null>(null);

  locationTypes = ['All Types', 'Building', 'Floor', 'Department', 'Room', 'Warehouse', 'Aisle', 'Shelf'];

  locations = signal<Location[]>([
    { id: '1', name: 'Headquarters', type: 'Building', icon: '🏢', parentId: null, propertiesCount: 234, status: 'Active' },
    { id: '2', name: 'Floor 1', type: 'Floor', icon: '📍', parentId: '1', propertiesCount: 45, status: 'Active' },
    { id: '3', name: 'IT Department', type: 'Department', icon: '💻', parentId: '2', propertiesCount: 28, status: 'Active' },
    { id: '4', name: 'HR Department', type: 'Department', icon: '👥', parentId: '2', propertiesCount: 12, status: 'Active' },
    { id: '5', name: 'Finance', type: 'Department', icon: '💰', parentId: '2', propertiesCount: 18, status: 'Active' },
    { id: '6', name: 'Floor 2', type: 'Floor', icon: '📍', parentId: '1', propertiesCount: 67, status: 'Active' },
    { id: '7', name: 'Sales', type: 'Department', icon: '📊', parentId: '6', propertiesCount: 15, status: 'Active' },
    { id: '8', name: 'Marketing', type: 'Department', icon: '�', parentId: '6', propertiesCount: 8, status: 'Active' },
    { id: '9', name: 'Floor 3', type: 'Floor', icon: '📍', parentId: '1', propertiesCount: 89, status: 'Active' },
    { id: '10', name: 'Executive', type: 'Department', icon: '👔', parentId: '9', propertiesCount: 8, status: 'Active' },
    { id: '11', name: 'Warehouse A', type: 'Warehouse', icon: '🏭', parentId: null, propertiesCount: 156, status: 'Active' },
    { id: '12', name: 'Aisle A', type: 'Aisle', icon: '📦', parentId: '11', propertiesCount: 45, status: 'Active' },
    { id: '13', name: 'Aisle B', type: 'Aisle', icon: '�', parentId: '11', propertiesCount: 67, status: 'Active' },
    { id: '14', name: 'Aisle C', type: 'Aisle', icon: '📦', parentId: '11', propertiesCount: 44, status: 'Active' },
    { id: '15', name: 'Warehouse B', type: 'Warehouse', icon: '🏭', parentId: null, propertiesCount: 57, status: 'Active' },
    { id: '16', name: 'Aisle A', type: 'Aisle', icon: '📦', parentId: '15', propertiesCount: 34, status: 'Active' },
    { id: '17', name: 'Aisle B', type: 'Aisle', icon: '📦', parentId: '15', propertiesCount: 23, status: 'Active' },
    { id: '18', name: 'Branch Office', type: 'Building', icon: '🏢', parentId: null, propertiesCount: 45, status: 'Active' },
    { id: '19', name: 'Floor 1', type: 'Floor', icon: '📍', parentId: '18', propertiesCount: 25, status: 'Active' },
    { id: '20', name: 'Floor 2', type: 'Floor', icon: '📍', parentId: '18', propertiesCount: 20, status: 'Active' }
  ]);

  modalFormData = signal({
    name: '',
    type: 'Department',
    parentId: '' as string | null,
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
    maxCapacity: '',
    allowStorage: true,
    active: true,
    generateQR: true
  });

  filteredLocations = signal<Location[]>([]);

  constructor() {
    this.filterLocations();
  }

  filterLocations(): void {
    const search = this.searchTerm().toLowerCase();
    const type = this.typeFilter();
    const parent = this.parentFilter();

    this.filteredLocations.set(
      this.locations().filter(loc => {
        const matchesSearch = loc.name.toLowerCase().includes(search);
        const matchesType = type === 'All Types' || loc.type === type;
        const matchesParent = parent === 'All' || loc.parentId === parent;
        return matchesSearch && matchesType && matchesParent;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterLocations();
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value);
    this.filterLocations();
  }

  onParentFilterChange(value: string): void {
    this.parentFilter.set(value);
    this.filterLocations();
  }

  setViewMode(mode: 'tree' | 'list'): void {
    this.viewMode.set(mode);
  }

  openAddModal(): void {
    this.selectedLocation.set(null);
    this.modalFormData.set({
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
      maxCapacity: '',
      allowStorage: true,
      active: true,
      generateQR: true
    });
    this.showModal.set(true);
  }

  openEditModal(location: Location): void {
    this.selectedLocation.set(location);
    this.modalFormData.set({
      name: location.name,
      type: location.type,
      parentId: location.parentId,
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
      maxCapacity: '',
      allowStorage: true,
      active: location.status === 'Active',
      generateQR: true
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedLocation.set(null);
  }

  saveLocation(): void {
    const data = this.modalFormData();
    const editing = this.selectedLocation();

    if (editing) {
      this.locations.update(locs =>
        locs.map(l => l.id === editing.id ? { ...l, name: data.name, type: data.type, parentId: data.parentId, status: data.active ? 'Active' : 'Inactive' } : l)
      );
    } else {
      const icons: { [key: string]: string } = {
        Building: '🏢',
        Floor: '📍',
        Department: '💻',
        Room: '🚪',
        Warehouse: '🏭',
        Aisle: '📦',
        Shelf: '🗄️'
      };
      const newLocation: Location = {
        id: Date.now().toString(),
        name: data.name,
        type: data.type,
        icon: icons[data.type] || '📍',
        parentId: data.parentId,
        propertiesCount: 0,
        status: data.active ? 'Active' : 'Inactive'
      };
      this.locations.update(locs => [...locs, newLocation]);
    }

    this.filterLocations();
    this.closeModal();
  }

  deleteLocation(id: string): void {
    if (confirm('Are you sure you want to delete this location?')) {
      this.locations.update(locs => locs.filter(l => l.id !== id));
      this.filterLocations();
    }
  }

  toggleStatus(id: string): void {
    this.locations.update(locs =>
      locs.map(l => l.id === id ? { ...l, status: l.status === 'Active' ? 'Inactive' : 'Active' } : l)
    );
    this.filterLocations();
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.modalFormData.update(d => ({ ...d, latitude: position.coords.latitude.toString(), longitude: position.coords.longitude.toString() }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }
}
