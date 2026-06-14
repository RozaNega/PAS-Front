import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  completedBy: string;
  completedDate: string;
  findings: number;
  riskLevel: string;
}

@Component({
  selector: 'app-completed-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completed-audits.component.html',
  styleUrls: ['./completed-audits.component.scss']
})
export class CompletedAuditsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);
  protected readonly audits = signal<Audit[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly selectedAudit = signal<Audit | null>(null);

  ngOnInit(): void {
    this.loadAudits();
  }

  protected loadAudits(): void {
    this.loading.set(true);
    this.error.set(false);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        this.audits.set(
          requests
            .filter((request) => this.isCompleted(request.status))
            .map((request) => this.toAudit(request)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected viewAudit(audit: Audit): void {
    this.selectedAudit.set(audit);
  }

  protected closeModal(): void {
    this.selectedAudit.set(null);
  }

  protected exportCsv(): void {
    const data = this.audits();
    if (!data.length) return;

    const headers = ['Audit ID', 'Type', 'Completed By', 'Completed Date', 'Findings', 'Risk Level', 'Status'];
    const rows = data.map((a) => [
      a.auditId,
      a.type,
      a.completedBy,
      a.completedDate,
      a.findings.toString(),
      a.riskLevel,
      'Completed',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'completed-audits.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  protected totalCompleted(): number {
    return this.audits().length;
  }

  protected highRiskCount(): number {
    return this.audits().filter((a) => a.riskLevel === 'High').length;
  }

  protected lowRiskCount(): number {
    return this.audits().filter((a) => a.riskLevel === 'Low').length;
  }

  private toAudit(request: ServiceRequestDto): Audit {
    return {
      id: `aud_comp_${request.id}`,
      auditId: `AUD-${(request.requestNumber || request.id).replace(/^SR-/, '')}`,
      type: 'Requisition Clearance',
      completedBy: request.approvedBy || 'Approver',
      completedDate: this.toDateOnly(request.approvedDate || request.requestDate),
      findings: 0,
      riskLevel: this.riskFromQuantity(request.quantity),
    };
  }

  private isCompleted(status: string): boolean {
    const normalized = status?.toLowerCase() ?? '';
    return normalized.includes('complete') || normalized.includes('approved') || normalized.includes('issued');
  }

  private riskFromQuantity(quantity: number): string {
    return quantity > 10 ? 'High' : 'Low';
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
}
