import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';
import { finalize } from 'rxjs';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
}

@Component({
  selector: 'app-pending-audits',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe],
  templateUrl: './pending-audits.component.html',
  styleUrls: ['./pending-audits.component.scss']
})
export class PendingAuditsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);
  protected readonly audits = signal<Audit[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly selectedAudit = signal<Audit | null>(null);

  ngOnInit(): void {
    this.loadAudits();
  }

  protected get totalPending(): number {
    return this.audits().length;
  }

  protected get highPriorityCount(): number {
    return this.audits().filter(a => a.priority === 'High').length;
  }

  protected get normalPriorityCount(): number {
    return this.audits().filter(a => a.priority === 'Normal').length;
  }

  protected getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  protected refresh(): void {
    this.loadAudits();
  }

  protected retry(): void {
    this.loadAudits();
  }

  protected viewDetails(audit: Audit): void {
    this.selectedAudit.set(audit);
  }

  protected closeModal(): void {
    this.selectedAudit.set(null);
  }

  protected exportCsv(): void {
    const rows = this.audits();
    if (rows.length === 0) return;

    const headers = ['Audit ID', 'Type', 'Assigned To', 'Due Date', 'Priority'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r =>
        [r.auditId, r.type, r.assignedTo, r.dueDate, r.priority].map(v => `"${v}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-audits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private loadAudits(): void {
    this.loading.set(true);
    this.error.set(false);

    this.complianceData.getServiceRequests().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (requests) => {
        this.audits.set(
          requests
            .filter((request) => this.isPending(request.status))
            .map((request) => this.toAudit(request)),
        );
      },
      error: () => {
        this.error.set(true);
        this.audits.set([]);
      }
    });
  }

  private toAudit(request: ServiceRequestDto): Audit {
    const requestDate = request.requestDate ? new Date(request.requestDate) : new Date();
    const dueDate = new Date(requestDate.getTime() + 5 * 86400000);
    return {
      id: `aud_pend_${request.id}`,
      auditId: `AUD-${(request.requestNumber || request.id).replace(/^SR-/, '')}`,
      type: 'Service Request Review',
      priority: this.priorityFromStatus(request.status),
      assignedTo: request.approvedBy || 'Compliance Officer',
      dueDate: dueDate.toISOString().split('T')[0],
    };
  }

  private isPending(status: string): boolean {
    const normalized = status?.toLowerCase() ?? '';
    return (
      normalized.includes('pending') ||
      normalized.includes('submitted') ||
      normalized.includes('review') ||
      normalized.includes('awaiting')
    );
  }

  private priorityFromStatus(status: string): string {
    return status?.toLowerCase().includes('overdue') ? 'High' : 'Normal';
  }
}
