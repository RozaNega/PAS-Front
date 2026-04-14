import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-detail',
  imports: [],
  templateUrl: './stock-detail.html',
  styleUrl: './stock-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockDetail {
  readonly title = 'Stock Detail';
  readonly description = 'Functional implementation scaffold for Stock Detail.';
}