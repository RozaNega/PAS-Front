import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-reserve',
  imports: [],
  templateUrl: './stock-reserve.html',
  styleUrl: './stock-reserve.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockReserve {
  readonly title = 'Stock Reserve';
  readonly description = 'Functional implementation scaffold for Stock Reserve.';
}