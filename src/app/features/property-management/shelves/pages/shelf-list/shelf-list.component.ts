import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShelvesService, ShelfLocationDto } from '../../../../../core/services/shelves.service';
import { WarehousesService, WarehouseDto } from '../../../../../core/services/warehouses.service';
import { finalize } from 'rxjs';

interface Shelf {
  id: string;
  shelfNumber: string;
  status: 'Empty' | 'Partial' | 'Full';
  itemsCount: number;
  capacity: number;
  description?: string;
}

@Component({
  selector: 'app-shelf-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shelf-list.component.html',
  styleUrls: ['./shelf-list.component.scss']
})
export class ShelfListComponent implements OnInit {
  private shelvesService = inject(ShelvesService);
  private warehousesService = inject(WarehousesService);

  isLoading = signal(false);
  selectedWarehouse = signal<WarehouseDto | null>(null);
  selectedSafetyBox = signal(''); // Keep this for template compatibility if needed, but we'll use selectedWarehouse
  showModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);

  safetyBoxes = signal<WarehouseDto[]>([]);
  shelves = signal<Shelf[]>([]);

  modalFormData = {
    shelfNumber: '',
    description: '',
    capacity: 10,
    maxWeight: 50,
    generateQR: true,
    qrValue: ''
  };

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.isLoading.set(true);
    this.warehousesService.getAll().pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.safetyBoxes.set(response.data);
          if (response.data.length > 0) {
            this.selectedWarehouse.set(response.data[0]);
            this.selectedSafetyBox.set(response.data[0].warehouseName);
            this.loadShelves(response.data[0].id);
          }
        }
      }
    });
  }

  loadShelves(warehouseId: string): void {
    this.isLoading.set(true);
    this.shelvesService.getAll({ warehouseId }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const mappedShelves: Shelf[] = response.data.map(dto => ({
            id: dto.id,
            shelfNumber: dto.shelfCode,
            itemsCount: dto.currentUtilization || 0,
            capacity: dto.capacity || 10,
            description: dto.description,
            status: this.calculateStatus(dto.currentUtilization || 0, dto.capacity || 10)
          }));
          this.shelves.set(mappedShelves);
        }
      }
    });
  }

  calculateStatus(count: number, capacity: number): 'Empty' | 'Partial' | 'Full' {
    if (count === 0) return 'Empty';
    if (count >= capacity) return 'Full';
    return 'Partial';
  }

  onWarehouseIdChange(id: string): void {
    const warehouse = this.safetyBoxes().find(w => w.id === id);
    if (warehouse) {
      this.selectedWarehouse.set(warehouse);
      this.selectedSafetyBox.set(warehouse.warehouseName);
      this.loadShelves(warehouse.id);
    }
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
    this.modalFormData = {
      shelfNumber: `Shelf-${nextShelfNum.toString().padStart(2, '0')}`,
      description: '',
      capacity: 10,
      maxWeight: 50,
      generateQR: true,
      qrValue: `${this.selectedSafetyBox().split(' ')[0]}-SHELF-${nextShelfNum.toString().padStart(2, '0')}`
    };
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalFormData = {
      shelfNumber: shelf.shelfNumber,
      description: shelf.description || '',
      capacity: shelf.capacity,
      maxWeight: 50,
      generateQR: true,
      qrValue: `${this.selectedSafetyBox().split(' ')[0]}-${shelf.shelfNumber.toUpperCase()}`
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedShelf.set(null);
  }

  saveShelf(): void {
    const data = this.modalFormData;
    const editing = this.selectedShelf();
    const warehouse = this.selectedWarehouse();

    if (!warehouse) return;

    this.isLoading.set(true);

    if (editing) {
      this.shelvesService.update({
        id: editing.id,
        shelfCode: data.shelfNumber,
        shelfName: data.shelfNumber,
        warehouseId: warehouse.id,
        capacity: data.capacity,
        description: data.description,
        isActive: true
      }).pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadShelves(warehouse.id);
            this.closeModal();
          }
        }
      });
    } else {
      this.shelvesService.create({
        shelfCode: data.shelfNumber,
        shelfName: data.shelfNumber,
        warehouseId: warehouse.id,
        capacity: data.capacity,
        description: data.description
      }).pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadShelves(warehouse.id);
            this.closeModal();
          }
        }
      });
    }
  }

  deleteShelf(id: string): void {
    if (confirm('Are you sure you want to delete this shelf?')) {
      const warehouse = this.selectedWarehouse();
      if (!warehouse) return;

      this.isLoading.set(true);
      this.shelvesService.delete(id).pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadShelves(warehouse.id);
          }
        }
      });
    }
  }
}
