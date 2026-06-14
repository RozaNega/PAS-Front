import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisposalRecordsService } from '../../../../core/services/disposal-records.service';

interface DisposalSummary {
  totalDisposals: number;
  totalItems: number;
  totalQuantity: number;
  totalEstimatedValue: number;
  averageValuePerItem: number;
  pendingApprovals: number;
  approvedDisposals: number;
  rejectedDisposals: number;
}

interface DisposalByReason {
  reason: string;
  count: number;
  totalQuantity: number;
  totalValue: number;
}

interface DisposalByMonth {
  label: string;
  month: string;
  value: number;
  totalQuantity: number;
  totalValue: number;
}

@Component({
  selector: 'app-disposal-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposal-reports.component.html',
  styleUrls: ['./disposal-reports.component.scss'],
})
export class DisposalReportsComponent implements OnInit {
  private disposalService = inject(DisposalRecordsService);

  summary = signal<DisposalSummary | null>(null);
  byReason = signal<DisposalByReason[]>([]);
  byMonth = signal<DisposalByMonth[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  isModalOpen = signal(false);
  selectedDetail = signal<'summary' | 'reason' | 'month'>('summary');

  ngOnInit(): void {
    this.loadReport();
  }

  loadReport(): void {
    this.loading.set(true);
    this.error.set(null);
    this.disposalService.getAll({ pageSize: 9999 }).subscribe({
      next: (res) => {
        const items = (res.data as any)?.items || [];
        if (items.length === 0) {
          this.summary.set(null);
          this.byReason.set([]);
          this.byMonth.set([]);
        } else {
          this.buildReport(items);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message || 'Failed to load disposal records');
      },
    });
  }

  private buildReport(disposals: any[]): void {
    const completed = disposals.filter((d) => d.status === 'Completed');
    const pending = disposals.filter((d) => d.status === 'Pending');
    const rejected = disposals.filter((d) => d.status === 'Rejected');
    const totalValue = completed.reduce((s, d) => s + (Number(d.totalValue) || 0), 0);
    const totalQty = disposals.reduce((s, d) => s + (Number(d.totalQuantity) || Number(d.quantity) || 0), 0);

    this.summary.set({
      totalDisposals: disposals.length,
      totalItems: disposals.reduce((s, d) => s + (d.totalItems || d.items?.length || 0), 0),
      totalQuantity: totalQty,
      totalEstimatedValue: totalValue,
      averageValuePerItem: disposals.length ? totalValue / disposals.length : 0,
      pendingApprovals: pending.length,
      approvedDisposals: completed.length,
      rejectedDisposals: rejected.length,
    });

    const byReasonMap = new Map<string, DisposalByReason>();
    disposals.forEach((d) => {
      const r = d.reason || 'Not specified';
      const existing = byReasonMap.get(r) || { reason: r, count: 0, totalQuantity: 0, totalValue: 0 };
      existing.count++;
      existing.totalQuantity += Number(d.totalQuantity) || Number(d.quantity) || 0;
      existing.totalValue += Number(d.totalValue) || 0;
      byReasonMap.set(r, existing);
    });
    this.byReason.set(Array.from(byReasonMap.values()));

    const byMonthMap = new Map<string, DisposalByMonth>();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    disposals.forEach((d) => {
      const dateStr = d.createdAt || d.disposalDate;
      if (!dateStr) return;
      const m = dateStr.slice(0, 7);
      const existing = byMonthMap.get(m) || { label: months[parseInt(m.slice(5,7),10)-1] || m, month: m, value: 0, totalQuantity: 0, totalValue: 0 };
      existing.value++;
      existing.totalQuantity += Number(d.totalQuantity) || Number(d.quantity) || 0;
      existing.totalValue += Number(d.totalValue) || 0;
      byMonthMap.set(m, existing);
    });
    this.byMonth.set(Array.from(byMonthMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([_, v]) => v));
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
  }

  openModal(section: 'summary' | 'reason' | 'month'): void {
    this.selectedDetail.set(section);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  exportCsv(): void {
    const s = this.summary();
    if (!s) return;
    const rows: string[] = ['Section,Label,Count,Quantity,Value'];
    this.byReason().forEach(r => rows.push(`By Reason,${r.reason},${r.count},${r.totalQuantity},${r.totalValue}`));
    this.byMonth().forEach(m => rows.push(`By Month,${m.label} (${m.month}),${m.value},${m.totalQuantity},${m.totalValue}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'disposal-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
