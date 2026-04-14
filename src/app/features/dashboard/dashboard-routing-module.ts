import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Pages } from './pages/pages';
import { Services } from './services/services';

const routes: Routes = [
  {
    path: '',
    component: Pages,
  },
  {
    path: 'services',
    component: Services,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
