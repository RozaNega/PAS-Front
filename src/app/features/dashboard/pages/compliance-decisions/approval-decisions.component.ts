import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface Decision {
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
  protected readonly decisions = signal<Decision[]>([]);

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.decisions.set(
        requests
          .filter((request) => this.isApproved(request.status))
          .map((request) => this.toDecision(request)),
      );
    });
  }

  private toDecision(request: ServiceRequestDto): Decision {
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
