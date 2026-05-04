import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  urgent: number;
}

export interface MonthlyData {
  month: string;
  count: number;
}

export interface ValueSummary {
  totalValue: string;
  averageValue: string;
  highestValue: string;
  highestValueRequest: string;
}

@Component({
  selector: 'app-requests-summary-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requests-summary-page.component.html',
  styleUrl: './requests-summary-page.component.scss',
})
export class RequestsSummaryPageComponent {
  stats: RequestStats = {
    total: 23,
    pending: 2,
    approved: 12,
    rejected: 3,
    completed: 6,
    urgent: 1,
  };

  monthlyData: MonthlyData[] = [
    { month: 'Jan', count: 2 },
    { month: 'Feb', count: 1 },
    { month: 'Mar', count: 3 },
    { month: 'Apr', count: 2 },
    { month: 'May', count: 1 },
    { month: 'Jun', count: 2 },
    { month: 'Jul', count: 2 },
    { month: 'Aug', count: 3 },
    { month: 'Sep', count: 2 },
    { month: 'Oct', count: 2 },
    { month: 'Nov', count: 1 },
    { month: 'Dec', count: 2 },
  ];

  valueSummary: ValueSummary = {
    totalValue: '$15,250',
    averageValue: '$663',
    highestValue: '$5,348',
    highestValueRequest: 'SR-2024-123',
  };

  get approvedPercentage(): number {
    return Math.round((this.stats.approved / this.stats.total) * 100);
  }

  get pendingPercentage(): number {
    return Math.round((this.stats.pending / this.stats.total) * 100);
  }

  get rejectedPercentage(): number {
    return Math.round((this.stats.rejected / this.stats.total) * 100);
  }

  get completedPercentage(): number {
    return Math.round((this.stats.completed / this.stats.total) * 100);
  }
}
