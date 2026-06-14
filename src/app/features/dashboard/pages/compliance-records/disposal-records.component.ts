import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisposalRecordsService, DisposalRecordDto } from '../../../../core/services/disposal-records.service';

@Component({
  selector: 'app-disposal-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposal-records.component.html',
  styleUrls: ['./disposal-records.component.scss']
})
export class DisposalRecordsComponent implements OnInit {
  private disposalService = inject(DisposalRecordsService);

  records = signal<DisposalRecordDto[]>([]);
  loading = signal(false);
  error = signal(false);
  selectedRecord = signal<DisposalRecordDto | null>(null);

  totalRecords = computed(() => this.records().length);
  pendingCount = computed(() => this.records().filter(r => r.status === 'Pending').length);
  completedCount = computed(() => this.records().filter(r => r.status === 'Completed').length);
  rejectedCount = computed(() => this.records().filter(r => r.status === 'Rejected').length);

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    this.error.set(false);
    this.disposalService.getAll({ pageSize: 100 }).subscribe({
      next: (res) => {
        this.records.set((res.data as any)?.items || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  viewRecord(record: DisposalRecordDto): void {
    this.selectedRecord.set(record);
  }

  closeModal(): void {
    this.selectedRecord.set(null);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  exportCSV(): void {
    const data = this.records();
    if (!data.length) return;
    const headers = ['Disposal Number', 'Item Name', 'SKU', 'Quantity', 'Disposal Date', 'Disposed By', 'Status', 'Estimated Value', 'Actual Value'];
    const rows = data.map(r => [
      r.disposalNumber || r.id,
      r.itemName || '',
      r.sku || '',
      r.quantity,
      r.disposalDate ? new Date(r.disposalDate).toLocaleDateString() : '',
      r.disposedByName || r.disposedBy || '',
      r.status || '',
      r.estimatedValue,
      r.actualValue,
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disposal-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
