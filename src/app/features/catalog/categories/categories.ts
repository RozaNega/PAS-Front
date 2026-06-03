import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryApi } from './services/category-api';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  protected readonly categoryApi = inject(CategoryApi);
  private readonly fb = inject(FormBuilder);

  protected readonly searchTerm = signal('');
  protected readonly selectedParentFilter = signal('all');
  protected readonly selectedSort = signal('name');
  protected readonly isLoading = signal(false);
  protected readonly currentView = signal('list');

  protected readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(4)]],
    parentCategoryId: [''],
  });

  protected readonly categories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const parentFilter = this.selectedParentFilter();
    const sort = this.selectedSort();

    const filtered = this.categoryApi.categories().filter((category) => {
      const matchesSearch =
        !term ||
        (category.name ?? '').toLowerCase().includes(term) ||
        (category.description ?? '').toLowerCase().includes(term) ||
        (category.parentCategoryName?.toLowerCase().includes(term) ?? false);
      const matchesParent =
        parentFilter === 'all' ||
        (parentFilter === 'root' ? category.parentCategoryId == null : String(category.parentCategoryId ?? '') === parentFilter);

      return matchesSearch && matchesParent;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'items') {
        return (b.itemsCount ?? 0) - (a.itemsCount ?? 0);
      }

      if (sort === 'children') {
        return (b.subCategoriesCount ?? 0) - (a.subCategoriesCount ?? 0);
      }

      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  });

  protected readonly quickStats = computed(() => {
    const categories = this.categories();
    const totalItems = categories.reduce((sum, category) => sum + (category.itemsCount ?? 0), 0);
    const childCount = categories.reduce((sum, category) => sum + (category.subCategoriesCount ?? 0), 0);
    const deepest = categories.find((category) => category.parentCategoryId !== null) ?? categories[0];

    return [
      { label: 'Total Categories', value: categories.length },
      { label: 'Mapped Items', value: totalItems },
      { label: 'Subcategories', value: childCount },
      { label: 'Latest Node', value: deepest?.name ?? 'N/A' },
    ];
  });

  protected readonly parentFilters = computed(() => [
    { label: 'All Parents', value: 'all' },
    { label: 'Root Categories', value: 'root' },
    ...this.categoryApi.categories().map((category) => ({ label: category.name, value: category.id })),
  ]);

  protected setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  protected setParentFilter(value: string): void {
    this.selectedParentFilter.set(value);
  }

  protected setSort(value: string): void {
    this.selectedSort.set(value);
  }

  protected setView(view: string): void {
    this.currentView.set(view);
  }

  protected openCreatePanel(): void {
    this.currentView.set('create');
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid) return;

    this.isLoading.set(true);
    const payload = this.categoryForm.getRawValue();
    this.categoryApi.create(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.categoryForm.reset();
          this.currentView.set('list');
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  protected removeCategory(id: number): void {
    if (confirm('Delete this category?')) {
      this.categoryApi.remove(id);
    }
  }
}
