import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface RejectionEntry {
  id: string;
  requestNumber: string;
  rejecter: string;
  department: string;
  rejectionDate: string;
  value: number;
  reason: string;
}

@Component({
  selector: 'app-rejection-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejection-analysis.component.html',
  styleUrls: ['./rejection-analysis.component.scss']
})
export class RejectionAnalysisComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly rejections = signal<RejectionEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedRejection = signal<RejectionEntry | null>(null);

  protected readonly totalRejections = computed(() => this.rejections().length);
  protected readonly totalValue = computed(() => this.rejections().reduce((sum, r) => sum + r.value, 0));
  protected readonly topReason = computed(() => {
    const reasons = this.rejections().map(r => r.reason);
    if (reasons.length === 0) return 'N/A';
    const freq = new Map<string, number>();
    let maxCount = 0;
    let mode = reasons[0];
    for (const r of reasons) {
      const count = (freq.get(r) ?? 0) + 1;
      freq.set(r, count);
      if (count > maxCount) {
        maxCount = count;
        mode = r;
      }
    }
    return mode;
  });

  ngOnInit(): void {
    this.loadRejections();
  }

  loadRejections(): void {
    this.loading.set(true);
    this.error.set(null);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        this.rejections.set(
          requests
            .filter((request) => this.isRejected(request.status))
            .map((request) => this.toRejection(request)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load rejection data. Please try again.');
        this.loading.set(false);
      }
    });
  }

  refresh(): void {
    this.loadRejections();
  }

  viewRejection(rejection: RejectionEntry): void {
    this.selectedRejection.set(rejection);
  }

  closeModal(): void {
    this.selectedRejection.set(null);
  }

  exportCsv(): void {
    const rows = this.rejections();
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Request #', 'Rejected By', 'Department', 'Rejection Date', 'Value', 'Reason'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [esc(r.requestNumber), esc(r.rejecter), esc(r.department), esc(r.rejectionDate), esc(r.value), esc(r.reason)].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rejection-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected getInitials(name: string): string {
    return name.split(' ').map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  }

  protected hslFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 65%, 88%)`;
  }

  private toRejection(request: ServiceRequestDto): RejectionEntry {
    return {
      id: `rej_${request.id}`,
      requestNumber: request.requestNumber || request.id,
      rejecter: request.approvedBy || 'Reviewer',
      department: request.department || 'Unassigned',
      rejectionDate: this.toDateOnly(request.approvedDate || request.requestDate),
      value: request.quantity ?? 0,
      reason: request.reason || request.status,
    };
  }

  private isRejected(status: string): boolean {
    const normalized = status?.toLowerCase() ?? '';
    return normalized.includes('rejected') || normalized.includes('denied') || normalized.includes('cancel');
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
}
