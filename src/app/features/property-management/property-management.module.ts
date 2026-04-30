import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Properties
import { PropertyListComponent } from './properties/pages/property-list/property-list.component';
import { PropertyFormComponent } from './properties/pages/property-form/property-form.component';
import { PropertyDetailComponent } from './properties/pages/property-detail/property-detail.component';
import { PropertyService } from './properties/services/property.service';

// Property Types
import { PropertyTypeListComponent } from './property-types/pages/property-type-list/property-type-list.component';
import { PropertyTypeFormComponent } from './property-types/pages/property-type-form/property-type-form.component';
import { PropertyTypeService } from './property-types/services/property-type.service';

// Property Categories
import { PropertyCategoryListComponent } from './property-categories/pages/property-category-list/property-category-list.component';
import { PropertyCategoryService } from './property-categories/services/property-category.service';

// Locations
import { LocationListComponent } from './locations/pages/location-list/location-list.component';
import { LocationService } from './locations/services/location.service';

// Safety Boxes
import { SafetyBoxListComponent } from './safety-boxes/pages/safety-box-list/safety-box-list.component';
import { SafetyBoxService } from './safety-boxes/services/safety-box.service';

const routes: Routes = [
  { path: 'properties', component: PropertyListComponent },
  { path: 'properties/new', component: PropertyFormComponent },
  { path: 'properties/edit/:id', component: PropertyFormComponent },
  { path: 'properties/:id', component: PropertyDetailComponent },
  { path: 'property-types', component: PropertyTypeListComponent },
  { path: 'property-types/new', component: PropertyTypeFormComponent },
  { path: 'property-types/edit/:id', component: PropertyTypeFormComponent },
  { path: 'property-categories', component: PropertyCategoryListComponent },
  { path: 'locations', component: LocationListComponent },
  { path: 'safety-boxes', component: SafetyBoxListComponent }
];

@NgModule({
  declarations: [
    PropertyDetailComponent,
    PropertyTypeFormComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [
    PropertyService,
    PropertyTypeService,
    PropertyCategoryService,
    LocationService,
    SafetyBoxService
  ]
})
export class PropertyManagementModule {}