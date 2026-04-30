import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Shelf {
  id: string;
  shelfNumber: string;
  status: 'Empty' | 'Partial' | 'Full';
  itemsCount: number;
  capacity: number;
}

@Component({
  selector: 'app-shelf-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-list.component.html',
  styleUrls: ['./shelf-list.component.scss']
})
export class ShelfListComponent {
  selectedSafetyBox = signal('SAF-001 (IT Department)');
  showModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);

  safetyBoxes = ['SAF-001 (IT Department)', 'SAF-002 (HR Department)', 'SAF-003 (Finance)', 'SAF-004 (Warehouse)'];

  shelves = signal<Shelf[]>([
    { id: '1', shelfNumber: 'Shelf-01', status: 'Full', itemsCount: 2, capacity: 10 },
    { id: '2', shelfNumber: 'Shelf-02', status: 'Full', itemsCount: 3, capacity: 10 },
    { id: '3', shelfNumber: 'Shelf-03', status: 'Full', itemsCount: 1, capacity: 10 },
    { id: '4', shelfNumber: 'Shelf-04', status: 'Partial', itemsCount: 1, capacity: 10 },
    { id: '5', shelfNumber: 'Shelf-05', status: 'Empty', itemsCount: 0, capacity: 10 },
    { id: '6', shelfNumber: 'Shelf-06', status: 'Empty', itemsCount: 0, capacity: 10 },
    { id: '7', shelfNumber: 'Shelf-07', status: 'Full', itemsCount: 2, capacity: 10 },
    { id: '8', shelfNumber: 'Shelf-08', status: 'Partial', itemsCount: 1, capacity: 10 },
    { id: '9', shelfNumber: 'Shelf-09', status: 'Empty', itemsCount: 0, capacity: 10 },
    { id: '10', shelfNumber: 'Shelf-10', status: 'Empty', itemsCount: 0, capacity: 10 },
    { id: '11', shelfNumber: 'Shelf-11', status: 'Empty', itemsCount: 0, capacity: 10 },
    { id: '12', shelfNumber: 'Shelf-12', status: 'Empty', itemsCount: 0, capacity: 10 }
  ]);

  modalFormData = signal({
    shelfNumber: '',
    description: '',
    capacity: 10,
    maxWeight: 50,
    generateQR: true,
    qrValue: ''
  });

  onSafetyBoxChange(value: string): void {
    this.selectedSafetyBox.set(value);
  }

  getOccupancyPercentage(shelf: Shelf): number {
    return Math.round((shelf.itemsCount / shelf.capacity) * 100);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Empty: 'gray',
      Partial: 'yellow',
      Full: 'green'
    };
    return colors[status] || 'gray';
  }

  openAddModal(): void {
    this.selectedShelf.set(null);
    const nextShelfNum = this.shelves().length + 1;
    this.modalFormData.set({
      shelfNumber: `Shelf-${nextShelfNum.toString().padStart(2, '0')}`,
      description: '',
      capacity: 10,
      maxWeight: 50,
      generateQR: true,
      qrValue: `${this.selectedSafetyBox().split(' ')[0]}-SHELF-${nextShelfNum.toString().padStart(2, '0')}`
    });
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalFormData.set({
      shelfNumber: shelf.shelfNumber,
      description: '',
      capacity: shelf.capacity,
      maxWeight: 50,
      generateQR: true,
      qrValue: `${this.selectedSafetyBox().split(' ')[0]}-${shelf.shelfNumber.toUpperCase()}`
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedShelf.set(null);
  }

  saveShelf(): void {
    const data = this.modalFormData();
    const editing = this.selectedShelf();

    let status: 'Empty' | 'Partial' | 'Full' = 'Empty';
    if (editing) {
      status = editing.status;
    }

    if (editing) {
      this.shelves.update(shelves =>
        shelves.map(s => s.id === editing.id ? { ...s, shelfNumber: data.shelfNumber, capacity: data.capacity } : s)
      );
    } else {
      const newShelf: Shelf = {
        id: Date.now().toString(),
        shelfNumber: data.shelfNumber,
        status,
        itemsCount: 0,
        capacity: data.capacity
      };
      this.shelves.update(shelves => [...shelves, newShelf]);
    }

    this.closeModal();
  }

  deleteShelf(id: string): void {
    if (confirm('Are you sure you want to delete this shelf?')) {
      this.shelves.update(shelves => shelves.filter(s => s.id !== id));
    }
  }
}
