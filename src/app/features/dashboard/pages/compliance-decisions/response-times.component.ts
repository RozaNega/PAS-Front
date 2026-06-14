import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

interface ResponseTime {
  id: string;
  approver: string;
  department: string;
  avgResponseTime: string;
  totalDecisions: number;
  onTimeRate: number;
}

@Component({
  selector: 'app-response-times',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './response-times.component.html',
  styleUrls: ['./response-times.component.scss']
})
export class ResponseTimesComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);

  protected readonly responseTimes = signal<ResponseTime[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedItem = signal<ResponseTime | null>(null);

  protected readonly totalApprovers = computed(() => this.responseTimes().length);
  protected readonly totalDecisions = computed(() => this.responseTimes().reduce((sum, r) => sum + r.totalDecisions, 0));
  protected readonly avgOnTimeRate = computed(() => {
    const items = this.responseTimes();
    return items.length > 0 ? Math.round(items.reduce((sum, r) => sum + r.onTimeRate, 0) / items.length) : 0;
  });
  protected readonly fastestApprover = computed(() => {
    const items = this.responseTimes();
    if (items.length === 0) return 'N/A';
    let best = items[0];
    let bestHours = this.parseHours(best.avgResponseTime);
    for (let i = 1; i < items.length; i++) {
      const h = this.parseHours(items[i].avgResponseTime);
      if (h < bestHours) {
        bestHours = h;
        best = items[i];
      }
    }
    return best.approver;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.complianceData.getServiceRequests().subscribe({
      next: (requests) => {
        const data = this.buildResponseTimes(requests);
        this.responseTimes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load response times. Please try again.');
        this.loading.set(false);
      }
    });
  }

  viewItem(item: ResponseTime): void {
    this.selectedItem.set(item);
  }

  closeModal(): void {
    this.selectedItem.set(null);
  }

  refresh(): void {
    this.loadData();
  }

  exportCsv(): void {
    const rows = this.responseTimes();
    if (rows.length === 0) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const headers = ['Approver', 'Department', 'Total Decisions', 'Avg Response Time', 'On-Time Rate'];
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [esc(r.approver), esc(r.department), esc(r.totalDecisions), esc(r.avgResponseTime), esc(`${r.onTimeRate}%`)].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-times-${new Date().toISOString().split('T')[0]}.csv`;
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

  private parseHours(value: string): number {
    const minsMatch = value.match(/(\d+)\s*mins?/);
    if (minsMatch) return parseInt(minsMatch[1], 10) / 60;
    const hoursMatch = value.match(/([\d.]+)\s*hours?/);
    if (hoursMatch) return parseFloat(hoursMatch[1]);
    return 0;
  }

  private buildResponseTimes(requests: ServiceRequestDto[]): ResponseTime[] {
    const decided = requests.filter((request) => request.approvedDate);
    const groups: Record<string, { total: number; sumMs: number; onTime: number; dept: string }> = {};

    decided.forEach((request) => {
      const approver = request.approvedBy || 'Approver';
      const submitted = new Date(request.requestDate).getTime();
      const reviewed = new Date(request.approvedDate as string).getTime();
      const diffMs = Math.max(0, reviewed - submitted);
      const hours = diffMs / 3600000;

      groups[approver] ??= { total: 0, sumMs: 0, onTime: 0, dept: request.department || 'Unassigned' };
      groups[approver].total += 1;
      groups[approver].sumMs += diffMs;
      if (hours <= 24) {
        groups[approver].onTime += 1;
      }
    });

    return Object.entries(groups).map(([approver, group], index) => {
      const avgHours = group.total > 0 ? group.sumMs / group.total / 3600000 : 0;
      return {
        id: `resp_${index}`,
        approver,
        department: group.dept,
        avgResponseTime:
          avgHours < 1 ? `${Math.max(1, Math.round(avgHours * 60))} mins` : `${avgHours.toFixed(1)} hours`,
        totalDecisions: group.total,
        onTimeRate: group.total > 0 ? Math.round((group.onTime / group.total) * 100) : 100,
      };
    });
  }
}
