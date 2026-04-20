import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-pages',
  imports: [DecimalPipe],
  templateUrl: './pages.html',
  styleUrl: './pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pages {
  readonly selectedPeriod = signal<'7D' | '30D' | '90D'>('30D');

  readonly periods: Array<'7D' | '30D' | '90D'> = ['7D', '30D', '90D'];

  readonly periodFactors: Record<'7D' | '30D' | '90D', number> = {
    '7D': 0.82,
    '30D': 1,
    '90D': 1.18,
  };

  readonly trends = [
    { direction: 'up', value: '+4.2%' },
    { direction: 'up', value: '+2.1%' },
    { direction: 'up', value: '+5.0%' },
    { direction: 'down', value: '-1.3%' },
  ];

  setPeriod(period: '7D' | '30D' | '90D'): void {
    this.selectedPeriod.set(period);
  }

  readonly summaryCards = computed(() => {
    const factor = this.periodFactors[this.selectedPeriod()];

    return [
      {
        title: 'Total Properties',
        value: Math.round(1245 * factor),
        caption: 'Registered assets',
        icon: 'bi bi-box-seam-fill'
      },
      {
        title: 'Total Locations',
        value: Math.round(3 * factor),
        caption: 'Active locations',
        icon: 'bi bi-geo-alt-fill'
      },
      {
        title: 'Total Safety Boxes',
        value: Math.round(312 * factor),
        caption: 'Secured boxes',
        icon: 'bi bi-lock-fill'
      },
      {
        title: 'Pending Requisitions',
        value: Math.round(18 * factor),
        caption: 'Awaiting approval',
        icon: 'bi bi-clock-history'
      },
    ];
  });

  readonly barSeries = computed(() => {
    const factor = this.periodFactors[this.selectedPeriod()];

    return [
      { label: 'HQ', value: Math.round(80 * factor) },
      { label: 'North', value: Math.round(60 * factor) },
      { label: 'South', value: Math.round(120 * factor) },
    ];
  });

  readonly maxBarValue = computed(() => Math.max(...this.barSeries().map((item) => item.value), 1));

  readonly donutSeries = computed(() => {
    const base = this.selectedPeriod() === '7D' ? [53, 30, 17] : this.selectedPeriod() === '90D' ? [58, 28, 14] : [56, 31, 13];

    return [
      { label: 'Pending', value: base[0], color: '#3b97d3' },
      { label: 'Approved', value: base[1], color: '#f65f83' },
      { label: 'Rejected', value: base[2], color: '#f79b3f' },
    ];
  });

  readonly donutGradient = computed(() => {
    const series = this.donutSeries();
    const total = series.reduce((sum, item) => sum + item.value, 0) || 1;
    let current = 0;
    const segments = series.map((item) => {
      const start = (current / total) * 100;
      current += item.value;
      const end = (current / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  });
}
