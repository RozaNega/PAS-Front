import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CategoryCreate } from './pages/category-create/category-create';
import { CategoryDetail } from './pages/category-detail/category-detail';
import { CategoryEdit } from './pages/category-edit/category-edit';
import { CategoryTree as CategoryTreeComponent } from './components/category-tree/category-tree';
import { CategoryApi } from './services/category-api';

@Component({
  selector: 'app-categories',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryApi = inject(CategoryApi);

  protected readonly currentView = signal<'list' | 'tree' | 'create' | 'edit' | 'detail'>('list');
  protected readonly searchTerm = signal('');
  protected readonly selectedParentFilter = signal('all');
  protected readonly selectedSort = signal<'name' | 'items' | 'children'>('name');
  protected readonly activePreset = signal<'priority' | 'structure' | 'inventory'>('structure');
  protected readonly showCreatePanel = signal(false);
  protected readonly createTone = signal<'neutral' | 'success' | 'error'>('neutral');
  protected readonly createMessage = signal('Create and organize catalog categories in the new workspace.');
  protected readonly totalCategories = this.categoryApi.totalCategoryCount;
  protected readonly totalItems = this.categoryApi.totalItemCount;
  protected readonly rootCategoryCount = computed(() => this.categoryApi.rootCategories().length);

  protected readonly categoryForm = this.formBuilder.nonNullable.group({
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
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term) ||
        (category.parentCategoryName?.toLowerCase().includes(term) ?? false);
      const matchesParent =
        parentFilter === 'all' ||
        (parentFilter === 'root' ? category.parentCategoryId === null : category.parentCategoryId === parentFilter);

      return matchesSearch && matchesParent;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'items') {
        return b.itemsCount - a.itemsCount;
      }

      if (sort === 'children') {
        return b.subCategoriesCount - a.subCategoriesCount;
      }

      return a.name.localeCompare(b.name);
    });
  });

  protected readonly quickStats = computed(() => {
    const categories = this.categories();
    const totalItems = categories.reduce((sum, category) => sum + category.itemsCount, 0);
    const childCount = categories.reduce((sum, category) => sum + category.subCategoriesCount, 0);
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

  protected setView(view: 'list' | 'tree' | 'create' | 'edit' | 'detail'): void {
    this.currentView.set(view);
  }

  protected openCreatePanel(): void {
    this.currentView.set('create');
    this.showCreatePanel.set(true);
    this.createTone.set('neutral');
    this.createMessage.set('Fill out the category details to add a new catalog node.');
  }

  protected closeCreatePanel(): void {
    this.showCreatePanel.set(false);
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.createTone.set('error');
      this.createMessage.set('Please complete the required category fields before saving.');
      return;
    }

    const value = this.categoryForm.getRawValue();
    const created = this.categoryApi.create({
      name: value.name,
      description: value.description,
      parentCategoryId: value.parentCategoryId || null,
    });

    this.createTone.set('success');
    this.createMessage.set(`Category ${created.name} was created successfully.`);
    this.categoryForm.reset({
      name: '',
      description: '',
      parentCategoryId: '',
    });
    this.showCreatePanel.set(false);
    this.currentView.set('list');
  }

  protected setParentFilter(value: string): void {
    this.selectedParentFilter.set(value);
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected setSort(value: 'name' | 'items' | 'children'): void {
    this.selectedSort.set(value);
  }

  protected activatePreset(preset: 'priority' | 'structure' | 'inventory'): void {
    this.activePreset.set(preset);

    if (preset === 'priority') {
      this.currentView.set('list');
      this.selectedSort.set('items');
      this.selectedParentFilter.set('all');
      return;
    }

    if (preset === 'structure') {
      this.currentView.set('tree');
      this.selectedSort.set('children');
      this.selectedParentFilter.set('all');
      return;
    }

    this.currentView.set('list');
    this.selectedSort.set('name');
    this.selectedParentFilter.set('root');
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.selectedParentFilter.set('all');
    this.selectedSort.set('name');
    this.activePreset.set('structure');
  }

  protected trackByCategory(_: number, category: { id: string }): string {
    return category.id;
  }
}
