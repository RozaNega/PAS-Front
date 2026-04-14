import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-ledger-filter',
  imports: [],
  templateUrl: './stock-ledger-filter.html',
  styleUrl: './stock-ledger-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockLedgerFilter {
  readonly title = 'Stock Ledger Filter';
  readonly description = 'Functional implementation scaffold for Stock Ledger Filter.';
}