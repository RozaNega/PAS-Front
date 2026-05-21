import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CategoryDto } from '../../../../../core/services/categories.service';
import { CategoryApi } from '../../services/category-api';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryListComponent {
  private readonly categoryApi = inject(CategoryApi);

  protected readonly categories = this.categoryApi.categories;
  protected readonly hasCategories = computed(() => this.categories().length > 0);

  protected removeCategory(category: CategoryDto): void {
    this.categoryApi.remove(category.id);
  }
}
