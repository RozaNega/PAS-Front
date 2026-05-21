import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

// Inventory Components
import { StockOverviewComponent } from './pages/stock-overview/stock-overview.component';
import { StockAdjustmentComponent } from './pages/stock-adjustment/stock-adjustment.component';
import { ShelvesComponent } from './pages/shelves/shelves.component';
import { BulkAdjustStockComponent } from './pages/bulk-adjust-stock/bulk-adjust-stock.component';
import { QRCodesComponent } from './pages/qr-codes/qr-codes.component';
import { ItemManagementComponent } from './pages/item-management/item-management.component';

const routes: Routes = [
  // Admin Inventory Routes
  {
    path: 'admin/inventory',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: StockOverviewComponent },
      { path: 'overview', redirectTo: '', pathMatch: 'full' },
      { path: 'add-item', component: ItemManagementComponent },
      { path: 'edit-item/:id', component: ItemManagementComponent },
      { path: 'adjustment', component: StockAdjustmentComponent },
      { path: 'bulk-adjust', component: BulkAdjustStockComponent },
      { path: 'qr-codes', component: QRCodesComponent },
      { path: 'movements', component: StockOverviewComponent }, // TODO: Create StockMovementsComponent
      { path: 'low-stock', component: StockOverviewComponent }, // TODO: Create LowStockComponent
    ]
  },

  // Admin Warehouses Routes
  {
    path: 'admin/warehouses',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: StockOverviewComponent }, // TODO: Create WarehousesComponent
    ]
  },

  // Admin Shelves Routes
  {
    path: 'admin/shelves',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: ShelvesComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule { }