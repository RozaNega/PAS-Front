import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreIssueVoucherService, StoreIssueVoucherDto } from '../../services/siv.service';

@Component({
  selector: 'app-siv-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './siv-list.component.html',
  styleUrls: ['./siv-list.component.scss']
})
export class SivListComponent {
  private readonly sivService = inject(StoreIssueVoucherService);
  private readonly router = inject(Router);

  readonly currentYear = new Date().getFullYear();

  private rowMatchesStatus(row: StoreIssueVoucherDto, expected: string): boolean {
    return (row.status ?? '').toLowerCase() === expected.toLowerCase();
  }

  statusEquals(siv: StoreIssueVoucherDto, expected: string): boolean {
    return this.rowMatchesStatus(siv, expected);
  }

  displayCell(value: string | undefined | null): string {
    if (value === undefined || value === null) return '—';
    const s = String(value).trim();
    return s.length ? s : '—';
  }

  hasCell(value: string | undefined | null): boolean {
    return this.displayCell(value) !== '—';
  }

  readonly statusCounts = computed(() => {
    const rows = this.sivs();
    return {
      all: rows.length,
      pending: rows.filter((r) => this.rowMatchesStatus(r, 'Pending')).length,
      issued: rows.filter((r) => this.rowMatchesStatus(r, 'Issued')).length,
      completed: rows.filter((r) => this.rowMatchesStatus(r, 'Completed')).length,
      cancelled: rows.filter((r) => this.rowMatchesStatus(r, 'Cancelled')).length,
    };
  });
  
  searchTerm = signal('');
  statusFilter = signal('All');
  departmentFilter = signal('All');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  loading = signal(false);
  error = signal<string | null>(null);
  
  sivs = signal<StoreIssueVoucherDto[]>([]);
  totalSivs = signal(0);
  
  statuses = ['All', 'Pending', 'Issued', 'Completed', 'Cancelled'];
  departments = ['All', 'IT', 'HR', 'Finance', 'Operations', 'Warehouse', 'Sales', 'Marketing', 'Procurement'];

  constructor() {
    effect(() => {
      this.searchTerm();
      this.departmentFilter();
      this.loadSivs();
    });
  }

  filteredSivs = computed(() => {
    let result = [...this.sivs()];

    if (this.searchTerm()) {
      const q = this.searchTerm().toLowerCase();
      result = result.filter(siv =>
        siv.sivNumber?.toLowerCase().includes(q) ||
        siv.serviceRequestNumber?.toLowerCase().includes(q) ||
        siv.issuedToName?.toLowerCase().includes(q) ||
        siv.department?.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter() !== 'All') {
      result = result.filter((siv) => this.rowMatchesStatus(siv, this.statusFilter()));
    }

    if (this.departmentFilter() !== 'All') {
      result = result.filter(siv => siv.department === this.departmentFilter());
    }

    return result;
  });

  pagedSivs = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    const end = start + this.rowsPerPage();
    return this.filteredSivs().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.filteredSivs().length / this.rowsPerPage()));

  displayRange = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), this.filteredSivs().length);
    return { start, end };
  });
  
  loadSivs(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: any = {};

    if (this.searchTerm()) {
      params.searchTerm = this.searchTerm();
    }

    if (this.departmentFilter() !== 'All') {
      params.department = this.departmentFilter();
    }

    this.sivService.getAll(params).subscribe({
      next: (response) => {
        if (response.success !== false && Array.isArray(response.data)) {
          this.sivs.set(response.data);
          this.totalSivs.set(response.data.length);
        } else {
          this.error.set(response.message || 'No SIV data received from server');
        }
        this.loading.set(false);
      },
      error: (err: unknown) => {
        console.error('Error loading SIVs', err);
        let errorMessage = 'Failed to load Store Issue Vouchers. Please try again.';
        if (err && typeof err === 'object' && 'error' in err) {
          const httpErr = err as { error?: { message?: string; title?: string } | string; status?: number; statusText?: string };
          const body = httpErr.error;
          if (body && typeof body === 'object') {
            if (body.message) errorMessage = body.message;
            else if (body.title) errorMessage = body.title;
          } else if (typeof body === 'string') {
            errorMessage = body;
          }
          if (httpErr.status) {
            errorMessage = `[${httpErr.status} ${httpErr.statusText ?? ''}] ${errorMessage}`;
          }
        }
        this.error.set(errorMessage);
        this.loading.set(false);
      },
    });
  }

  onSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  onStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onDepartmentFilter(e: Event): void {
    this.departmentFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('All');
    this.departmentFilter.set('All');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  closeSheet(sheet: HTMLDetailsElement): void {
    sheet.removeAttribute('open');
  }

  viewSiv(id: string): void {
    this.router.navigate(['/admin/sivs', id]);
  }

  printSiv(id: string): void {
    this.sivService.print(id).subscribe({
      next: (response) => {
        if (response.success) {
          window.print();
        } else {
          alert('Failed to print SIV: ' + response.message);
        }
      },
      error: (err: unknown) => {
        console.error('Error printing SIV:', err);
        alert('Failed to print SIV. Please try again.');
      },
    });
  }

  deleteSiv(id: string): void {
    if (confirm('Are you sure you want to delete this Store Issue Voucher? This action cannot be undone.')) {
      this.sivService.delete(id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Store Issue Voucher deleted successfully');
            this.loadSivs();
          } else {
            alert('Failed to delete SIV: ' + response.message);
          }
        },
        error: (err: unknown) => {
          console.error('Error deleting SIV:', err);
          alert('Failed to delete SIV. Please try again.');
        },
      });
    }
  }

  editSiv(id: string): void {
    this.viewSiv(id);
  }

  createNewSiv(): void {
    void this.router.navigate(['/admin/sivs/new']);
  }

  exportSivs(format: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const rows = this.filteredSivs();
    if (!rows.length) {
      alert('No SIV rows to export for the current filters.');
      return;
    }
    const escape = (v: string | number | undefined | null) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = [
      'SIV Number',
      'SR Number',
      'Issued To',
      'Issued By',
      'Department',
      'Status',
      'Items',
      'Quantity',
      'Issue Date',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          escape(r.sivNumber),
          escape(r.serviceRequestNumber),
          escape(r.issuedToName),
          escape(r.issuedByName),
          escape(r.department),
          escape(r.status),
          escape(r.totalItems),
          escape(r.totalQuantity),
          escape(this.formatDate(r.issueDate)),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'excel' ? 'xls' : 'csv';
    a.download = `store-issue-vouchers.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    if (format === 'pdf') {
      window.print();
    }
  }
  
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'req-badge--warning';
      case 'issued':
        return 'req-badge--success';
      case 'completed':
        return 'req-badge--info';
      case 'cancelled':
        return 'req-badge--danger';
      default:
        return 'req-badge--neutral';
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  viewServiceRequest(serviceRequestId: string): void {
    this.router.navigate(['/admin/requisitions', serviceRequestId]);
  }

  trackBySivId(index: number, item: StoreIssueVoucherDto): string {
    return item.id;
  }
}