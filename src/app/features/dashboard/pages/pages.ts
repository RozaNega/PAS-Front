import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InventoryStockApi } from '../../storage/inventory-stock/services/inventory-stock-api';
import { ShelfLocationApi } from '../../storage/shelf-locations/services/shelf-location-api';
import { StockLedgerApi } from '../../storage/stock-ledger/services/stock-ledger-api';
import { WarehouseApi } from '../../storage/warehouses/services/warehouse-api';

@Component({
  selector: 'app-pages',
  imports: [RouterLink],
  templateUrl: './pages.html',
  styleUrl: './pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pages {
  private readonly warehouseApi = inject(WarehouseApi);
  private readonly shelfLocationApi = inject(ShelfLocationApi);
  private readonly inventoryStockApi = inject(InventoryStockApi);
  private readonly stockLedgerApi = inject(StockLedgerApi);

  readonly kpis = computed(() => {
    const stock = this.inventoryStockApi.list();
    const onHand = stock.reduce((sum, item) => sum + item.onHand, 0);
    const reserved = stock.reduce((sum, item) => sum + item.reserved, 0);
    const available = onHand - reserved;
    return [
      {
        label: 'Warehouses',
        value: this.warehouseApi.list().length,
        route: '/storage/warehouses',
      },
      {
        label: 'Shelf Locations',
        value: this.shelfLocationApi.list().length,
        route: '/storage/shelf-locations',
      },
      {
        label: 'Available Units',
        value: available,
        route: '/storage/inventory-stock',
      },
      {
        label: 'Ledger Entries',
        value: this.stockLedgerApi.list().length,
        route: '/storage/stock-ledger',
      },
    ];
  });
}
