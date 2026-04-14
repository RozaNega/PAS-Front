import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StockLedgerApi } from './services/stock-ledger-api';

@Component({
  selector: 'app-stock-ledger',
  imports: [],
  templateUrl: './stock-ledger.html',
  styleUrl: './stock-ledger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockLedger {
  private readonly stockLedgerApi = inject(StockLedgerApi);

  readonly totals = computed(() => {
    const records = this.stockLedgerApi.list();
    return {
      entryCount: records.length,
      receiptCount: records.filter((item) => item.movementType === 'RECEIPT').length,
      issueCount: records.filter((item) => item.movementType === 'ISSUE').length,
    };
  });
}
