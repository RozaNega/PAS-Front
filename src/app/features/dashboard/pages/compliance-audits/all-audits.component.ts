import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  auditedBy: string;
  auditDate: string;
  findings: number;
}

@Component({
  selector: 'app-all-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-audits.component.html',
  styleUrls: ['./all-audits.component.scss']
})
export class AllAuditsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly audits = signal<Audit[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedAudit = signal<Audit | null>(null);

  protected readonly totalCount = computed(() => this.audits().length);
  protected readonly pendingCount = computed(() => this.audits().filter(a => a.status === 'Pending').length);
  protected readonly inProgressCount = computed(() => this.audits().filter(a => a.status === 'In Progress').length);
  protected readonly completedCount = computed(() => this.audits().filter(a => a.status === 'Completed').length);

  ngOnInit(): void {
    this.loadAudits();
  }

  loadAudits(): void {
    this.loading.set(true);
    this.error.set(null);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        this.audits.set(requests.map((request) => this.toAudit(request)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load audits. Please try again.');
        this.loading.set(false);
      }
    });
  }

  viewAudit(audit: Audit): void {
    this.selectedAudit.set(audit);
  }

  closeModal(): void {
    this.selectedAudit.set(null);
  }

  exportCsv(): void {
    const rows = this.audits();
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Audit ID', 'Type', 'Audited By', 'Date', 'Findings', 'Status'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [esc(r.auditId), esc(r.type), esc(r.auditedBy), esc(r.auditDate), esc(r.findings), esc(r.status)].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-audits-${new Date().toISOString().split('T')[0]}.csv`;
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

  private toAudit(request: ServiceRequestDto): Audit {
    return {
      id: `aud_${request.id}`,
      auditId: `AUD-${this.requestNumber(request).replace(/^SR-/, '')}`,
      type: 'Service Request Review',
      status: this.auditStatus(request.status),
      auditedBy: request.approvedBy || request.requesterName || 'Unassigned',
      auditDate: this.toDateOnly(request.approvedDate || request.requestDate),
      findings: request.quantity ?? 0,
    };
  }

  private auditStatus(status: string): Audit['status'] {
    const normalized = status?.toLowerCase() ?? '';
    if (normalized.includes('complete') || normalized.includes('approved') || normalized.includes('issued')) {
      return 'Completed';
    }
    if (normalized.includes('pending') || normalized.includes('submitted') || normalized.includes('review')) {
      return 'Pending';
    }
    return 'In Progress';
  }

  private requestNumber(request: ServiceRequestDto): string {
    return request.requestNumber || request.id;
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
}
