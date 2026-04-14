import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-stock-ledger-list',
  imports: [],
  templateUrl: './stock-ledger-list.html',
  styleUrl: './stock-ledger-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockLedgerList {
  readonly title = 'Stock Ledger List';
  readonly description = 'Functional implementation scaffold for Stock Ledger List.';
}