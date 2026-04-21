import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

import { HasPermissionDirective } from './directives/has-permission.directive';
import { HasRoleDirective } from './directives/has-role.directive';
import { ClickOutsideDirective } from './directives/click-outside.directive';

import { DateFormatPipe, DateTimeFormatPipe, TimeAgoPipe } from './pipes/date-format.pipe';
import { CurrencyFormatPipe, NumberFormatPipe, PercentageFormatPipe } from './pipes/currency-format.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgxPaginationModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    DateTimeFormatPipe,
    TimeAgoPipe,
    NumberFormatPipe,
    PercentageFormatPipe,
  ],
  declarations: [
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
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgxPaginationModule,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    LoadingSpinnerComponent,
    ConfirmationModalComponent,
    DataTableComponent,
    NotificationToastComponent,
    HasPermissionDirective,
    HasRoleDirective,
    ClickOutsideDirective,
    DateFormatPipe,
    DateTimeFormatPipe,
    TimeAgoPipe,
    CurrencyFormatPipe,
    NumberFormatPipe,
    PercentageFormatPipe,
    TruncatePipe,
  ],
})
export class SharedModule {}
