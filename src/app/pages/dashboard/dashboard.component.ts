import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  cards = [
    { title: 'Total Properties', value: '1,245', subtitle: '+12 this month' },
    { title: 'Total Locations', value: '64', subtitle: '+3 active regions' },
    { title: 'Safety Boxes', value: '312', subtitle: '94% operational' },
    { title: 'Pending Requisitions', value: '18', subtitle: '6 urgent approvals' },
  ];

  yTicks = [120, 100, 80, 60, 40, 20, 0];

  barSeries = [
    { label: 'HQ', value: 120 },
    { label: 'North', value: 80 },
    { label: 'South', value: 60 },
  ];

  donutSeries = [
    { label: 'Pending', value: 55, color: '#3b97d3' },
    { label: 'Approved', value: 37, color: '#f65f83' },
    { label: 'Rejected', value: 8, color: '#f79b3f' },
  ];

  get maxBarValue(): number {
    return Math.max(...this.barSeries.map((item) => item.value), 1);
  }

  get donutGradient(): string {
    const total = this.donutSeries.reduce((sum, item) => sum + item.value, 0) || 1;
    let current = 0;
    const stops = this.donutSeries.map((item) => {
      const start = (current / total) * 100;
      current += item.value;
      const end = (current / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }
}
