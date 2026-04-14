import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'categories',
    loadComponent: () => import('./categories/categories').then((m) => m.Categories),
  },
  {
    path: 'items',
    loadComponent: () => import('./item-master/item-master').then((m) => m.ItemMaster),
  },
  {
    path: '',
    redirectTo: 'categories',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogRoutingModule {}
