import { Component, Input } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  TooltipComponent,
  GridComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-sm font-semibold text-slate-700">{{ title }}</h3>
      <div echarts [options]="options" class="h-72 w-full"></div>
    </section>
  `,
})
export class ChartWidgetComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) options: Record<string, unknown> = {};
}
