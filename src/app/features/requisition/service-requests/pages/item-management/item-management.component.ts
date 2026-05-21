import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ItemMasterService, ItemMasterListDto } from '../../../../../core/services/item-master.service';
import { ServiceRequestItem } from '../../models/service-request.model';

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.scss']
})
export class ItemManagementComponent implements OnInit {
  itemForm!: FormGroup;
  availableItems: ItemMasterListDto[] = [];
  selectedItems: ServiceRequestItem[] = [];
  isLoading = false;
  editingItem: ServiceRequestItem | null = null;
  requestId: string = '';

  constructor(
    private fb: FormBuilder,
    private itemMasterService: ItemMasterService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAvailableItems();
    this.requestId = this.route.snapshot.paramMap.get('requestId') || 'temp';
    
    // Load existing items if editing
    const existingItems = sessionStorage.getItem(`sr_items_${this.requestId}`);
    if (existingItems) {
      this.selectedItems = JSON.parse(existingItems);
    }
  }

  private initializeForm(): void {
    this.itemForm = this.fb.group({
      itemId: ['', Validators.required],
      requestedQty: [1, [Validators.required, Validators.min(1)]],
      shelfId: ['']
    });
  }

  private loadAvailableItems(): void {
    this.isLoading = true;
    
    this.itemMasterService.getItemMasters().subscribe({
      next: (response: any) => {
        this.availableItems = response.data?.items || [];
        // Add sample items if API fails or returns empty
        if (this.availableItems.length === 0) {
          this.availableItems = [
            {
              id: '1',
              itemName: 'Dell XPS Laptop',
              sku: 'DELL-XPS-15',
              description: 'High-performance laptop',
              unitOfMeasure: 'Units',
              stockQuantity: 45,
              currentStock: 45,
              reservedStock: 0,
              availableStock: 45,
              minStockLevel: 10,
              requiresInspection: false,
              isLowStock: false,
              categoryId: '1',
              categoryName: 'Electronics',
              isActive: true
            },
            {
              id: '2',
              itemName: 'HP 27" Monitor',
              sku: 'HP-MON-27',
              description: '27-inch LED monitor',
              unitOfMeasure: 'Units',
              stockQuantity: 67,
              currentStock: 67,
              reservedStock: 0,
              availableStock: 67,
              minStockLevel: 10,
              requiresInspection: false,
              isLowStock: false,
              categoryId: '1',
              categoryName: 'Electronics',
              isActive: true
            },
            {
              id: '3',
              itemName: 'Logitech Mouse',
              sku: 'LOG-MOUSE-01',
              description: 'Wireless optical mouse',
              unitOfMeasure: 'Units',
              stockQuantity: 120,
              currentStock: 120,
              reservedStock: 0,
              availableStock: 120,
              minStockLevel: 10,
              requiresInspection: false,
              isLowStock: false,
              categoryId: '1',
              categoryName: 'Electronics',
              isActive: true
            }
          ];
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading items:', error);
        // Load sample items on error
        this.availableItems = [
          {
            id: '1',
            itemName: 'Dell XPS Laptop',
            sku: 'DELL-XPS-15',
            description: 'High-performance laptop',
            unitOfMeasure: 'Units',
            stockQuantity: 45,
              currentStock: 45,
              reservedStock: 0,
              availableStock: 45,
              minStockLevel: 10,
              requiresInspection: false,
              isLowStock: false,
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          },
          {
            id: '2',
            itemName: 'HP 27" Monitor',
            sku: 'HP-MON-27',
            description: '27-inch LED monitor',
            unitOfMeasure: 'Units',
            stockQuantity: 67,
              currentStock: 67,
              reservedStock: 0,
              availableStock: 67,
              minStockLevel: 10,
              requiresInspection: false,
              isLowStock: false,
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          }
        ];
        this.isLoading = false;
      }
    });
  }

  addItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const formValue = this.itemForm.value;
    const selectedItem = this.availableItems.find(item => item.id === formValue.itemId);
    
    if (!selectedItem) return;

    const itemData: ServiceRequestItem = {
      id: this.editingItem?.id || this.generateId(),
      itemId: selectedItem.id,
      itemName: selectedItem.itemName,
      sku: selectedItem.sku,
      unitOfMeasure: selectedItem.unitOfMeasure,
      requestedQty: formValue.requestedQty,
      issuedQty: 0,
      pendingQty: formValue.requestedQty,
      shelfId: formValue.shelfId,
      shelfLocation: formValue.shelfId ? `Shelf ${formValue.shelfId}` : ''
    };

    if (this.editingItem) {
      const index = this.selectedItems.findIndex(i => i.id === this.editingItem!.id);
      if (index > -1) {
        this.selectedItems[index] = itemData;
      }
    } else {
      this.selectedItems.push(itemData);
    }

    this.saveItemsToSession();
    this.resetForm();
  }

  editItem(item: ServiceRequestItem): void {
    this.editingItem = item;
    this.itemForm.patchValue({
      itemId: item.itemId,
      requestedQty: item.requestedQty,
      shelfId: item.shelfId || ''
    });
  }

  deleteItem(item: ServiceRequestItem): void {
    if (confirm(`Are you sure you want to remove ${item.itemName} from the request?`)) {
      const index = this.selectedItems.findIndex(i => i.id === item.id);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
        this.saveItemsToSession();
      }
    }
  }

  resetForm(): void {
    this.editingItem = null;
    this.itemForm.reset({
      itemId: '',
      requestedQty: 1,
      shelfId: ''
    });
  }

  saveItemsToSession(): void {
    sessionStorage.setItem(`sr_items_${this.requestId}`, JSON.stringify(this.selectedItems));
  }

  private generateId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  get selectedItemName(): string {
    const itemId = this.itemForm.get('itemId')?.value;
    const item = this.availableItems.find(i => i.id === itemId);
    return item?.itemName || '';
  }

  get selectedItemStock(): number {
    const itemId = this.itemForm.get('itemId')?.value;
    const item = this.availableItems.find(i => i.id === itemId);
    return item?.stockQuantity || 0;
  }

  get totalQuantity(): number {
    return this.selectedItems.reduce((sum, item) => sum + item.requestedQty, 0);
  }

  getAvailableStock(itemId: string): number {
    const item = this.availableItems.find(i => i.id === itemId);
    return item?.stockQuantity || 0;
  }

  backToRequest(): void {
    this.router.navigate(['/requisitions/service-requests/form']);
  }

  continueToReview(): void {
    if (this.selectedItems.length === 0) {
      alert('Please add at least one item to continue.');
      return;
    }
    this.router.navigate(['/requisitions/service-requests/form'], { 
      queryParams: { step: 3 } 
    });
  }
}
