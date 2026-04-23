import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Login } from './pages/login/login';
import { AuthLayoutComponent } from '../../layouts/auth-layout/auth-layout.component';
import { Models } from './models/models';
import { Register } from './pages/register/register';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Services } from './services/services';
import { Welcome } from './pages/welcome/welcome';

const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'welcome',
      },
      {
        path: 'welcome',
        component: Welcome,
        data: { animation: 'welcome' },
      },
      {
        path: 'login',
        component: Login,
        data: { animation: 'login' },
      },
      {
        path: 'register',
        component: Register,
        data: { animation: 'register' },
      },
      {
        path: 'forgot-password',
        component: ForgotPassword,
        data: { animation: 'forgot' },
      },
      {
        path: 'reset-password',
        component: ResetPassword,
        data: { animation: 'reset' },
      },
      {
        path: 'models',
        component: Models,
        data: { animation: 'models' },
      },
      {
        path: 'services',
        component: Services,
        data: { animation: 'services' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
