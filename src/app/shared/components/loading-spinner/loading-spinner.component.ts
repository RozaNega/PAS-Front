import { Component, inject } from '@angular/core';
import { LoadingInterceptor } from '../../../core/interceptors/loading.interceptor';

@Component({
  selector: 'app-loading-spinner',
  standalone: false,
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  private readonly loadingInterceptor = inject(LoadingInterceptor);
  loading$ = this.loadingInterceptor.loading$;
}


