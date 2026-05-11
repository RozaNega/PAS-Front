import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceRequestService } from '../../services/service-request.service';
import { ItemMasterService, ItemMasterListDto } from '../../../../../../app/core/services/item-master.service';
import { ServiceRequestItem, CreateServiceRequestRequest } from '../../models/service-request.model';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './service-request-form.component.html',
  styleUrls: ['./service-request-form.component.scss']
})
export class ServiceRequestFormComponent implements OnInit {
  currentStep = 1;
  totalSteps = 3;
  
  // Forms
  requestForm!: FormGroup;
  itemsForm!: FormGroup;
  
  // Data
  availableItems: ItemMasterListDto[] = [];
  selectedItems: ServiceRequestItem[] = [];
  isLoading = false;
  
  // UI State
  showAddItemModal = false;
  editingItem: ServiceRequestItem | null = null;
  
  constructor(
    private fb: FormBuilder,
    private serviceRequestService: ServiceRequestService,
    private itemMasterService: ItemMasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadAvailableItems();
  }

  private initializeForms(): void {
    this.requestForm = this.fb.group({
      department: ['', Validators.required],
      purpose: ['', Validators.required],
      urgency: ['normal', Validators.required],
      notes: ['']
    });

    this.itemsForm = this.fb.group({
      itemId: ['', Validators.required],
      requestedQty: [1, [Validators.required, Validators.min(1)]],
      shelfId: ['']
    });
  }

  private loadAvailableItems(): void {
    console.log('Loading available items...');
    this.isLoading = true;
    this.itemMasterService.getItemMasters().subscribe({
      next: (response: any) => {
        console.log('Items response:', response);
        this.availableItems = response.data?.items || [];
        console.log('Available items loaded:', this.availableItems.length);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading items:', error);
        this.isLoading = false;
      }
    });
  }

  // Step Navigation
  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.requestForm.valid;
      case 2:
        return this.selectedItems.length > 0;
      default:
        return true;
    }
  }

  // Item Management
  openAddItemModal(): void {
    console.log('Opening Add Item Modal');
    console.log('Available items:', this.availableItems.length);
    this.editingItem = null;
    this.itemsForm.reset({
      itemId: '',
      requestedQty: 1,
      shelfId: ''
    });
    this.showAddItemModal = true;
    console.log('Modal should be visible:', this.showAddItemModal);
  }

  editItem(item: ServiceRequestItem): void {
    this.editingItem = item;
    this.itemsForm.patchValue({
      itemId: item.itemId,
      requestedQty: item.requestedQty,
      shelfId: item.shelfId || ''
    });
    this.showAddItemModal = true;
  }

  deleteItem(item: ServiceRequestItem): void {
    if (confirm(`Are you sure you want to remove ${item.itemName} from the request?`)) {
      const index = this.selectedItems.findIndex(i => i.id === item.id);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      }
    }
  }

  saveItem(): void {
    if (this.itemsForm.invalid) return;

    const formValue = this.itemsForm.value;
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
      shelfLocation: this.getShelfLocation(formValue.shelfId)
    };

    if (this.editingItem) {
      const index = this.selectedItems.findIndex(i => i.id === this.editingItem!.id);
      if (index > -1) {
        this.selectedItems[index] = itemData;
      }
    } else {
      this.selectedItems.push(itemData);
    }

    this.closeAddItemModal();
  }

  closeAddItemModal(): void {
    this.showAddItemModal = false;
    this.editingItem = null;
    this.itemsForm.reset();
  }

  private generateId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  private getShelfLocation(shelfId: string): string {
    // This would typically come from a service call
    return shelfId ? `Shelf ${shelfId}` : '';
  }

  // Form Submission
  submitRequest(): void {
    if (this.selectedItems.length === 0) {
      alert('Please add at least one item to the request.');
      return;
    }

    if (!this.requestForm.valid) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isLoading = true;

    const formValue = this.requestForm.value;
    const createRequest: CreateServiceRequestRequest = {
      department: formValue.department,
      purpose: formValue.purpose,
      urgency: formValue.urgency,
      notes: formValue.notes || '',
      items: this.selectedItems.map(item => ({
        itemId: item.itemId,
        requestedQty: item.requestedQty,
        shelfId: item.shelfId
      }))
    };

    this.serviceRequestService.createServiceRequest(createRequest).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          alert('Service Request created successfully!');
          this.router.navigate(['/requisitions/service-requests']);
        } else {
          alert('Error creating request: ' + response.message);
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        if (error.status !== 401) {
          alert('Error creating request: ' + (error.error?.message || error.message || 'Please try again.'));
        }
        console.error('Error:', error);
      }
    });
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
      this.router.navigate(['/requisitions/service-requests']);
    }
  }

  // Getters for template
  get selectedItemName(): string {
    const itemId = this.itemsForm.get('itemId')?.value;
    const item = this.availableItems.find(i => i.id === itemId);
    return item?.itemName || '';
  }

  get selectedItemStock(): number {
    const itemId = this.itemsForm.get('itemId')?.value;
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

  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critical':
        return 'badge-danger';
      case 'urgent':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  }
}
