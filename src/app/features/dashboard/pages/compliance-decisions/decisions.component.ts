import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface DecisionEntry {
  id: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  status: string;
  decisionDate: string;
  decidedBy: string;
  value: number;
  outcome: 'Approved' | 'Rejected';
}

@Component({
  selector: 'app-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './decisions.component.html',
  styleUrls: ['./decisions.component.scss']
})
export class DecisionsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly decisions = signal<DecisionEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedDecision = signal<DecisionEntry | null>(null);

  protected readonly totalCount = computed(() => this.decisions().length);
  protected readonly approvedCount = computed(() => this.decisions().filter(d => d.outcome === 'Approved').length);
  protected readonly rejectedCount = computed(() => this.decisions().filter(d => d.outcome === 'Rejected').length);
  protected readonly pendingCount = computed(() => this.decisions().filter(d => d.outcome !== 'Approved' && d.outcome !== 'Rejected').length);

  ngOnInit(): void {
    this.loadDecisions();
  }

  loadDecisions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        this.decisions.set(requests.map((request) => this.toDecision(request)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load decisions. Please try again.');
        this.loading.set(false);
      }
    });
  }

  viewDecision(d: DecisionEntry): void {
    this.selectedDecision.set(d);
  }

  closeModal(): void {
    this.selectedDecision.set(null);
  }

  exportCsv(): void {
    const rows = this.decisions();
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Request #', 'Requester', 'Department', 'Status', 'Decision Date', 'Decided By', 'Value', 'Outcome'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [esc(r.requestNumber), esc(r.requesterName), esc(r.department), esc(r.status), esc(r.decisionDate), esc(r.decidedBy), esc(r.value), esc(r.outcome)].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  refresh(): void {
    this.loadDecisions();
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

  private toDecision(request: ServiceRequestDto): DecisionEntry {
    return {
      id: `dec_${request.id}`,
      requestNumber: request.requestNumber || request.id,
      requesterName: request.requesterName || 'Unknown',
      department: request.department || 'N/A',
      status: request.status,
      decisionDate: this.toDateOnly(request.approvedDate || request.requestDate),
      decidedBy: request.approvedBy || request.requesterName || 'Unassigned',
      value: request.quantity ?? 0,
      outcome: this.resolveOutcome(request.status),
    };
  }

  private resolveOutcome(status: string): DecisionEntry['outcome'] {
    const s = status?.toLowerCase() ?? '';
    if (s.includes('approved') || s.includes('complete') || s.includes('issued')) {
      return 'Approved';
    }
    if (s.includes('rejected') || s.includes('denied') || s.includes('cancel')) {
      return 'Rejected';
    }
    return 'Approved';
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }

  constructor() {
    setTimeout(() => this.loading.set(false), 600);
  }
}
