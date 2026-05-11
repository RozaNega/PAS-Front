import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafetyBoxService } from '../../services/safety-box.service';
import { LocationService, LocationDto } from '../../../locations/services/location.service';

interface SafetyBox {
  id: string;
  boxNumber: string;
  location: string;
  totalShelves: number;
  occupiedShelves: number;
  status: 'Empty' | 'Low' | 'Moderate' | 'High' | 'Full';
}

@Component({
  selector: 'app-safety-box-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './safety-box-list.component.html',
  styleUrls: ['./safety-box-list.component.scss']
})
export class SafetyBoxListComponent {
  readonly safetyBoxService = inject(SafetyBoxService);
  readonly locationService = inject(LocationService);
  searchTerm = signal('');
  locationFilter = signal('All');
  showModal = signal(false);
  selectedBox = signal<SafetyBox | null>(null);
  isLoading = signal(false);

  // Loaded from backend API with actual GUIDs
  backendLocations = signal<LocationDto[]>([]);
  locations = ['All', 'IT Department', 'HR Department', 'Finance', 'Warehouse', 'Storage', 'Sales', 'Executive'];

  safetyBoxes = signal<SafetyBox[]>([
    { id: '1', boxNumber: 'SAF-001', location: 'IT Department', totalShelves: 12, occupiedShelves: 8, status: 'Moderate' },
    { id: '2', boxNumber: 'SAF-002', location: 'HR Department', totalShelves: 8, occupiedShelves: 5, status: 'Moderate' },
    { id: '3', boxNumber: 'SAF-003', location: 'Finance', totalShelves: 10, occupiedShelves: 10, status: 'Full' },
    { id: '4', boxNumber: 'SAF-004', location: 'Warehouse', totalShelves: 6, occupiedShelves: 3, status: 'Moderate' },
    { id: '5', boxNumber: 'SAF-005', location: 'Storage', totalShelves: 8, occupiedShelves: 0, status: 'Empty' },
    { id: '6', boxNumber: 'SAF-006', location: 'Sales', totalShelves: 6, occupiedShelves: 4, status: 'Low' },
    { id: '7', boxNumber: 'SAF-007', location: 'Executive', totalShelves: 10, occupiedShelves: 7, status: 'Moderate' }
  ]);

  modalFormData = signal({
    boxNumber: '',
    locationId: '',
    locationName: '',
    totalShelves: 12,
    description: '',
    keyCardRequired: true,
    biometricAccess: true,
    cctvMonitored: true,
    access247: true,
    accessCode: '',
    autoCreateShelves: true,
    shelfNamingConvention: 'Shelf-01, Shelf-02...'
  });

  filteredBoxes = signal<SafetyBox[]>([]);

  constructor() {
    this.loadLocations();
    this.loadSafetyBoxes();
  }

