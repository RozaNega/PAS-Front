import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-detail.html',
  styleUrl: './category-detail.css',
})
export class CategoryDetail {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly categories = this.categoryApi.categories;
  protected readonly selectedId = signal('');
  protected readonly detail = computed(() =>
    this.selectedId() ? this.categoryApi.getDetailById(this.selectedId()) : undefined,
  );

  constructor() {
    effect(() => {
      const categories = this.categories();
      if (categories.length > 0 && !this.selectedId()) {
        this.selectedId.set(String(categories[0].id));
      }
    });
  }

  protected selectCategory(id: string): void {
    this.selectedId.set(id);
  }
}
