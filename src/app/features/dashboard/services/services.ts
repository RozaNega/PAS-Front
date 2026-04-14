import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-services',
  imports: [RouterLink],
  templateUrl: './services.html',
  styleUrl: './services.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Services {
  readonly docs = [
    'WarehouseApi: list, getById, create, update',
    'ShelfLocationApi: list, byWarehouse, create, update',
    'InventoryStockApi: list, adjust, reserve, release',
    'StockLedgerApi: list, add, listBySku',
  ];
}
