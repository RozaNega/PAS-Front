import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { InventoryStockApi } from './services/inventory-stock-api';

@Component({
  selector: 'app-inventory-stock',
  imports: [],
  templateUrl: './inventory-stock.html',
  styleUrl: './inventory-stock.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryStock {
  private readonly inventoryStockApi = inject(InventoryStockApi);

  readonly totals = computed(() => {
    const records = this.inventoryStockApi.list();
    const onHand = records.reduce((sum, item) => sum + item.onHand, 0);
    const reserved = records.reduce((sum, item) => sum + item.reserved, 0);
    return {
      skuCount: records.length,
      onHand,
      reserved,
      available: onHand - reserved,
    };
  });
}
