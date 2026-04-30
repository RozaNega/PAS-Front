import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss']
})
export class AddItemComponent {
  showModal = signal(false);
  currentStep = signal(1);
  totalSteps = 3;

  // Step 1: Basic Information
  sku = signal('');
  itemName = signal('');
  category = signal('Electronics');
  uom = signal('PCS');
  description = signal('');
  autoGenerateSku = signal(true);

  categories = ['Electronics', 'Furniture', 'Stationery', 'Supplies', 'IT Equipment'];
  uomOptions = ['Pieces (PCS)', 'Box (BOX)', 'Kilogram (KG)', 'Meter (MTR)', 'Liter (LTR)'];

  // Step 2: Stock Settings
  minStock = signal(10);
  maxStock = signal(100);
  reorderQuantity = signal(50);
  reorderPoint = signal(15);
  requiresInspection = signal(true);
  trackSerialNumbers = signal(true);
  trackExpiryDates = signal(false);
  trackBatchLot = signal(false);

  // Step 3: Financial & Additional Info
  unitPrice = signal(2499);
  currency = signal('USD');
  taxRate = signal(15);
  discount = signal(0);
  manufacturer = signal('Dell');
  model = signal('XPS 9530');
  warrantyPeriod = signal(24);
  supplier = signal('Tech Supplies Ltd');
  notes = signal('');

  suppliers = ['Tech Supplies Ltd', 'Office Depot', 'Global Suppliers', 'Paper Co'];
  currencies = ['USD', 'EUR', 'GBP'];

  openModal(): void {
    this.showModal.set(true);
    this.currentStep.set(1);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  resetForm(): void {
    this.sku.set('');
    this.itemName.set('');
    this.category.set('Electronics');
    this.uom.set('PCS');
    this.description.set('');
    this.minStock.set(10);
    this.maxStock.set(100);
    this.reorderQuantity.set(50);
    this.reorderPoint.set(15);
    this.requiresInspection.set(true);
    this.trackSerialNumbers.set(true);
    this.trackExpiryDates.set(false);
    this.trackBatchLot.set(false);
    this.unitPrice.set(2499);
    this.currency.set('USD');
    this.taxRate.set(15);
    this.discount.set(0);
    this.manufacturer.set('Dell');
    this.model.set('XPS 9530');
    this.warrantyPeriod.set(24);
    this.supplier.set('Tech Supplies Ltd');
    this.notes.set('');
  }

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

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps) {
      this.currentStep.set(step);
    }
  }

  saveAsDraft(): void {
    console.log('Saving as draft...');
    this.closeModal();
  }

  saveAndAddNew(): void {
    console.log('Saving and adding new...');
    this.resetForm();
    this.currentStep.set(1);
  }

  save(): void {
    console.log('Saving item...');
    this.closeModal();
  }

  generateSku(): void {
    if (this.autoGenerateSku()) {
      const catCode = this.category().substring(0, 3).toUpperCase();
      const randomNum = Math.floor(Math.random() * 900) + 100;
      this.sku.set(`${catCode}-${randomNum}`);
    }
  }

  onCategoryChange(): void {
    this.generateSku();
  }

  getStepTitle(): string {
    switch(this.currentStep()) {
      case 1: return 'Basic Information';
      case 2: return 'Stock Settings';
      case 3: return 'Financial & Additional Info';
      default: return '';
    }
  }
}
