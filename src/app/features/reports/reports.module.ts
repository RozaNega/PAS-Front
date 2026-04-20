import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { InventoryReportComponent } from './inventory/inventory-report.component';
import { DisposalReportComponent } from './disposal/disposal-report.component';
import { StockMovementReportComponent } from './stock-movement/stock-movement-report.component';
import { RequisitionReportComponent } from './requisition/requisition-report.component';
import { PropertyReportComponent } from './property/property-report.component';
import { ReportService } from './services/report.service';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inventory' },
  { path: 'inventory', component: InventoryReportComponent },
  { path: 'disposal', component: DisposalReportComponent },
  { path: 'stock-movement', component: StockMovementReportComponent },
  { path: 'requisition', component: RequisitionReportComponent },
  { path: 'property', component: PropertyReportComponent }
];

@NgModule({
  declarations: [
    InventoryReportComponent,
    DisposalReportComponent,
    StockMovementReportComponent,
    RequisitionReportComponent,
    PropertyReportComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [ReportService]
})
export class ReportsModule {}