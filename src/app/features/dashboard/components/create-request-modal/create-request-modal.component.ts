import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NewRequestForm, RequestItem } from '../../../../types/dashboard.types';
import { ServiceRequestService } from '../../../../features/requisition/service-requests/services/service-request.service';

type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-create-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-request-modal.component.html',
  styleUrl: './create-request-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRequestModalComponent {
  readonly modal = inject(NgbActiveModal);
  private serviceRequestService = inject(ServiceRequestService);
  
  editingItem: RequestItem | null = null;

  currentStep: WizardStep = 1;
  readonly form: NewRequestForm = {
    requester: 'John Doe',
    department: 'IT Department',
    requiredBy: '',
    justification: '',
    priority: 'Medium',
    items: [],
  };

  readonly availableItems = [
    { name: 'Dell XPS Laptop', sku: 'LAP-001', available: 45, uom: 'PCS' },
    { name: 'HP 27" Monitor', sku: 'MON-002', available: 67, uom: 'PCS' },
    { name: 'Office Chair', sku: 'CHR-003', available: 23, uom: 'PCS' },
    { name: 'USB Cables (10-pack)', sku: 'CAB-004', available: 55, uom: 'PCS' },
    { name: 'A4 Paper', sku: 'PAP-005', available: 120, uom: 'PCS' },
  ];

  searchQuery = '';
  selectedItems: RequestItem[] = [];

  get srNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900) + 100;
    return `SR-${year}-${random}`;
  }

  get filteredItems() {
    if (!this.searchQuery) return this.availableItems;
    return this.availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  get totalItems(): number {
    return this.selectedItems.length;
  }

  get totalQuantity(): number {
    return this.selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  addItem(item: { name: string; sku: string; available: number; uom: string }): void {
    const existingItem = this.selectedItems.find((i) => i.sku === item.sku);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.selectedItems.push({ name: item.name, sku: item.sku, quantity: 1 });
    }
  }

  removeItem(sku: string): void {
    this.selectedItems = this.selectedItems.filter((item) => item.sku !== sku);
  }

  updateItemQuantity(sku: string, quantity: number): void {
    const item = this.selectedItems.find((i) => i.sku === sku);
    if (item) {
      item.quantity = Math.max(1, quantity);
    }
  }

  editItem(item: RequestItem): void {
    // For now, just log the edit action
    console.log('Editing item:', item);
    // In a real implementation, you could open an edit modal or inline editing
  }

  submit(): void {
    this.form.items = this.selectedItems;
    
    // Create the service request object for the backend
    const createRequest = {
      department: this.form.department,
      purpose: this.form.justification,
      urgency: this.form.priority.toLowerCase(),
      notes: `Required by: ${this.form.requiredBy}`,
      items: this.selectedItems.map(item => ({
        itemId: item.sku, // Using SKU as itemId for now
        requestedQty: item.quantity,
        shelfId: undefined
      }))
    };

    // Send to backend
    this.serviceRequestService.createServiceRequest(createRequest).subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log('Service Request created successfully:', response);
          alert('Service Request created successfully!');
          this.modal.close(this.form);
        } else {
          alert('Error creating request: ' + response.message);
        }
      },
      error: (error: any) => {
        console.error('Error creating service request:', error);
        alert('Error creating request. Please try again.');
      }
    });
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
