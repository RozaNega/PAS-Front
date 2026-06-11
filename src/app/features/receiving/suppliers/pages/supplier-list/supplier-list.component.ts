import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierModel, CreateSupplierRequest } from '../../models/supplier.model';
import { SupplierService } from '../../services/supplier.service';



@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  private readonly supplierService = inject(SupplierService);

  suppliers = signal<SupplierModel[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  searchQuery = signal('');
  statusFilter = signal('All');
  locationFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  viewMode = signal<'table' | 'grid'>('table');

  showDetailModal = signal(false);
  selectedSupplier = signal<SupplierModel | null>(null);

  showFormModal = signal(false);
  formMode = signal<'add' | 'edit'>('add');
  formData = signal<Partial<SupplierModel>>({});

  showDeleteConfirm = signal(false);
  deleteTarget = signal<SupplierModel | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  summaryStats = computed(() => {
    const all = this.suppliers();
    return {
      total: all.length,
      activeCount: all.filter(s => s.isActive).length,
      inactiveCount: all.filter(s => !s.isActive).length,
      withContact: all.filter(s => s.contactPerson && s.contactPerson.trim() !== '').length,
    };
  });

  locations = computed(() => {
    const locs = new Set<string>();
    this.suppliers().forEach(s => {
      if (s.address) {
        const loc = s.address.split(',')[0].trim();
        if (loc) locs.add(loc);
      }
    });
    return ['All', ...Array.from(locs).sort()];
  });

  filteredSuppliers = computed(() => {
    let result = [...this.suppliers()];
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
      );
    }
    if (this.statusFilter() !== 'All') {
      const active = this.statusFilter() === 'Active';
      result = result.filter(s => s.isActive === active);
    }
    if (this.locationFilter() !== 'All') {
      const locFilter = this.locationFilter();
      result = result.filter(s => {
        if (!s.address) return false;
        return s.address.split(',')[0].trim() === locFilter;
      });
    }
    return result;
  });

  pagedSuppliers = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredSuppliers().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredSuppliers().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredSuppliers().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.loading.set(true);
    this.supplierService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data?.length) {
          this.suppliers.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#db2777', '#ea580c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onLocationFilter(e: Event): void {
    this.locationFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('All');
    this.locationFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'table' ? 'grid' : 'table');
  }

  openDetailModal(supplier: SupplierModel): void {
    this.selectedSupplier.set(supplier);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedSupplier.set(null);
  }

  openAddModal(): void {
    this.formMode.set('add');
    this.formData.set({ id: '', name: '', contactPerson: '', email: '', phone: '', address: '', tin: '', isActive: true });
    this.showFormModal.set(true);
  }

  openEditModal(supplier: SupplierModel): void {
    this.formMode.set('edit');
    this.formData.set({ ...supplier });
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
    this.formData.set({});
  }

  saveSupplier(): void {
    const data = this.formData();
    if (!data.name || data.name.trim() === '') {
      this.notification.set({ type: 'error', message: 'Supplier name is required.' });
      this.autoDismissNotification();
      return;
    }

    const request: CreateSupplierRequest = {
      name: data.name!.trim(),
      contactPerson: data.contactPerson?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
      tin: data.tin?.trim() || undefined,
    };

    if (this.formMode() === 'add') {
      this.loading.set(true);
      this.supplierService.create(request).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            this.notification.set({ type: 'success', message: `Supplier "${request.name}" created successfully!` });
            this.closeFormModal();
            this.loadSuppliers();
          } else {
            this.notification.set({ type: 'error', message: 'Failed to create supplier: ' + (res.message || 'Unknown error') });
          }
          this.autoDismissNotification();
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.status === 0 ? 'Cannot connect to server.' : err?.error?.message || 'Error creating supplier.';
          this.notification.set({ type: 'error', message: msg });
          this.autoDismissNotification();
        }
      });
    } else {
      this.loading.set(true);
      this.supplierService.update(data.id!, request).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            this.notification.set({ type: 'success', message: `Supplier "${request.name}" updated successfully!` });
            this.closeFormModal();
            this.loadSuppliers();
          } else {
            this.notification.set({ type: 'error', message: 'Failed to update supplier: ' + (res.message || 'Unknown error') });
          }
          this.autoDismissNotification();
        },
        error: (err) => {
          this.loading.set(false);
          this.notification.set({ type: 'error', message: 'Error updating supplier. Please try again.' });
          this.autoDismissNotification();
        }
      });
    }
  }

  updateFormName(e: Event): void {
    this.formData.update(f => ({ ...f, name: (e.target as HTMLInputElement).value }));
  }

  updateFormContactPerson(e: Event): void {
    this.formData.update(f => ({ ...f, contactPerson: (e.target as HTMLInputElement).value }));
  }

  updateFormEmail(e: Event): void {
    this.formData.update(f => ({ ...f, email: (e.target as HTMLInputElement).value }));
  }

  updateFormPhone(e: Event): void {
    this.formData.update(f => ({ ...f, phone: (e.target as HTMLInputElement).value }));
  }

  updateFormAddress(e: Event): void {
    this.formData.update(f => ({ ...f, address: (e.target as HTMLTextAreaElement).value }));
  }

  updateFormTin(e: Event): void {
    this.formData.update(f => ({ ...f, tin: (e.target as HTMLInputElement).value }));
  }

  updateFormIsActive(e: Event): void {
    this.formData.update(f => ({ ...f, isActive: (e.target as HTMLSelectElement).value === 'true' }));
  }

  confirmDelete(supplier: SupplierModel): void {
    this.deleteTarget.set(supplier);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.loading.set(true);
    this.supplierService.delete(target.id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.notification.set({ type: 'success', message: `Supplier "${target.name}" deleted successfully!` });
          this.cancelDelete();
          this.loadSuppliers();
        } else {
          this.notification.set({ type: 'error', message: 'Failed to delete supplier: ' + (res.message || 'Unknown error') });
        }
        this.autoDismissNotification();
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.set({ type: 'error', message: 'Error deleting supplier. Please try again.' });
        this.cancelDelete();
        this.autoDismissNotification();
      }
    });
  }

  exportCsv(): void {
    const header = ['Name', 'Contact Person', 'Email', 'Phone', 'Address', 'TIN', 'Status'];
    const rows = this.filteredSuppliers().map(s =>
      [
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.contactPerson || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.phone || '').replace(/"/g, '""')}"`,
        `"${(s.address || '').replace(/"/g, '""')}"`,
        `"${(s.tin || '').replace(/"/g, '""')}"`,
        s.isActive ? 'Active' : 'Inactive',
      ].join(',')
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

  private autoDismissNotification(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }
}
