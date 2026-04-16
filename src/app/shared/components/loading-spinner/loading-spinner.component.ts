import { Component } from '@angular/core';
import { LoadingInterceptor } from '../../../core/interceptors/loading.interceptor';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
})
export class LoadingSpinnerComponent {
  loading$ = this.loadingInterceptor.loading$;

  constructor(private loadingInterceptor: LoadingInterceptor) {}
}
