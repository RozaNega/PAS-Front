import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '../../../../core/services/inventory.service';
import { SafetyBoxService } from '../../../property-management/safety-boxes/services/safety-box.service';

interface Shelf {
  id: string;
  aisle: string;
  rack: string;
  shelf: string;
  items: number;
  value: number;
  occupancy: number;
}

@Component({
  selector: 'app-shelf-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './shelf-locations.component.html',
  styleUrls: ['./shelf-locations.component.scss', './shelf-locations-dialog-styles.scss']
})
export class ShelfLocationsComponent {
  readonly inventoryService = inject(InventoryService);
  readonly safetyBoxService = inject(SafetyBoxService);
  private readonly formBuilder = inject(FormBuilder);

  // Add Item Dialog
  showAddItemDialog = false;
  selectedShelfForItem: Shelf | null = null;
  addItemForm!: FormGroup;
  selectedWarehouse = signal('Warehouse A');
  searchTerm = signal('');
  aisleFilter = signal('All Aisles');
  showModal = signal(false);
  selectedShelf = signal<Shelf | null>(null);
  isLoading = signal(false);

  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Storage'];

  constructor() {
    this.addItemForm = this.formBuilder.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [100, [Validators.required, Validators.min(1)]]
    });
    this.loadShelves();
  }

  shelves = signal<Shelf[]>([
    { id: '1', aisle: 'A-01', rack: 'R-01', shelf: 'S-01', items: 234, value: 45678, occupancy: 80 },
    { id: '2', aisle: 'A-01', rack: 'R-01', shelf: 'S-02', items: 189, value: 34567, occupancy: 70 },
    { id: '3', aisle: 'A-01', rack: 'R-01', shelf: 'S-03', items: 156, value: 28901, occupancy: 60 },
    { id: '4', aisle: 'A-01', rack: 'R-02', shelf: 'S-01', items: 98, value: 12345, occupancy: 40 },
    { id: '5', aisle: 'A-02', rack: 'R-01', shelf: 'S-01', items: 67, value: 8901, occupancy: 30 },
    { id: '6', aisle: 'A-01', rack: 'R-02', shelf: 'S-02', items: 34, value: 4567, occupancy: 20 },
    { id: '7', aisle: 'A-01', rack: 'R-02', shelf: 'S-03', items: 23, value: 2345, occupancy: 15 },
    { id: '8', aisle: 'A-01', rack: 'R-02', shelf: 'S-04', items: 12, value: 1234, occupancy: 10 },
    { id: '9', aisle: 'A-02', rack: 'R-01', shelf: 'S-02', items: 5, value: 567, occupancy: 5 }
  ]);

  modalFormData = signal({
    aisle: 'A-01',
    rack: 'R-01',
    shelfNumber: 'S-01',
    shelfType: 'Standard',
    qrValue: '',
    maxCapacity: 100,
    maxWeight: 500,
    categoryRestriction: 'All Categories'
  });

  // Computed properties for summary
  totalShelves = computed(() => {
    return this.shelves().length;
  });

  totalItems = computed(() => {
    return this.shelves().reduce((sum, shelf) => sum + shelf.items, 0);
  });

  totalValue = computed(() => {
    return this.shelves().reduce((sum, shelf) => sum + shelf.value, 0);
  });

  avgOccupancy = computed(() => {
    const shelves = this.shelves();
    if (shelves.length === 0) return 0;
    const totalOccupancy = shelves.reduce((sum, shelf) => sum + shelf.occupancy, 0);
    return Math.round(totalOccupancy / shelves.length);
  });

  emptyShelves = computed(() => {
    return this.shelves().filter(shelf => shelf.items === 0).length;
  });

  filteredShelves = signal<Shelf[]>([]);

  
  loadShelves(): void {
    this.isLoading.set(true);
    this.inventoryService.getAllShelves().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.shelves.set(response.data.map(shelf => ({
            id: shelf.id,
            aisle: shelf.aisle || '',
            rack: shelf.rack || '',
            shelf: shelf.shelfNumber || '',
            items: 0,
            value: 0,
            occupancy: 0
          })));
          this.filterShelves();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading shelves:', error);
        this.isLoading.set(false);
      }
    });
  }

  filterShelves(): void {
    const search = this.searchTerm().toLowerCase();

    this.filteredShelves.set(
      this.shelves().filter(shelf => {
        const matchesSearch = shelf.aisle.toLowerCase().includes(search) || 
                              shelf.rack.toLowerCase().includes(search) || 
                              shelf.shelf.toLowerCase().includes(search);
        return matchesSearch;
      })
    );
  }

  onWarehouseChange(value: string): void {
    this.selectedWarehouse.set(value);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterShelves();
  }

  getOccupancyColor(occupancy: number): string {
    if (occupancy >= 80) return 'red';
    if (occupancy >= 60) return 'orange';
    if (occupancy >= 40) return 'yellow';
    return 'green';
  }

  openAddModal(): void {
    this.selectedShelf.set(null);
    const nextShelfNum = this.shelves().length + 1;
    this.modalFormData.set({
      aisle: 'A-01',
      rack: 'R-01',
      shelfNumber: `S-${nextShelfNum.toString().padStart(2, '0')}`,
      shelfType: 'Standard',
      qrValue: `${this.selectedWarehouse().split(' ')[1]}-A01-R01-S${nextShelfNum.toString().padStart(2, '0')}`,
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories'
    });
    this.showModal.set(true);
  }

  openEditModal(shelf: Shelf): void {
    this.selectedShelf.set(shelf);
    this.modalFormData.set({
      aisle: shelf.aisle,
      rack: shelf.rack,
      shelfNumber: shelf.shelf,
      shelfType: 'Standard',
      qrValue: `${this.selectedWarehouse().split(' ')[1]}-${shelf.aisle}-${shelf.rack}-${shelf.shelf}`,
      maxCapacity: 100,
      maxWeight: 500,
      categoryRestriction: 'All Categories'
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

    if (editing) {
      // Update existing shelf in SafetyBoxShelves
      this.safetyBoxService.update(editing.id, {
        boxNumber: `${data.aisle}-${data.rack}-${data.shelfNumber}`,
        locationId: this.selectedWarehouse(),
        shelfId: editing.id,
        description: `${data.shelfType} shelf in ${data.aisle}-${data.rack}`,
        capacity: data.maxCapacity,
        currentCount: 0,
        isActive: true
      }).subscribe({
        next: () => {
          this.shelves.update(shelves =>
            shelves.map(s => s.id === editing.id ? { ...s, aisle: data.aisle, rack: data.rack, shelf: data.shelfNumber } : s)
          );
          this.filterShelves();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating safety box shelf:', error);
          alert('Failed to update shelf');
        }
      });
    } else {
      // Create new shelf in SafetyBoxShelves
      this.safetyBoxService.create({
        boxNumber: `${data.aisle}-${data.rack}-${data.shelfNumber}`,
        locationId: this.selectedWarehouse(),
        shelfId: '', // Will be set by backend
        description: `${data.shelfType} shelf in ${data.aisle}-${data.rack}`,
        capacity: data.maxCapacity,
        currentCount: 0,
        isActive: true
      }).subscribe({
        next: (response) => {
          if (response.success) {
            const newShelf: Shelf = {
              id: response.data || Date.now().toString(),
              aisle: data.aisle,
              rack: data.rack,
              shelf: data.shelfNumber,
              items: 0,
              value: 0,
              occupancy: 0
            };
            this.shelves.update(shelves => [...shelves, newShelf]);
            this.filterShelves();
            this.closeModal();
            alert('Shelf created successfully in Safety Box Shelves!');
          }
        },
        error: (error) => {
          console.error('Error creating safety box shelf:', error);
          alert('Failed to create shelf in Safety Box Shelves');
        }
      });
    }
  }

  deleteShelf(id: string): void {
    if (confirm('Are you sure you want to delete this shelf?')) {
      this.safetyBoxService.delete(id).subscribe({
        next: () => {
          this.shelves.update(shelves => shelves.filter(s => s.id !== id));
          this.filterShelves();
        },
        error: (error) => {
          console.error('Error deleting safety box shelf:', error);
          alert('Failed to delete shelf from Safety Box Shelves');
        }
      });
    }
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    }
    return '$' + value.toString();
  }

  viewShelf(shelf: Shelf): void {
    alert(`Viewing shelf: ${shelf.aisle}-${shelf.rack}-${shelf.shelf}\nItems: ${shelf.items}\nValue: ${this.formatValue(shelf.value)}\nOccupancy: ${shelf.occupancy}%`);
  }

  addItemToShelf(shelf: Shelf): void {
    console.log('addItemToShelf called with shelf:', shelf);
    this.selectedShelfForItem = shelf;
    this.addItemForm.reset({
      itemName: '',
      quantity: 1,
      unitPrice: 100
    });
    this.showAddItemDialog = true;
    console.log('showAddItemDialog set to:', this.showAddItemDialog);
  }

  closeAddItemDialog(): void {
    this.showAddItemDialog = false;
    this.selectedShelfForItem = null;
    this.addItemForm.reset();
  }

  saveItemToShelf(): void {
    if (this.addItemForm.invalid) {
      this.addItemForm.markAllAsTouched();
      return;
    }

    const shelf = this.selectedShelfForItem;
    if (!shelf) return;

    const formValue = this.addItemForm.value;
    const quantity = formValue.quantity;
    const unitPrice = formValue.unitPrice;
    const itemName = formValue.itemName;

    // Store in database using API
    const itemData = {
      shelfId: shelf.id,
      itemName: itemName,
      quantity: quantity,
      unitPrice: unitPrice,
      totalValue: quantity * unitPrice,
      aisle: shelf.aisle,
      rack: shelf.rack,
      shelfNumber: shelf.shelf,
      warehouseId: this.selectedWarehouse().split(' ')[1], // Extract warehouse number
      addedDate: new Date().toISOString(),
      status: 'Active'
    };

    console.log('Sending data to database:', itemData);

    // Use direct API call to ensure it reaches the backend
    this.inventoryService['apiService'].post('ShelfItems/add', itemData).subscribe({
      next: (response: any) => {
        console.log('Item successfully added to database:', response);
        
        // Update local shelf data immediately
        this.shelves.update(shelves =>
          shelves.map(s => {
            if (s.id === shelf.id) {
              return {
                ...s,
                items: s.items + quantity,
                value: s.value + (quantity * unitPrice),
                occupancy: Math.min(100, s.occupancy + (quantity * 2))
              };
            }
            return s;
          })
        );
        
        this.filterShelves();
        this.closeAddItemDialog();
        
        // Show success message with database confirmation
        alert(`✅ SUCCESS: ${quantity} x ${itemName} added to shelf ${shelf.aisle}-${shelf.rack}-${shelf.shelf} and saved to database!`);
      },
      error: (error: any) => {
        console.error('Database error details:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        // Still update local UI even if database fails
        this.shelves.update(shelves =>
          shelves.map(s => {
            if (s.id === shelf.id) {
              return {
                ...s,
                items: s.items + quantity,
                value: s.value + (quantity * unitPrice),
                occupancy: Math.min(100, s.occupancy + (quantity * 2))
              };
            }
            return s;
          })
        );
        
        this.filterShelves();
        this.closeAddItemDialog();
        
        alert(`⚠️ Item added locally but database error occurred. Check console for details. Status: ${error.status || 'Unknown'}`);
      }
    });
  }

  generateQR(): void {
    const data = this.modalFormData();
    const qrCode = `${this.selectedWarehouse().split(' ')[1]}-${data.aisle}-${data.rack}-${data.shelfNumber}`;
    
    // Update the QR value in the form
    this.modalFormData.update(formData => ({
      ...formData,
      qrValue: qrCode
    }));
    
    alert(`QR Code Generated: ${qrCode}\nThis QR code can be used to identify the shelf location.`);
  }
}
