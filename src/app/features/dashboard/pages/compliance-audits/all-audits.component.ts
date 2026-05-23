import { Component, OnInit, inject, signal } from '@angular/core';
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

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.audits.set(requests.map((request) => this.toAudit(request)));
    });
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
