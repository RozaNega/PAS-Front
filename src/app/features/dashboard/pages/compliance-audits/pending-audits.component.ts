import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

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
  imports: [CommonModule],
  templateUrl: './pending-audits.component.html',
  styleUrls: ['./pending-audits.component.scss']
})
export class PendingAuditsComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);
  protected readonly audits = signal<Audit[]>([]);

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.audits.set(
        requests
          .filter((request) => this.isPending(request.status))
          .map((request) => this.toAudit(request)),
      );
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
