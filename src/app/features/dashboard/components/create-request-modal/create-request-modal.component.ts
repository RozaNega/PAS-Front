import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NewRequestForm, RequestItem } from '../../../../types/dashboard.types';

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

  submit(): void {
    this.form.items = this.selectedItems;
    console.log('Submitting request:', this.form);
    this.modal.close(this.form);
  }

  cancel(): void {
    this.modal.dismiss();
  }
}
