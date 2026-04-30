import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GRN {
  id: string;
  grnNumber: string;
  date: string;
  supplier: string;
  items: number;
  status: 'Pending Inspection' | 'Passed' | 'Failed';
}

interface GRNItem {
  id: string;
  name: string;
  poQty: number;
  received: number;
  unitPrice: number;
  inspect: boolean;
}

@Component({
  selector: 'app-grn',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grn.component.html',
  styleUrls: ['./grn.component.scss']
})
export class GrnComponent {
  searchTerm = signal('');
  dateRange = { start: '2024-12-01', end: '2024-12-15' };
  statusFilter = signal('All');
  supplierFilter = signal('All Suppliers');

  statuses = ['All', 'Pending Inspection', 'Passed', 'Failed'];
  suppliers = ['All Suppliers', 'Tech Supplies', 'Office Depot', 'Global Suppliers', 'Paper Co'];

  grns = signal<GRN[]>([
    { id: '1', grnNumber: 'GRN-2024-045', date: 'Dec 15', supplier: 'Tech Supplies', items: 3, status: 'Pending Inspection' },
    { id: '2', grnNumber: 'GRN-2024-044', date: 'Dec 14', supplier: 'Office Depot', items: 5, status: 'Passed' },
    { id: '3', grnNumber: 'GRN-2024-043', date: 'Dec 14', supplier: 'Global Suppliers', items: 2, status: 'Failed' },
    { id: '4', grnNumber: 'GRN-2024-042', date: 'Dec 13', supplier: 'Paper Co', items: 1, status: 'Passed' },
    { id: '5', grnNumber: 'GRN-2024-041', date: 'Dec 12', supplier: 'Tech Supplies', items: 4, status: 'Pending Inspection' }
  ]);

  summary = signal({
    totalGRNs: 45,
    totalItems: 2345,
    totalValue: 156890,
    pendingInspection: 3,
    thisWeek: 12
  });

  showModal = signal(false);
  modalStep = signal(1);

  modalFormData = signal({
    grnNumber: 'GRN-2024-046',
    dateReceived: '2024-12-15',
    supplier: 'Tech Supplies Ltd',
    poNumber: 'PO-2024-1234',
    deliveryNote: 'DN-45678',
    receivedBy: 'John Doe (Store Officer)',
    items: [] as GRNItem[],
    attachments: [] as string[],
    notes: ''
  });

  filteredGRNs = signal<GRN[]>([]);

  constructor() {
    this.filterGRNs();
  }

  filterGRNs(): void {
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const supplier = this.supplierFilter();

    this.filteredGRNs.set(
      this.grns().filter(grn => {
        const matchesSearch = grn.grnNumber.toLowerCase().includes(search) || 
                              grn.supplier.toLowerCase().includes(search);
        const matchesStatus = status === 'All' || grn.status === status;
        const matchesSupplier = supplier === 'All Suppliers' || grn.supplier === supplier;
        return matchesSearch && matchesStatus && matchesSupplier;
      })
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.filterGRNs();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.filterGRNs();
  }

  openCreateModal(): void {
    this.modalStep.set(1);
    this.modalFormData.set({
      grnNumber: 'GRN-2024-' + (this.grns().length + 46),
      dateReceived: new Date().toISOString().split('T')[0],
      supplier: 'Tech Supplies Ltd',
      poNumber: 'PO-2024-1234',
      deliveryNote: 'DN-45678',
      receivedBy: 'John Doe (Store Officer)',
      items: [],
      attachments: [],
      notes: ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalStep.set(1);
  }

  nextStep(): void {
    if (this.modalStep() < 3) {
      this.modalStep.set(this.modalStep() + 1);
    }
  }

  prevStep(): void {
    if (this.modalStep() > 1) {
      this.modalStep.set(this.modalStep() - 1);
    }
  }

  submitGRN(): void {
    const data = this.modalFormData();
    const newGRN: GRN = {
      id: Date.now().toString(),
      grnNumber: data.grnNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      supplier: data.supplier.split(' ')[0],
      items: data.items.length,
      status: 'Pending Inspection'
    };
    this.grns.update(grns => [newGRN, ...grns]);
    this.filterGRNs();
    this.closeModal();
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'Pending Inspection': 'yellow',
      Passed: 'green',
      Failed: 'red'
    };
    return colors[status] || 'gray';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Pending Inspection': '🟡',
      Passed: '🟢',
      Failed: '🔴'
    };
    return icons[status] || '⚪';
  }
}
