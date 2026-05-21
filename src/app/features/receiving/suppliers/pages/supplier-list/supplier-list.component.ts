import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { SupplierModel } from '../../models/supplier.model';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  suppliers: SupplierModel[] = [];
  isLoading = false;
  searchTerm = '';
  errorMessage = '';

  constructor(
    private supplierService: SupplierService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.supplierService.getAll().subscribe({
      next: (response) => {
        console.log('Load suppliers response:', JSON.stringify(response, null, 2));
        if (response.success !== false && Array.isArray(response.data)) {
          this.suppliers = response.data;
        } else {
          this.errorMessage = response.message || 'Failed to load suppliers';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.errorMessage = this.getErrorMessage(error);
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.errorMessage = '';
    if (this.searchTerm) {
      this.supplierService.getAll({ searchTerm: this.searchTerm }).subscribe({
        next: (response) => {
          if (response.success !== false && Array.isArray(response.data)) {
            this.suppliers = response.data;
          }
        },
        error: (error) => {
          console.error('Error searching suppliers:', error);
          this.errorMessage = this.getErrorMessage(error);
        }
      });
    } else {
      this.loadSuppliers();
    }
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Cannot connect to server. Please check if the backend is running.';
    } else if (error.status === 404) {
      return 'API endpoint not found. The Suppliers endpoint may not exist on the backend.';
    } else if (error.status === 500) {
      return 'Server error. Please try again later.';
    }
    return `Error ${error.status}: ${error.statusText || 'Unknown error'}`;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadSuppliers();
  }

  addSupplier(): void {
    this.router.navigate(['/admin/receiving/suppliers/new']);
  }

  editSupplier(id: string): void {
    this.router.navigate(['/admin/receiving/suppliers/edit', id]);
  }

  deleteSupplier(id: string): void {
    if (confirm('Are you sure you want to delete this supplier?')) {
      this.supplierService.delete(id).subscribe({
        next: (response) => {
          if (response.success !== false) {
            alert('Supplier deleted successfully!');
            this.loadSuppliers();
          } else {
            alert('Error deleting supplier: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error deleting supplier:', error);
          alert('Error deleting supplier. Please try again.');
        }
      });
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'badge-success' : 'badge-danger';
  }

  exportSuppliers(): void {
    const header = ['Name', 'Contact', 'Email', 'Phone', 'Address', 'TIN', 'Active'];
    const rows = this.suppliers.map((s) =>
      [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.contactPerson || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.phone || '').replace(/"/g, '""')}"`,
        `"${(s.address || '').replace(/"/g, '""')}"`,
        `"${(s.tin || '').replace(/"/g, '""')}"`,
        s.isActive ? 'Yes' : 'No',
      ].join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
