import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LedgerEntry {
  date: string;
  time: string;
  itemCode: string;
  itemName: string;
  transactionType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  balance: number;
  reference: string;
  user: string;
}

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-ledger.component.html',
  styleUrls: ['./stock-ledger.component.scss']
})
export class StockLedgerComponent {
  searchTerm = '';
  selectedItem = '';
  selectedType = '';
  dateFrom = '';
  dateTo = '';

  ledgerEntries: LedgerEntry[] = [
    {
      date: '2024-12-15',
      time: '09:30',
      itemCode: 'LAP-001',
      itemName: 'Dell XPS Laptop',
      transactionType: 'IN',
      quantity: 10,
      balance: 55,
      reference: 'GRN-2024-0123',
      user: 'John Doe'
    },
    {
      date: '2024-12-15',
      time: '11:45',
      itemCode: 'LAP-001',
      itemName: 'Dell XPS Laptop',
      transactionType: 'OUT',
      quantity: 5,
      balance: 50,
      reference: 'SIV-2024-0456',
      user: 'Jane Smith'
    },
    {
      date: '2024-12-14',
      time: '14:20',
      itemCode: 'LAP-001',
      itemName: 'Dell XPS Laptop',
      transactionType: 'ADJUSTMENT',
      quantity: -2,
      balance: 45,
      reference: 'ADJ-2024-0089',
      user: 'Admin User'
    },
    {
      date: '2024-12-14',
      time: '10:15',
      itemCode: 'PRT-002',
      itemName: 'HP LaserJet Printer',
      transactionType: 'IN',
      quantity: 8,
      balance: 40,
      reference: 'GRN-2024-0122',
      user: 'John Doe'
    },
    {
      date: '2024-12-13',
      time: '16:30',
      itemCode: 'PRT-002',
      itemName: 'HP LaserJet Printer',
      transactionType: 'OUT',
      quantity: 3,
      balance: 32,
      reference: 'SIV-2024-0455',
      user: 'Jane Smith'
    }
  ];

  get filteredEntries(): LedgerEntry[] {
    return this.ledgerEntries.filter(entry => {
      const matchesSearch = !this.searchTerm || 
        entry.itemName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        entry.itemCode.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesItem = !this.selectedItem || entry.itemCode === this.selectedItem;
      const matchesType = !this.selectedType || entry.transactionType === this.selectedType;
      
      return matchesSearch && matchesItem && matchesType;
    });
  }

  get uniqueItems(): string[] {
    return Array.from(new Set(this.ledgerEntries.map(e => e.itemCode)));
  }

  getCountByType(type: string): number {
    return this.filteredEntries.filter(e => e.transactionType === type).length;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedItem = '';
    this.selectedType = '';
    this.dateFrom = '';
    this.dateTo = '';
  }

  exportLedger(): void {
    console.log('Exporting ledger...');
    alert('Export functionality will be implemented soon.');
  }

  getTransactionIcon(type: string): string {
    switch (type) {
      case 'IN': return '📥';
      case 'OUT': return '📤';
      case 'ADJUSTMENT': return '🔧';
      default: return '📋';
    }
  }

  getTransactionClass(type: string): string {
    switch (type) {
      case 'IN': return 'transaction-in';
      case 'OUT': return 'transaction-out';
      case 'ADJUSTMENT': return 'transaction-adjustment';
      default: return '';
    }
  }
}
