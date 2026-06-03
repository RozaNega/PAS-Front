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

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.audits.set(
        requests
          .filter((request) => this.isCompleted(request.status))
          .map((request) => this.toAudit(request)),
      );
    });
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
