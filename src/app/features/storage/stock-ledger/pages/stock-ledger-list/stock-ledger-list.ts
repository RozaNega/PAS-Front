import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Location } from '@angular/common';

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

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}