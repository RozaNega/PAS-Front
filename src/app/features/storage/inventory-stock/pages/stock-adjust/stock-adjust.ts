import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-adjust',
  imports: [],
  templateUrl: './stock-adjust.html',
  styleUrl: './stock-adjust.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjust {
  readonly title = 'Stock Adjust';
  readonly description = 'Functional implementation scaffold for Stock Adjust.';
}