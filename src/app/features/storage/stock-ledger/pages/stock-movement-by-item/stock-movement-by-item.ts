import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-movement-by-item',
  imports: [],
  templateUrl: './stock-movement-by-item.html',
  styleUrl: './stock-movement-by-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockMovementByItem {
  readonly title = 'Stock Movement By Item';
  readonly description = 'Functional implementation scaffold for Stock Movement By Item.';
}