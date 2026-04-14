import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-filter',
  imports: [],
  templateUrl: './stock-filter.html',
  styleUrl: './stock-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockFilter {
  readonly title = 'Stock Filter';
  readonly description = 'Functional implementation scaffold for Stock Filter.';
}