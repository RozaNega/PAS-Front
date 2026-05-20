import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NewRequestForm, RequestItem, ApiServiceRequest } from '../../../../types/dashboard.types';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { PasApiService } from '../../../../shared/services/pas-api.service';

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
  private currentUserService = inject(CurrentUserService);
  private pasApi = inject(PasApiService);

  currentStep: WizardStep = 1;
  readonly form: NewRequestForm = {
    requester: 'John Doe',
    department: 'IT Department',
    requiredBy: '',
    remarks: '',
    justification: '',
    priority: 'Medium',
    items: [],
  };

  readonly availableItems = [
    { name: 'Dell XPS Laptop', sku: 'LAP-001', available: 45, uom: 'PCS', itemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', preferredShelfId: '7a215f64-5717-4562-b3fc-2c963f66afa6' },
    { name: 'HP 27" Monitor', sku: 'MON-002', available: 67, uom: 'PCS', itemId: '4ba85f64-5717-4562-b3fc-2c963f66afa6', preferredShelfId: '8b215f64-5717-4562-b3fc-2c963f66afa6' },
    { name: 'Office Chair', sku: 'CHR-003', available: 23, uom: 'PCS', itemId: '5ca85f64-5717-4562-b3fc-2c963f66afa6', preferredShelfId: '9c215f64-5717-4562-b3fc-2c963f66afa6' },
    { name: 'USB Cables (10-pack)', sku: 'CAB-004', available: 55, uom: 'PCS', itemId: '6da85f64-5717-4562-b3fc-2c963f66afa6', preferredShelfId: '0d215f64-5717-4562-b3fc-2c963f66afa6' },
    { name: 'A4 Paper', sku: 'PAP-005', available: 120, uom: 'PCS', itemId: '1ea85f64-5717-4562-b3fc-2c963f66afa6', preferredShelfId: '1e215f64-5717-4562-b3fc-2c963f66afa6' },
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

  addItem(item: any): void {
    const existingItem = this.selectedItems.find((i) => i.sku === item.sku);
    if (existingItem) {
      existingItem.quantity++;
      existingItem.requestedQty = existingItem.quantity;
    } else {
      this.selectedItems.push({ 
        name: item.name, 
        sku: item.sku, 
        quantity: 1,
        itemId: item.itemId, 
        srDetailId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', // Template GUID
        requestedQty: 1,
        preferredShelfId: item.preferredShelfId, 
        notes: ''
      });
    }
  }

  removeItem(sku: string): void {
    this.selectedItems = this.selectedItems.filter((item) => item.sku !== sku);
  }

  updateItemQuantity(sku: string, quantity: number): void {
    const item = this.selectedItems.find((i) => i.sku === sku);
    if (item) {
      item.quantity = Math.max(1, quantity);
      item.requestedQty = item.quantity;
    }
  }

  submit(): void {
    this.form.items = this.selectedItems;
    
    const apiPayload: ApiServiceRequest = {
      items: this.selectedItems.map(item => ({
        itemId: item.itemId,
        srDetailId: item.srDetailId,
        requestedQty: item.requestedQty,
        preferredShelfId: item.preferredShelfId,
        notes: item.notes
      })),
      remarks: this.form.remarks || this.form.justification
    };

    console.log('Submitting request payload:', apiPayload);
    
    this.pasApi.createServiceRequest(apiPayload).subscribe({
      next: (response) => {
        console.log('Request saved successfully:', response);
        this.modal.close(this.form);
      },
      error: (err) => {
        console.error('Error saving request:', err);
        alert('Failed to save request to database. Please try again.');
      }
    });
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
