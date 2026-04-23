import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layouts/main-layout/main-layout.component';
import { Pages } from './pages/pages';
import { Profile } from './profile/profile';
import { Services } from './services/services';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: Pages,
      },
      {
        path: 'services',
        component: Services,
      },
      {
        path: 'profile',
        component: Profile,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
