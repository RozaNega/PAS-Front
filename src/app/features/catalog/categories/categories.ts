import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CategoryCreate } from './pages/category-create/category-create';
import { CategoryDetail } from './pages/category-detail/category-detail';
import { CategoryEdit } from './pages/category-edit/category-edit';
import { CategoryListComponent } from './pages/category-list/category-list';
import { CategoryTree as CategoryTreeComponent } from './components/category-tree/category-tree';
import { CategoryApi } from './services/category-api';

@Component({
  selector: 'app-categories',
  imports: [
    RouterLink,
    CategoryListComponent,
    CategoryCreate,
    CategoryEdit,
    CategoryDetail,
    CategoryTreeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly currentView = signal<'list' | 'tree' | 'create' | 'edit' | 'detail'>('list');
  protected readonly totalCategories = this.categoryApi.totalCategoryCount;
  protected readonly totalItems = this.categoryApi.totalItemCount;
  protected readonly rootCategoryCount = computed(() => this.categoryApi.rootCategories().length);

  protected setView(view: 'list' | 'tree' | 'create' | 'edit' | 'detail'): void {
    this.currentView.set(view);
  }
}
