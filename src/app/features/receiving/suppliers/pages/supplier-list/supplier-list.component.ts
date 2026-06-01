import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplierModel } from '../../models/supplier.model';

const MOCK_SUPPLIERS: SupplierModel[] = [
  { id: 'SUP-001', name: 'Ethio Cement PLC', contactPerson: 'Abebe Kebede', email: 'abebe@ethiociment.com', phone: '+251-911-123456', address: 'Addis Ababa, Bole Sub-city', tin: 'TIN-00012345', isActive: true },
  { id: 'SUP-002', name: 'Blue Nile Logistics SC', contactPerson: 'Sara Hailu', email: 'sara@bluenilelog.com', phone: '+251-922-234567', address: 'Bahir Dar, Tana Sub-city', tin: 'TIN-00023456', isActive: true },
  { id: 'SUP-003', name: 'Dashen Breweries SC', contactPerson: 'Mekonnen Wondimu', email: 'mekonnen@dashenbeer.com', phone: '+251-933-345678', address: 'Gondar, Arada', tin: 'TIN-00034567', isActive: true },
  { id: 'SUP-004', name: 'Habesha Metal Works', contactPerson: 'Tigist Alemu', email: 'tigist@habeshametal.com', phone: '+251-944-456789', address: 'Addis Ababa, Nifas Silk', tin: 'TIN-00045678', isActive: true },
  { id: 'SUP-005', name: 'Tana Trading House', contactPerson: 'Dawit Eshetu', email: 'dawit@tanatrading.com', phone: '+251-955-567890', address: 'Bahir Dar, Tana Sub-city', tin: 'TIN-00056789', isActive: true },
  { id: 'SUP-006', name: 'Awash Agro-Industry', contactPerson: 'Lemlem Hailu', email: 'lemlem@awashagro.com', phone: '+251-966-678901', address: 'Adama, Oromia', tin: 'TIN-00067890', isActive: true },
  { id: 'SUP-007', name: 'Lalibela Construction PLC', contactPerson: 'Henok Tesfaye', email: 'henok@lalibela.com', phone: '+251-977-789012', address: 'Addis Ababa, Kirkos', tin: 'TIN-00078901', isActive: false },
  { id: 'SUP-008', name: 'Oromia Coffee Export', contactPerson: 'Amina Mohammed', email: 'amina@oromiacoffee.com', phone: '+251-988-890123', address: 'Jimma, Oromia', tin: 'TIN-00089012', isActive: true },
  { id: 'SUP-009', name: 'Axum Transport & Logistics', contactPerson: 'Yonas Gebre', email: 'yonas@axumtrans.com', phone: '+251-999-901234', address: 'Mekele, Tigray', tin: 'TIN-00090123', isActive: true },
  { id: 'SUP-010', name: 'Harar Industrial Supply', contactPerson: 'Fatima Ahmed', email: 'fatima@hararind.com', phone: '+251-910-012345', address: 'Dire Dawa, Industrial Zone', tin: 'TIN-00001234', isActive: false },
  { id: 'SUP-011', name: 'Semien Pharmaceuticals', contactPerson: 'Berhanu Ayele', email: 'berhanu@semienpharma.com', phone: '+251-921-123457', address: 'Gondar, Fasil', tin: 'TIN-00011223', isActive: true },
  { id: 'SUP-012', name: 'Bale Agricultural Products', contactPerson: 'Mulugeta Tadesse', email: 'mulugeta@baleagri.com', phone: '+251-932-234568', address: 'Adama, Oromia', tin: 'TIN-00022334', isActive: true },
  { id: 'SUP-013', name: 'Gambella Timber Works', contactPerson: 'Opiew Gatluak', email: 'opiew@gambellatimber.com', phone: '+251-943-345679', address: 'Addis Ababa, Akaki', tin: 'TIN-00033445', isActive: false },
  { id: 'SUP-014', name: 'Sidama Food Processing', contactPerson: 'Asnakech Wondimu', email: 'asnakech@sidamafood.com', phone: '+251-954-456780', address: 'Hawassa, Sidama', tin: 'TIN-00044556', isActive: true },
  { id: 'SUP-015', name: 'Tigray Engineering Corp', contactPerson: 'Gebremedhin Kahsay', email: 'gebremedhin@tigrayeng.com', phone: '+251-965-567891', address: 'Mekele, Tigray', tin: 'TIN-00055667', isActive: false },
];

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  suppliers = signal<SupplierModel[]>([]);
  useMockData = signal(false);
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
    this.fallbackToMock();
  }

  private fallbackToMock(): void {
    this.suppliers.set(MOCK_SUPPLIERS);
    this.useMockData.set(true);
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
    if (this.formMode() === 'add') {
      const newId = `SUP-${String(this.suppliers().length + 1).padStart(3, '0')}`;
      const newSupplier: SupplierModel = {
        id: newId,
        name: data.name!.trim(),
        contactPerson: data.contactPerson?.trim() || undefined,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        address: data.address?.trim() || undefined,
        tin: data.tin?.trim() || undefined,
        isActive: data.isActive ?? true,
      };
      this.suppliers.update(list => [...list, newSupplier]);
      this.notification.set({ type: 'success', message: `Supplier "${newSupplier.name}" created successfully!` });
    } else {
      this.suppliers.update(list =>
        list.map(s => s.id === data.id ? { ...s, ...data } as SupplierModel : s)
      );
      this.notification.set({ type: 'success', message: `Supplier "${data.name}" updated successfully!` });
    }
    this.closeFormModal();
    this.autoDismissNotification();
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
    this.suppliers.update(list => list.filter(s => s.id !== target.id));
    this.notification.set({ type: 'success', message: `Supplier "${target.name}" deleted successfully!` });
    this.cancelDelete();
    this.autoDismissNotification();
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
