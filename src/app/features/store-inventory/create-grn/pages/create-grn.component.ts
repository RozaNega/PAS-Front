import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GRNItem {
  name: string;
  sku: string;
  poQty: number;
  receivedQty: number;
  unitPrice: number;
  inspect: boolean;
}

@Component({
  selector: 'app-create-grn',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-grn.component.html',
  styleUrls: ['./create-grn.component.scss']
})
export class CreateGRNComponent {
  currentStep = signal(1);
  totalSteps = 4;

  // Step 1: Shipment Information
  grnNumber = signal('GRN-2024-046');
  dateReceived = signal('2024-12-15');
  supplier = signal('Tech Supplies Ltd');
  poNumber = signal('PO-2024-1234');
  deliveryNoteNumber = signal('DN-45678');
  receivedBy = signal('John Doe (Store Officer)');
  carrier = signal('DHL');
  trackingNumber = signal('1Z999AA10123456784');

  suppliers = [
    { name: 'Tech Supplies Ltd', category: 'Electronics', rating: '★★★★☆' },
    { name: 'Office Depot', category: 'Office Supplies', rating: '★★★★★' },
    { name: 'Global Suppliers', category: 'General', rating: '★★★☆☆' },
    { name: 'Paper Co', category: 'Stationery', rating: '★★★★☆' }
  ];

  carriers = ['DHL', 'FedEx', 'UPS', 'Local Courier'];

  // Step 2: Items Received
  grnItems = signal<GRNItem[]>([
    { name: 'Dell XPS Laptop', sku: 'LAP-001', poQty: 10, receivedQty: 10, unitPrice: 2499, inspect: true },
    { name: 'HP 27" Monitor', sku: 'MON-002', poQty: 15, receivedQty: 15, unitPrice: 350, inspect: true },
    { name: 'USB Cables (10-pack)', sku: 'CAB-004', poQty: 100, receivedQty: 100, unitPrice: 5, inspect: false }
  ]);

  // Step 3: Batch & Expiry
  batchNumber = signal('BCH-2024-001');
  manufacturingDate = signal('2024-11-15');
  expiryDate = signal('2026-11-14');

  // Step 4: Documents & Submit
  notes = signal('All items received in good condition. 2 boxes slightly damaged but contents intact.');
  submitForInspection = signal(true);
  notifyProcurement = signal(true);
  printGRN = signal(false);
  sendEmailToSupplier = signal(false);

  showAddItemModal = signal(false);

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  openAddItemModal(): void {
    this.showAddItemModal.set(true);
  }

  closeAddItemModal(): void {
    this.showAddItemModal.set(false);
  }

  addItem(): void {
    console.log('Add item to GRN');
    this.closeAddItemModal();
  }

  importFromPO(): void {
    console.log('Import from PO');
  }

  scanBarcode(): void {
    console.log('Scan barcode');
  }

  editItem(item: GRNItem): void {
    console.log('Edit item:', item.sku);
  }

  deleteItem(item: GRNItem): void {
    console.log('Delete item:', item.sku);
  }

  saveAsDraft(): void {
    console.log('Save as draft');
  }

  submitForInspectionAction(): void {
    console.log('Submit for inspection');
  }

  cancel(): void {
    console.log('Cancel GRN creation');
  }

  getStepTitle(): string {
    switch(this.currentStep()) {
      case 1: return 'Shipment Information';
      case 2: return 'Items Received';
      case 3: return 'Batch & Expiry Information (if applicable)';
      case 4: return 'Documents & Submit';
      default: return '';
    }
  }

  getTotalQuantity(): number {
    return this.grnItems().reduce((sum, item) => sum + item.receivedQty, 0);
  }

  getTotalValue(): number {
    return this.grnItems().reduce((sum, item) => sum + (item.receivedQty * item.unitPrice), 0);
  }
}
