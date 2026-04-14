import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CategoryApi } from './category-api';

@Component({
  selector: 'app-services',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly totalCategories = this.categoryApi.totalCategoryCount;
  protected readonly totalItems = this.categoryApi.totalItemCount;
  protected readonly rootCategories = this.categoryApi.rootCategories;
}
