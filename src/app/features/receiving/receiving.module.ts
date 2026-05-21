import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Suppliers
import { SupplierListComponent } from './suppliers/pages/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './suppliers/pages/supplier-form/supplier-form.component';
import { SupplierService } from './suppliers/services/supplier.service';

// Inspections
import { InspectionListComponent } from './inspections/pages/inspection-list/inspection-list.component';
import { InspectionFormComponent } from './inspections/pages/inspection-form/inspection-form.component';
import { InspectionService } from './inspections/services/inspection.service';

// Receiving Notes
import { ReceivingNoteListComponent } from './receiving-notes/pages/receiving-note-list/receiving-note-list.component';
import { ReceivingNoteFormComponent } from './receiving-notes/pages/receiving-note-form/receiving-note-form.component';
import { ReceivingNoteDetailComponent } from './receiving-notes/pages/receiving-note-detail/receiving-note-detail.component';
import { ReceivingNoteService } from './receiving-notes/services/receiving-note.service';

const routes: Routes = [
  // Suppliers
  { path: 'suppliers', component: SupplierListComponent },
  { path: 'suppliers/new', component: SupplierFormComponent },
  { path: 'suppliers/edit/:id', component: SupplierFormComponent },
  
  // Inspections
  { path: 'inspections', component: InspectionListComponent },
  { path: 'inspections/new', component: InspectionFormComponent },
  { path: 'inspections/edit/:id', component: InspectionFormComponent },
  { path: 'inspections/:id', component: InspectionFormComponent },
  
  // Receiving Notes
  { path: 'receiving-notes', component: ReceivingNoteListComponent },
  { path: 'receiving-notes/new', component: ReceivingNoteFormComponent },
  { path: 'receiving-notes/edit/:id', component: ReceivingNoteFormComponent },
  { path: 'receiving-notes/:id', component: ReceivingNoteDetailComponent }
];

@NgModule({
  declarations: [
    InspectionListComponent,
    InspectionFormComponent,
    ReceivingNoteListComponent,
    ReceivingNoteFormComponent,
    ReceivingNoteDetailComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes), SupplierListComponent, SupplierFormComponent],
  providers: [SupplierService, InspectionService, ReceivingNoteService]
})
export class ReceivingModule {}