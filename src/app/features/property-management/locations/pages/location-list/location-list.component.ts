import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService, LocationDto } from '../../services/location.service';

interface Location {
  id: string;
  name: string;
  type: string;
  icon: string;
  parentId: string | null;
  propertiesCount: number;
  status: 'Active' | 'Inactive';
  children?: Location[];
}

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss']
})
export class LocationListComponent {
  readonly locationService = inject(LocationService);
  searchTerm = signal('');
  typeFilter = signal('All Types');
  parentFilter = signal('All');
  viewMode = signal<'tree' | 'list'>('tree');
  showModal = signal(false);
  selectedLocation = signal<Location | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  locationTypes = ['All Types', 'Building', 'Floor', 'Department', 'Room', 'Warehouse', 'Aisle', 'Shelf'];

  locations = signal<Location[]>([]);

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
  treeStructure = computed(() => this.buildTreeStructure(this.filteredLocations()));

  locationStats = computed(() => {
    const locs = this.locations();
    return {
      total: locs.length,
      buildings: locs.filter(l => l.type === 'Building').length,
      floors: locs.filter(l => l.type === 'Floor').length,
      departments: locs.filter(l => l.type === 'Department' || l.type === 'Room').length,
    };
  });

  constructor() {
    this.loadLocations();
  }

  loadLocations(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.locationService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const icons: { [key: string]: string } = {
            Building: '🏢',
            Floor: '📍',
            Department: '💻',
            Room: '🚪',
            Warehouse: '🏭',
            Aisle: '📦',
            Shelf: '🗄️'
          };

          const locations: Location[] = (response.data as LocationDto[]).map((loc) => ({
            id: loc.id,
            name: loc.name,
            type: this.inferLocationType(loc.name),
            icon: icons[this.inferLocationType(loc.name)] || '📍',
            parentId: null,
            propertiesCount: 0,
            status: loc.isActive ? 'Active' : 'Inactive'
          }));

          this.locations.set(locations);
          this.filterLocations();
        } else {
          this.error.set(response.message || 'Failed to load locations');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading locations:', err);
        this.error.set('Failed to load locations from server. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  private inferLocationType(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('floor')) return 'Floor';
    if (nameLower.includes('department') || nameLower.includes('dept')) return 'Department';
    if (nameLower.includes('warehouse') || nameLower.includes('warehouse')) return 'Warehouse';
    if (nameLower.includes('aisle')) return 'Aisle';
    if (nameLower.includes('shelf')) return 'Shelf';
    if (nameLower.includes('room') || nameLower.includes('office')) return 'Room';
    return 'Building';
  }

  private buildTreeStructure(locations: Location[]): Location[] {
    const locationMap = new Map<string, Location>();
    const roots: Location[] = [];

    locations.forEach(loc => {
      locationMap.set(loc.id, { ...loc, children: [] });
    });

    locations.forEach(loc => {
      const node = locationMap.get(loc.id);
      if (node) {
        if (loc.parentId && locationMap.has(loc.parentId)) {
          const parent = locationMap.get(loc.parentId);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          }
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
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

    if (!data.name.trim()) {
      alert('Location name is required');
      return;
    }

    if (editing) {
      this.locationService.update(editing.id, {
        name: data.name,
        address: data.addressLine1,
        city: data.city,
        isActive: data.active
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.locations.update(locs =>
              locs.map(l => l.id === editing.id
                ? {
                    ...l,
                    name: data.name,
                    type: data.type,
                    parentId: data.parentId as string | null,
                    status: data.active ? 'Active' : 'Inactive'
                  }
                : l
              )
            );
            this.filterLocations();
            this.closeModal();
            alert('Location updated successfully');
          } else {
            alert(response.message || 'Failed to update location');
          }
        },
        error: (error) => {
          console.error('Error updating location:', error);
          alert('Failed to update location');
        }
      });
    } else {
      this.locationService.create({
        name: data.name,
        address: data.addressLine1,
        city: data.city,
        isActive: data.active
      }).subscribe({
        next: (response) => {
          if (response.success) {
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
              id: response.data || Date.now().toString(),
              name: data.name,
              type: data.type,
              icon: icons[data.type] || '📍',
              parentId: data.parentId as string | null,
              propertiesCount: 0,
              status: data.active ? 'Active' : 'Inactive'
            };
            this.locations.update(locs => [...locs, newLocation]);
            this.filterLocations();
            this.closeModal();
            alert('Location created successfully');
          } else {
            alert(response.message || 'Failed to create location');
          }
        },
        error: (error) => {
          console.error('Error creating location:', error);
          alert('Failed to create location');
        }
      });
    }
  }

  deleteLocation(id: string): void {
    if (confirm('Are you sure you want to delete this location?')) {
      this.locationService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.locations.update(locs => locs.filter(l => l.id !== id));
            this.filterLocations();
            alert('Location deleted successfully');
          } else {
            alert(response.message || 'Failed to delete location');
          }
        },
        error: (error) => {
          console.error('Error deleting location:', error);
          alert('Failed to delete location');
        }
      });
    }
  }

  toggleStatus(id: string): void {
    const location = this.locations().find(l => l.id === id);
    if (location) {
      const newStatus = location.status === 'Active' ? false : true;
      this.locationService.update(id, {
        name: location.name,
        isActive: newStatus
      }).subscribe({
        next: (response) => {
          if (response.success) {
            this.locations.update(locs =>
              locs.map(l => l.id === id ? { ...l, status: l.status === 'Active' ? 'Inactive' : 'Active' } : l)
            );
            this.filterLocations();
          } else {
            alert(response.message || 'Failed to update location status');
          }
        },
        error: (error) => {
          console.error('Error updating location status:', error);
          alert('Failed to update location status');
        }
      });
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.modalFormData.update(d => ({
            ...d,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }

  retryLoad(): void {
    this.loadLocations();
  }

  getIconClass(type: string): string {
    const classMap: { [key: string]: string } = {
      Building: 'icon-building',
      Floor: 'icon-floor',
      Department: 'icon-department',
      Room: 'icon-room',
      Warehouse: 'icon-warehouse',
      Aisle: 'icon-aisle',
      Shelf: 'icon-shelf'
    };
    return classMap[type] || 'icon-default';
  }

  getIconClassSolid(type: string): string {
    const iconMap: { [key: string]: string } = {
      Building: 'bi bi-building',
      Floor: 'bi bi-layers-fill',
      Department: 'bi bi-door-closed',
      Room: 'bi bi-door-closed-fill',
      Warehouse: 'bi bi-box-seam-fill',
      Aisle: 'bi bi-columns-gap',
      Shelf: 'bi bi-stack'
    };
    return iconMap[type] || 'bi bi-geo-alt';
  }
}
