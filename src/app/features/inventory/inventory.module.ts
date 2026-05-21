import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { InventoryRoutingModule } from './inventory-routing.module';

// Inventory Components
import { StockOverviewComponent } from './pages/stock-overview/stock-overview.component';
import { StockAdjustmentComponent } from './pages/stock-adjustment/stock-adjustment.component';
import { ShelvesComponent } from './pages/shelves/shelves.component';

// Services
import { InventoryService } from '../../core/services/inventory.service';
import { WarehousesService } from '../../core/services/warehouses.service';
import { ShelvesService } from '../../core/services/shelves.service';

@NgModule({
  declarations: [
    // Components are standalone, so we don't declare them here
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    InventoryRoutingModule,
    
    // Import standalone components
    StockOverviewComponent,
    StockAdjustmentComponent,
    ShelvesComponent
  ],
  providers: [
    InventoryService,
    WarehousesService,
    ShelvesService
  ]
})
export class InventoryModule { }