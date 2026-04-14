import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryStock } from './inventory-stock/inventory-stock';
import { StockAdjust } from './inventory-stock/pages/stock-adjust/stock-adjust';
import { StockDetail } from './inventory-stock/pages/stock-detail/stock-detail';
import { StockList } from './inventory-stock/pages/stock-list/stock-list';
import { StockRelease } from './inventory-stock/pages/stock-release/stock-release';
import { StockReserve } from './inventory-stock/pages/stock-reserve/stock-reserve';
import { ShelfLocations } from './shelf-locations/shelf-locations';
import { ShelfLocationCreate } from './shelf-locations/pages/shelf-location-create/shelf-location-create';
import { ShelfLocationDetail } from './shelf-locations/pages/shelf-location-detail/shelf-location-detail';
import { ShelfLocationEdit } from './shelf-locations/pages/shelf-location-edit/shelf-location-edit';
import { ShelfLocationList } from './shelf-locations/pages/shelf-location-list/shelf-location-list';
import { StockLedger } from './stock-ledger/stock-ledger';
import { StockLedgerList } from './stock-ledger/pages/stock-ledger-list/stock-ledger-list';
import { StockMovementByDate } from './stock-ledger/pages/stock-movement-by-date/stock-movement-by-date';
import { StockMovementByItem } from './stock-ledger/pages/stock-movement-by-item/stock-movement-by-item';
import { Warehouses } from './warehouses/warehouses';
import { WarehouseCreate } from './warehouses/pages/warehouse-create/warehouse-create';
import { WarehouseDetail } from './warehouses/pages/warehouse-detail/warehouse-detail';
import { WarehouseEdit } from './warehouses/pages/warehouse-edit/warehouse-edit';
import { WarehouseList } from './warehouses/pages/warehouse-list/warehouse-list';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'warehouses',
  },
  {
    path: 'warehouses',
    component: Warehouses,
  },
  {
    path: 'warehouses/list',
    component: WarehouseList,
  },
  {
    path: 'warehouses/create',
    component: WarehouseCreate,
  },
  {
    path: 'warehouses/:id',
    component: WarehouseDetail,
  },
  {
    path: 'warehouses/:id/edit',
    component: WarehouseEdit,
  },
  {
    path: 'shelf-locations',
    component: ShelfLocations,
  },
  {
    path: 'shelf-locations/list',
    component: ShelfLocationList,
  },
  {
    path: 'shelf-locations/create',
    component: ShelfLocationCreate,
  },
  {
    path: 'shelf-locations/:id',
    component: ShelfLocationDetail,
  },
  {
    path: 'shelf-locations/:id/edit',
    component: ShelfLocationEdit,
  },
  {
    path: 'inventory-stock',
    component: InventoryStock,
  },
  {
    path: 'inventory-stock/list',
    component: StockList,
  },
  {
    path: 'inventory-stock/:id',
    component: StockDetail,
  },
  {
    path: 'inventory-stock/:id/adjust',
    component: StockAdjust,
  },
  {
    path: 'inventory-stock/:id/reserve',
    component: StockReserve,
  },
  {
    path: 'inventory-stock/:id/release',
    component: StockRelease,
  },
  {
    path: 'stock-ledger',
    component: StockLedger,
  },
  {
    path: 'stock-ledger/list',
    component: StockLedgerList,
  },
  {
    path: 'stock-ledger/by-date',
    component: StockMovementByDate,
  },
  {
    path: 'stock-ledger/by-item',
    component: StockMovementByItem,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StorageRoutingModule {}
