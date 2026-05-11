import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface TransferItem {
  sku: string;
  name: string;
  available: number;
  toTransfer: number;
  selected: boolean;
}

interface TransferLog {
  id: string;
  date: string;
  fromTo: string;
  items: number;
  qty: number;
  status: 'completed' | 'in-progress' | 'pending';
}

@Component({
  selector: 'app-stock-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-transfer.component.html',
  styleUrls: ['./stock-transfer.component.scss']
})
export class StockTransferComponent {
  // Form state
  fromWarehouse = signal('Warehouse A');
  toWarehouse = signal('Warehouse B');
  transferReason = signal('');
  requiredByDate = signal('Dec 18, 2024');
  notes = signal('');

  // Modal states
  showHistoryModal = signal(false);

  // Transfer items
  transferItems = signal<TransferItem[]>([
    { sku: 'LAP-001', name: 'Dell XPS Laptop', available: 45, toTransfer: 10, selected: true },
    { sku: 'MON-002', name: 'HP Monitor', available: 67, toTransfer: 0, selected: false },
    { sku: 'CAB-004', name: 'USB Cables', available: 55, toTransfer: 50, selected: true },
    { sku: 'TON-006', name: 'Toner Cartridge', available: 8, toTransfer: 0, selected: false }
  ]);

  // Transfer history
  transferHistory = signal<TransferLog[]>([
    { id: 'TRF-2024-015', date: 'Dec 15', fromTo: 'WH A → WH B', items: 2, qty: 60, status: 'completed' },
    { id: 'TRF-2024-014', date: 'Dec 14', fromTo: 'WH B → WH A', items: 1, qty: 50, status: 'completed' },
    { id: 'TRF-2024-013', date: 'Dec 13', fromTo: 'WH A → Storage', items: 3, qty: 25, status: 'in-progress' },
    { id: 'TRF-2024-012', date: 'Dec 12', fromTo: 'Main → Branch', items: 2, qty: 15, status: 'pending' }
  ]);

  // Filter options
  warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Storage', 'Main', 'Branch'];

  // Computed values
  selectedItems = computed(() => {
    return this.transferItems().filter(item => item.selected);
  });

  totalQuantity = computed(() => {
    return this.selectedItems().reduce((sum, item) => sum + item.toTransfer, 0);
  });

  totalValue = computed(() => {
    return this.totalQuantity() * 420; // Approximate value per unit
  });

  // Update transfer quantity
  updateTransferQuantity(sku: string, value: number) {
    this.transferItems.update(items => 
      items.map(item => 
        item.sku === sku ? { ...item, toTransfer: Math.min(value, item.available) } : item
      )
    );
  }

  // Toggle item selection
  toggleItemSelection(sku: string) {
    this.transferItems.update(items => 
      items.map(item => 
        item.sku === sku ? { ...item, selected: !item.selected } : item
      )
    );
  }

  // Open history modal
  openHistoryModal() {
    this.showHistoryModal.set(true);
  }

  // Close history modal
  closeHistoryModal() {
    this.showHistoryModal.set(false);
  }

  // Create transfer order
  createTransferOrder() {
    console.log('Creating transfer order...');
  }

  // Cancel form
  cancelForm() {
    this.fromWarehouse.set('Warehouse A');
    this.toWarehouse.set('Warehouse B');
    this.transferReason.set('');
    this.requiredByDate.set('Dec 18, 2024');
    this.notes.set('');
    this.transferItems.update(items => 
      items.map(item => ({ ...item, selected: false, toTransfer: 0 }))
    );
  }

  // Get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  }

  // Get status emoji
  getStatusEmoji(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  }

  // Format value
  formatValue(value: number): string {
    return '$' + value.toLocaleString();
  }
}
