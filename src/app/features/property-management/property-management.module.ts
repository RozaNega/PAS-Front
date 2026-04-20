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
import { PropertyCategoryFormComponent } from './property-categories/pages/property-category-form/property-category-form.component';
import { PropertyCategoryService } from './property-categories/services/property-category.service';

// Locations
import { LocationListComponent } from './locations/pages/location-list/location-list.component';
import { LocationFormComponent } from './locations/pages/location-form/location-form.component';
import { LocationService } from './locations/services/location.service';

// Safety Boxes
import { SafetyBoxListComponent } from './safety-boxes/pages/safety-box-list/safety-box-list.component';
import { SafetyBoxFormComponent } from './safety-boxes/pages/safety-box-form/safety-box-form.component';
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
  { path: 'property-categories/new', component: PropertyCategoryFormComponent },
  { path: 'property-categories/edit/:id', component: PropertyCategoryFormComponent },
  { path: 'locations', component: LocationListComponent },
  { path: 'locations/new', component: LocationFormComponent },
  { path: 'locations/edit/:id', component: LocationFormComponent },
  { path: 'safety-boxes', component: SafetyBoxListComponent },
  { path: 'safety-boxes/new', component: SafetyBoxFormComponent },
  { path: 'safety-boxes/edit/:id', component: SafetyBoxFormComponent }
];

@NgModule({
  declarations: [
    PropertyListComponent,
    PropertyFormComponent,
    PropertyDetailComponent,
    PropertyTypeListComponent,
    PropertyTypeFormComponent,
    PropertyCategoryListComponent,
    PropertyCategoryFormComponent,
    LocationListComponent,
    LocationFormComponent,
    SafetyBoxListComponent,
    SafetyBoxFormComponent
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