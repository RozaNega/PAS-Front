import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceRequestService } from '../../services/service-request.service';
import { ItemMasterService, ItemMasterListDto } from '../../../../../core/services/item-master.service';
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
  
  // Data
  availableItems: ItemMasterListDto[] = [];
  selectedItems: ServiceRequestItem[] = [];
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private serviceRequestService: ServiceRequestService,
    private itemMasterService: ItemMasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadAvailableItems();
    this.loadItemsFromSession();
  }

  private initializeForms(): void {
    this.requestForm = this.fb.group({
      department: ['', Validators.required],
      purpose: ['', Validators.required],
      urgency: ['normal', Validators.required],
      notes: ['']
    });
  }

  private loadAvailableItems(): void {
    console.log('Loading available items...');
    this.isLoading = true;
    
    // Try to load from API first
    this.itemMasterService.getItemMasters().subscribe({
      next: (response: any) => {
        console.log('Items response:', response);
        this.availableItems = response.data?.items || [];
        console.log('Available items loaded:', this.availableItems.length);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading items:', error);
        // Load sample items if API fails
        this.availableItems = [
          {
            id: '1',
            itemName: 'Dell XPS Laptop',
            sku: 'DELL-XPS-15',
            description: 'High-performance laptop',
            unitOfMeasure: 'Units',
            stockQuantity: 45,
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
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          },
          {
            id: '4',
            itemName: 'USB-C Cable',
            sku: 'USB-C-2M',
            description: '2-meter USB-C charging cable',
            unitOfMeasure: 'Units',
            stockQuantity: 200,
            categoryId: '1',
            categoryName: 'Electronics',
            isActive: true
          }
        ];
        console.log('Sample items loaded:', this.availableItems.length);
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
  goToItemManagement(): void {
    // Save current items to session storage
    const requestId = 'sr_' + Date.now();
    sessionStorage.setItem(`sr_items_${requestId}`, JSON.stringify(this.selectedItems));
    sessionStorage.setItem('sr_request_data', JSON.stringify(this.requestForm.value));
    
    // Navigate to item management page
    this.router.navigate(['/requisitions/service-requests/item-management', requestId]);
  }

  private generateId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  private getShelfLocation(shelfId: string): string {
    // This would typically come from a service call
    return shelfId ? `Shelf ${shelfId}` : '';
  }

  private loadItemsFromSession(): void {
    // Try to load items from session storage (when returning from item management page)
    const sessionKeys = Object.keys(sessionStorage).filter(key => key.startsWith('sr_items_'));
    if (sessionKeys.length > 0) {
      const latestKey = sessionKeys[sessionKeys.length - 1];
      const items = sessionStorage.getItem(latestKey);
      if (items) {
        this.selectedItems = JSON.parse(items);
      }
    }

    // Load request data if available
    const requestData = sessionStorage.getItem('sr_request_data');
    if (requestData) {
      this.requestForm.patchValue(JSON.parse(requestData));
    }
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
