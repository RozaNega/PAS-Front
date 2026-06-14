import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface ApprovalEntry {
  id: string;
  requestNumber: string;
  approver: string;
  department: string;
  approvedDate: string;
  value: number;
}

@Component({
  selector: 'app-approval-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-decisions.component.html',
  styleUrls: ['./approval-decisions.component.scss']
})
export class ApprovalDecisionsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly approvals = signal<ApprovalEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedApproval = signal<ApprovalEntry | null>(null);

  protected readonly totalApprovals = computed(() => this.approvals().length);
  protected readonly totalValue = computed(() => this.approvals().reduce((sum, a) => sum + a.value, 0));

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        this.approvals.set(
          requests
            .filter((request) => this.isApproved(request.status))
            .map((request) => this.toApprovalEntry(request)),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load approvals. Please try again.');
        this.loading.set(false);
      }
    });
  }

  viewApproval(approval: ApprovalEntry): void {
    this.selectedApproval.set(approval);
  }

  closeModal(): void {
    this.selectedApproval.set(null);
  }

  exportCsv(): void {
    const rows = this.approvals();
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Request #', 'Approver', 'Department', 'Approved Date', 'Value'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [esc(r.requestNumber), esc(r.approver), esc(r.department), esc(r.approvedDate), esc(r.value)].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approval-decisions-${new Date().toISOString().split('T')[0]}.csv`;
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

  private toApprovalEntry(request: ServiceRequestDto): ApprovalEntry {
    return {
      id: `dec_app_${request.id}`,
      requestNumber: request.requestNumber || request.id,
      approver: request.approvedBy || 'Approver',
      department: request.department || 'Unassigned',
      approvedDate: this.toDateOnly(request.approvedDate || request.requestDate),
      value: request.quantity ?? 0,
    };
  }

  private isApproved(status: string): boolean {
    const normalized = status?.toLowerCase() ?? '';
    return normalized.includes('approved') || normalized.includes('complete') || normalized.includes('issued');
  }

  private toDateOnly(value?: string): string {
    return value ? new Date(value).toISOString().split('T')[0] : '';
  }
}
