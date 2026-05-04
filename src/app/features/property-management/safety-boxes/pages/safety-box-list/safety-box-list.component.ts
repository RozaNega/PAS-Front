import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  searchTerm = signal('');
  locationFilter = signal('All');
  showModal = signal(false);
  selectedBox = signal<SafetyBox | null>(null);

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
    location: '',
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
    this.filterBoxes();
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
      location: '',
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
    this.modalFormData.set({
      boxNumber: box.boxNumber,
      location: box.location,
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

    const occupancy = 0;
    let status: 'Empty' | 'Low' | 'Moderate' | 'High' | 'Full' = 'Empty';
    const percentage = occupancy / data.totalShelves * 100;
    if (percentage === 0) status = 'Empty';
    else if (percentage <= 30) status = 'Low';
    else if (percentage <= 60) status = 'Moderate';
    else if (percentage <= 80) status = 'High';
    else status = 'Full';

    if (editing) {
      this.safetyBoxes.update(boxes =>
        boxes.map(b => b.id === editing.id ? { ...b, boxNumber: data.boxNumber, location: data.location, totalShelves: data.totalShelves } : b)
      );
    } else {
      const newBox: SafetyBox = {
        id: Date.now().toString(),
        boxNumber: data.boxNumber,
        location: data.location,
        totalShelves: data.totalShelves,
        occupiedShelves: 0,
        status
      };
      this.safetyBoxes.update(boxes => [...boxes, newBox]);
    }

    this.filterBoxes();
    this.closeModal();
  }

  deleteBox(id: string): void {
    if (confirm('Are you sure you want to delete this safety box?')) {
      this.safetyBoxes.update(boxes => boxes.filter(b => b.id !== id));
      this.filterBoxes();
    }
  }
}
