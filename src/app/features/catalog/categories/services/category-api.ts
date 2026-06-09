import { Injectable, computed, inject, signal } from '@angular/core';
import { CategoriesService, CategoryDto } from '../../../../core/services/categories.service';
import { finalize, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryApi {
  private readonly categoryService = inject(CategoriesService);
  
  private readonly categoriesSignal = signal<CategoryDto[]>([]);
  private readonly loadingSignal = signal(false);

  readonly categories = computed(() => this.categoriesSignal());
  readonly isLoading = computed(() => this.loadingSignal());

  readonly categoryTree = computed(() => {
    const all = this.categories();
    const map = new Map<string, any>();
    
    // Create nodes
    all.forEach(c => {
      map.set(String(c.id), { id: c.id, name: c.name, description: c.description || '', children: [] });
    });
    
    const roots: any[] = [];
    all.forEach(c => {
      const node = map.get(String(c.id))!;
      if (c.parentCategoryId && map.has(String(c.parentCategoryId))) {
        const parent = map.get(String(c.parentCategoryId));
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  });

  readonly rootCategories = computed(() =>
    this.categories().filter((category) => !category.parentCategoryId),
  );

  readonly totalCategoryCount = computed(() => this.categories().length);

  readonly totalItemCount = computed(() =>
    this.categories().reduce((sum, category) => sum + (category.itemsCount || 0), 0),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loadingSignal.set(true);
    this.categoryService.getAll().pipe(
      finalize(() => this.loadingSignal.set(false))
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categoriesSignal.set(res.data as any);
        }
      }
    });
  }

  create(payload: { name: string; description: string; parentCategoryId: string | null }) {
    return this.categoryService.createCategory(payload as any).pipe(
      tap((res) => {
        if (res.success) this.refresh();
      })
    );
  }

  update(payload: { id: string; name: string; description: string; parentCategoryId: string | null }) {
    return this.categoryService.update(payload.id as any, payload as any).pipe(
      tap((res) => {
        if (res.success) this.refresh();
      })
    );
  }

  remove(id: number | string): void {
    this.categoryService.delete(id).subscribe({
      next: (res) => {
        if (res.success) this.refresh();
      }
    });
  }

  getById(id: string): CategoryDto | undefined {
    return this.categories().find((category) => String(category.id) === id);
  }

  getDetailById(id: string): any {
    const category = this.getById(id);
    if (!category) return undefined;
    return {
      ...category,
      subCategories: this.categories().filter(c => String(c.parentCategoryId ?? '') === id),
      items: []
    };
  }
}
