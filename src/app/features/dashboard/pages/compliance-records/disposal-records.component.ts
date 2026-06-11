import { Component, OnInit, inject, signal } from '@angular/core';
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

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    this.disposalService.getAll({ pageSize: 100 }).subscribe({
      next: (res) => {
        this.records.set((res.data as any)?.items || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getStatusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'pending';
      case 'completed': return 'approved';
      case 'rejected': return 'rejected';
      default: return '';
    }
  }
}
