import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Category } from '../../models/models';
import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryListComponent {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly categories = this.categoryApi.categories;
  protected readonly hasCategories = computed(() => this.categories().length > 0);

  protected removeCategory(category: Category): void {
    this.categoryApi.remove(category.id);
  }
}
