import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GRNItem {
  name: string;
  sku: string;
  received: number;
  inspectionRequired: boolean;
  status: string;
}

interface PendingGRN {
  id: string;
  grnNumber: string;
  supplier: string;
  receivedDate: string;
  status: string;
  items: number;
  quantity: number;
  value: number;
  receivedBy: string;
  poNumber: string;
  age: string;
  itemsList: GRNItem[];
}

@Component({
  selector: 'app-pending-grns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-grns.component.html',
  styleUrls: ['./pending-grns.component.scss']
})
export class PendingGRNsComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  supplierFilter = signal('All Suppliers');
  statusFilter = signal('All');
  ageFilter = signal('All');

  suppliers = ['All Suppliers', 'Tech Supplies Ltd', 'Office Depot', 'Global Suppliers', 'Paper Co'];
  statuses = ['All', 'Draft', 'Submitted', 'Pending Inspection'];
  ages = ['All', 'Today', 'This Week', 'This Month'];

  pendingGRNs = signal<PendingGRN[]>([
    {
      id: '1',
      grnNumber: 'GRN-2024-045',
      supplier: 'Tech Supplies Ltd',
      receivedDate: 'Dec 15',
      status: 'Pending Inspection',
      items: 3,
      quantity: 125,
      value: 30740,
      receivedBy: 'John Doe',
      poNumber: 'PO-2024-1234',
      age: '2 hours',
      itemsList: [
        { name: 'Dell XPS Laptop', sku: 'LAP-001', received: 10, inspectionRequired: true, status: '⏳ Pending' },
        { name: 'HP Monitor', sku: 'MON-002', received: 15, inspectionRequired: true, status: '⏳ Pending' },
        { name: 'USB Cables', sku: 'CAB-004', received: 100, inspectionRequired: false, status: '✅ Not Required' }
      ]
    },
    {
      id: '2',
      grnNumber: 'GRN-2024-043',
      supplier: 'Global Suppliers',
      receivedDate: 'Dec 14',
      status: 'Pending Inspection',
      items: 2,
      quantity: 150,
      value: 1250,
      receivedBy: 'John Doe',
      poNumber: 'PO-2024-1230',
      age: '1 day',
      itemsList: [
        { name: 'Office Chair', sku: 'CHR-003', received: 30, inspectionRequired: true, status: '⏳ Pending' },
        { name: 'Desk', sku: 'DSK-001', received: 20, inspectionRequired: true, status: '⏳ Pending' }
      ]
    },
    {
      id: '3',
      grnNumber: 'GRN-2024-041',
      supplier: 'Tech Supplies Ltd',
      receivedDate: 'Dec 12',
      status: 'Draft',
      items: 2,
      quantity: 75,
      value: 18750,
      receivedBy: 'John Doe',
      poNumber: 'PO-2024-1225',
      age: '3 days',
      itemsList: [
        { name: 'Laptop Stand', sku: 'LST-001', received: 25, inspectionRequired: true, status: '⏳ Pending' },
        { name: 'Monitor Arm', sku: 'MNA-001', received: 50, inspectionRequired: true, status: '⏳ Pending' }
      ]
    }
  ]);

  // Computed summary statistics
  totalPending = computed(() => this.pendingGRNs().length);
  draftCount = computed(() => this.pendingGRNs().filter(g => g.status === 'Draft').length);
  submittedCount = computed(() => this.pendingGRNs().filter(g => g.status === 'Submitted').length);
  awaitingInspection = computed(() => this.pendingGRNs().filter(g => g.status === 'Pending Inspection').length);
  overdueCount = computed(() => 0);

  filteredGRNs = signal<PendingGRN[]>([]);

  constructor() {
    this.filterGRNs();
  }

  filterGRNs(): void {
    const search = this.searchTerm().toLowerCase();
    const supplier = this.supplierFilter();
    const status = this.statusFilter();
    const age = this.ageFilter();

    this.filteredGRNs.set(
      this.pendingGRNs().filter(grn => {
        const matchesSearch = grn.grnNumber.toLowerCase().includes(search) ||
                              grn.supplier.toLowerCase().includes(search);
        const matchesSupplier = supplier === 'All Suppliers' || grn.supplier.includes(supplier);
        const matchesStatus = status === 'All' || grn.status === status;
        return matchesSearch && matchesSupplier && matchesStatus;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterGRNs();
  }

  onSupplierChange(value: string): void {
    this.supplierFilter.set(value);
    this.filterGRNs();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.filterGRNs();
  }

  onAgeChange(value: string): void {
    this.ageFilter.set(value);
    this.filterGRNs();
  }

  startInspection(grn: PendingGRN): void {
    console.log('Start inspection:', grn.grnNumber);
  }

  editGRN(grn: PendingGRN): void {
    console.log('Edit GRN:', grn.grnNumber);
  }

  viewDetails(grn: PendingGRN): void {
    console.log('View details:', grn.grnNumber);
  }

  printGRN(grn: PendingGRN): void {
    console.log('Print GRN:', grn.grnNumber);
  }

  deleteGRN(grn: PendingGRN): void {
    console.log('Delete GRN:', grn.grnNumber);
  }

  editDraft(grn: PendingGRN): void {
    console.log('Edit draft:', grn.grnNumber);
  }

  submitForInspection(grn: PendingGRN): void {
    console.log('Submit for inspection:', grn.grnNumber);
  }

  bulkSubmit(): void {
    console.log('Bulk submit selected GRNs');
  }

  bulkDelete(): void {
    console.log('Bulk delete selected GRNs');
  }

  exportList(): void {
    console.log('Export list');
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'Draft': return '⚪';
      case 'Submitted': return '🟡';
      case 'Pending Inspection': return '🟡';
      default: return '⚪';
    }
  }
}
