import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Supplier {
  id: string;
  name: string;
  tin: string;
  contact: string;
  rating: number;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent {
  searchTerm = signal('');
  categoryFilter = signal('All Categories');
  locationFilter = signal('All');

  categories = ['All Categories', 'Electronics', 'Office Supplies', 'Furniture', 'Stationery', 'IT Equipment', 'Cleaning Supplies'];
  locations = ['All', 'Addis Ababa', 'Hawassa', 'Dire Dawa', 'Mekelle'];

  suppliers = signal<Supplier[]>([
    { id: '1', name: 'Tech Supplies Ltd', tin: '123456789', contact: 'John D', rating: 4 },
    { id: '2', name: 'Office Depot', tin: '987654321', contact: 'Sarah S', rating: 5 },
    { id: '3', name: 'Global Suppliers', tin: '456789123', contact: 'Mike W', rating: 3 },
    { id: '4', name: 'Paper Co', tin: '789123456', contact: 'Lisa W', rating: 4 },
    { id: '5', name: 'Tech Solutions', tin: '321654987', contact: 'Peter C', rating: 4 }
  ]);

  summary = signal({
    totalSuppliers: 23,
    activeSuppliers: 19,
    onTimeDelivery: 92,
    avgQualityRating: 4.2
  });

  showModal = signal(false);
  showPerformanceView = signal(false);
  selectedSupplier = signal<Supplier | null>(null);

  modalFormData = signal({
    supplierName: '',
    tinNumber: '',
    supplierCategory: 'Electronics',
    address: '',
    contactPerson: '',
    position: 'Sales Manager',
    phone: '',
    email: '',
    paymentTerms: 'Net 30',
    creditLimit: 50000,
    bankAccount: ''
  });

  openAddModal(): void {
    this.modalFormData.set({
      supplierName: '',
      tinNumber: '',
      supplierCategory: 'Electronics',
      address: '',
      contactPerson: '',
      position: 'Sales Manager',
      phone: '',
      email: '',
      paymentTerms: 'Net 30',
      creditLimit: 50000,
      bankAccount: ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  openPerformanceView(supplier: Supplier): void {
    this.selectedSupplier.set(supplier);
    this.showPerformanceView.set(true);
  }

  closePerformanceView(): void {
    this.showPerformanceView.set(false);
    this.selectedSupplier.set(null);
  }

  saveSupplier(): void {
    console.log('Saving supplier:', this.modalFormData().supplierName);
    this.closeModal();
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
