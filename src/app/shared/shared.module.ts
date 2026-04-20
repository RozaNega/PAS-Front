import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

import { HasPermissionDirective } from './directives/has-permission.directive';
import { HasRoleDirective } from './directives/has-role.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';

import { DateFormatPipe } from './pipes/date-format.pipe';
import { CurrencyFormatPipe } from './pipes/currency-format.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';

@NgModule({
 feature/full-frontend-update
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,

  declarations: [
 main
    LoadingSpinnerComponent,
    ConfirmationModalComponent,
    DataTableComponent,
    NotificationToastComponent,
    HasPermissionDirective,
    HasRoleDirective,
    ClickOutsideDirective,
    DateFormatPipe,
    CurrencyFormatPipe,
    TruncatePipe,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingSpinnerComponent,
    ConfirmationModalComponent,
    DataTableComponent,
    NotificationToastComponent,
    HasPermissionDirective,
    HasRoleDirective,
    ClickOutsideDirective,
    DateFormatPipe,
    CurrencyFormatPipe,
    TruncatePipe,
  ],
})
export class SharedModule {}