  loadLocations(): void {
    this.locationService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.backendLocations.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading locations:', error);
      }
    });
  }

  loadSafetyBoxes(): void {
    this.isLoading.set(true);
    this.safetyBoxService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.safetyBoxes.set(response.data.map(box => ({
            id: box.id,
            boxNumber: box.boxNumber,
            location: box.locationId,
            totalShelves: box.capacity,
            occupiedShelves: box.currentCount,
            status: box.currentCount === 0 ? 'Empty' : box.currentCount / box.capacity * 100 <= 30 ? 'Low' : box.currentCount / box.capacity * 100 <= 60 ? 'Moderate' : box.currentCount / box.capacity * 100 <= 80 ? 'High' : 'Full'
          })));
          this.filterBoxes();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading safety boxes:', error);
        this.isLoading.set(false);
      }
    });
  }

  filterBoxes(): void {
    const search = this.searchTerm().toLowerCase();
    const location = this.locationFilter();

    this.filteredBoxes.set(
      this.safetyBoxes().filter(box => {
        const matchesSearch = box.boxNumber.toLowerCase().includes(search) || box.location.toLowerCase().includes(search);
        const matchesLocation = location === 'All' || box.location === location;
        return matchesSearch && matchesLocation;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterBoxes();
  }

  onLocationSelect(locationId: string): void {
    const loc = this.backendLocations().find(l => l.id === locationId);
    this.modalFormData.update(d => ({ ...d, locationId, locationName: loc?.name || '' }));
  }

  onLocationFilterChange(value: string): void {
    this.locationFilter.set(value);
    this.filterBoxes();
  }

  getOccupancyPercentage(box: SafetyBox): number {
    return Math.round((box.occupiedShelves / box.totalShelves) * 100);
  }

  getOccupancyColor(percentage: number): string {
    if (percentage === 0) return 'gray';
    if (percentage <= 30) return 'green';
    if (percentage <= 60) return 'yellow';
    if (percentage <= 80) return 'orange';
    return 'red';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      Empty: '⚪ Empty',
      Low: '🟢 Good',
      Moderate: '🟡 Fair',
      High: '🟠 Limited',
      Full: '🔴 Full'
    };
    return labels[status] || status;
  }

  openAddModal(): void {
    this.selectedBox.set(null);
    this.modalFormData.set({
      boxNumber: '',
      locationId: '',
      locationName: '',
      totalShelves: 12,
      description: '',
      keyCardRequired: true,
      biometricAccess: true,
      cctvMonitored: true,
      access247: true,
      accessCode: '',
      autoCreateShelves: true,
      shelfNamingConvention: 'Shelf-01, Shelf-02...'
    });
    this.showModal.set(true);
  }

  openEditModal(box: SafetyBox): void {
    this.selectedBox.set(box);
    // Find the location GUID from backend locations
    const backendLoc = this.backendLocations().find(l => l.name === box.location);
    this.modalFormData.set({
      boxNumber: box.boxNumber,
      locationId: backendLoc?.id || '',
      locationName: box.location,
      totalShelves: box.totalShelves,
      description: '',
      keyCardRequired: true,
      biometricAccess: true,
      cctvMonitored: true,
      access247: true,
      accessCode: '',
      autoCreateShelves: true,
      shelfNamingConvention: 'Shelf-01, Shelf-02...'
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedBox.set(null);
  }

  saveBox(): void {
    const data = this.modalFormData();
    const editing = this.selectedBox();

    if (editing) {
      this.safetyBoxService.update(editing.id, {
        BoxNumber: data.boxNumber,
        TotalShelves: data.totalShelves,
        LocationId: data.locationId
      }).subscribe({
        next: () => {
          this.safetyBoxes.update(boxes =>
            boxes.map(b => b.id === editing.id ? { ...b, boxNumber: data.boxNumber, location: data.locationName, totalShelves: data.totalShelves } : b)
          );
          this.filterBoxes();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating safety box:', error);
          alert('Failed to update safety box');
        }
      });
    } else {
      this.safetyBoxService.create({
        BoxNumber: data.boxNumber,
        TotalShelves: data.totalShelves,
        LocationId: data.locationId
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const newBox: SafetyBox = {
              id: response.data || Date.now().toString(),
              boxNumber: data.boxNumber,
              location: data.locationName || data.locationId,
              totalShelves: data.totalShelves,
              occupiedShelves: 0,
              status: 'Empty'
            };
            this.safetyBoxes.update(boxes => [...boxes, newBox]);
            this.filterBoxes();
            this.closeModal();
          } else {
            console.error('Server returned failure:', response.message);
            alert('Failed to create safety box: ' + (response.message || 'Unknown error'));
          }
        },
        error: (error) => {
          console.error('HTTP Error creating safety box:', error);
          console.error('Error response body:', error.error);
          alert('Failed to create safety box: ' + (error.error?.message || error.message || 'Server error'));
        }
      });
    }
  }

  deleteBox(id: string): void {
    if (confirm('Are you sure you want to delete this safety box?')) {
      this.safetyBoxService.delete(id).subscribe({
        next: () => {
          this.safetyBoxes.update(boxes => boxes.filter(b => b.id !== id));
          this.filterBoxes();
        },
        error: (error) => {
          console.error('Error deleting safety box:', error);
          alert('Failed to delete safety box');
        }
      });
    }
  }
}
