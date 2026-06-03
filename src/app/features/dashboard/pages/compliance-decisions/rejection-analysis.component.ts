import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface Rejection {
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
  protected readonly rejections = signal<Rejection[]>([]);

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.rejections.set(
        requests
          .filter((request) => this.isRejected(request.status))
          .map((request) => this.toRejection(request)),
      );
    });
  }

  private toRejection(request: ServiceRequestDto): Rejection {
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
