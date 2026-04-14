import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CatalogRoutingModule } from './catalog-routing-module';

@NgModule({
  declarations: [],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, CatalogRoutingModule],
  exports: [],
})
export class CatalogModule {}
