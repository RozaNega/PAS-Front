import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Adjustment {
  id: string;
  dateTime: string;
  item: string;
  quantity: number;
  type: string;
  reason: string;
  status: 'Approved' | 'Pending';
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-adjustment.component.html',
  styleUrls: ['./stock-adjustment.component.scss']
})
export class StockAdjustmentComponent {
  searchTerm = signal('');
  selectedItem = signal('');
  adjustmentType = signal('Remove');
  quantityToAdjust = signal(50);
  reason = signal('Damaged Goods');
  notes = signal('');

  recentItems = signal([
    { name: 'Dell XPS Laptop', sku: 'LAP-DEL-001', current: 45 },
    { name: 'USB Cables', sku: 'CAB-USB-001', current: 5, low: true },
    { name: 'HP Monitor', sku: 'MON-HP-001', current: 67 }
  ]);

  adjustmentHistory = signal<Adjustment[]>([
    { id: '1', dateTime: 'Dec 15 10:30', item: 'USB Cables', quantity: -50, type: 'Remove', reason: 'Damaged', status: 'Approved' },
    { id: '2', dateTime: 'Dec 14 15:20', item: 'Paper', quantity: 100, type: 'Add', reason: 'Count Correction', status: 'Approved' },
    { id: '3', dateTime: 'Dec 14 11:00', item: 'Toner', quantity: -5, type: 'Remove', reason: 'Lost', status: 'Pending' },
    { id: '4', dateTime: 'Dec 13 09:30', item: 'Monitor', quantity: 2, type: 'Add', reason: 'Found', status: 'Approved' }
  ]);

  summary = signal({
    totalAdjustments: 45,
    totalAdded: 1234,
    totalRemoved: 567,
    pendingApprovals: 3
  });

  currentQuantity = signal(5);
  newQuantity = signal(-45);

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  selectItem(item: any): void {
    this.selectedItem.set(item.name);
    this.currentQuantity.set(item.current);
    this.calculateNewQuantity();
  }

  onAdjustmentTypeChange(value: string): void {
    this.adjustmentType.set(value);
    this.calculateNewQuantity();
  }

  onQuantityChange(value: number): void {
    this.quantityToAdjust.set(value);
    this.calculateNewQuantity();
  }

  calculateNewQuantity(): void {
    const qty = this.quantityToAdjust();
    const type = this.adjustmentType();
    const current = this.currentQuantity();

    if (type === 'Add') {
      this.newQuantity.set(current + qty);
    } else if (type === 'Remove') {
      this.newQuantity.set(current - qty);
    } else {
      this.newQuantity.set(qty);
    }
  }

  submitAdjustment(): void {
    console.log('Submitting adjustment for:', this.selectedItem());
  }

  viewHistory(): void {
    console.log('Viewing adjustment history');
  }

  cancelForm(): void {
    this.searchTerm.set('');
    this.selectedItem.set('');
    this.adjustmentType.set('Remove');
    this.quantityToAdjust.set(50);
    this.reason.set('Damaged Goods');
    this.notes.set('');
    this.currentQuantity.set(5);
    this.newQuantity.set(-45);
  }

  requiresApproval(): boolean {
    const qty = Math.abs(this.quantityToAdjust());
    const current = this.currentQuantity();
    return qty > (current * 0.1);
  }

  getStatusColor(status: string): string {
    return status === 'Approved' ? 'green' : 'yellow';
  }
}
