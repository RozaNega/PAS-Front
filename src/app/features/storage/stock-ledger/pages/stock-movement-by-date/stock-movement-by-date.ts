import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-movement-by-date',
  imports: [],
  templateUrl: './stock-movement-by-date.html',
  styleUrl: './stock-movement-by-date.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockMovementByDate {
  readonly title = 'Stock Movement By Date';
  readonly description = 'Functional implementation scaffold for Stock Movement By Date.';
}