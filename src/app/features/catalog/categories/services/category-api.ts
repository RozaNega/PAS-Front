import { Injectable, computed, signal } from '@angular/core';

import {
  Category,
  CategoryDetail,
  CategoryItem,
  CategoryTree,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class CategoryApi {
  private readonly itemsByCategory = new Map<string, CategoryItem[]>([
    [
      'cat-food',
      [
        {
          id: 'itm-001',
          sku: 'FD-1001',
          itemName: 'Basmati Rice 5kg',
          unitOfMeasure: 'Bag',
          currentStock: 124,
        },
      ],
    ],
    [
      'cat-bev',
      [
        {
          id: 'itm-002',
          sku: 'BV-2204',
          itemName: 'Sparkling Water 500ml',
          unitOfMeasure: 'Bottle',
          currentStock: 412,
        },
      ],
    ],
  ]);

  private readonly categoriesSignal = signal<Category[]>([
    {
      id: 'cat-food',
      name: 'Food Staples',
      description: 'Core pantry items and dry groceries.',
      parentCategoryId: null,
      subCategoriesCount: 1,
      itemsCount: 1,
      createdAt: new Date('2026-01-08T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T15:00:00.000Z'),
    },
    {
      id: 'cat-grains',
      name: 'Grains',
      description: 'Rice, wheat, and cereal products.',
      parentCategoryId: 'cat-food',
      parentCategoryName: 'Food Staples',
      subCategoriesCount: 0,
      itemsCount: 0,
      createdAt: new Date('2026-01-15T08:30:00.000Z'),
      updatedAt: new Date('2026-03-02T11:00:00.000Z'),
    },
    {
      id: 'cat-bev',
      name: 'Beverages',
      description: 'Water, juices, soda, and packaged drinks.',
      parentCategoryId: null,
      subCategoriesCount: 0,
      itemsCount: 1,
      createdAt: new Date('2026-02-01T09:20:00.000Z'),
      updatedAt: new Date('2026-03-04T12:15:00.000Z'),
    },
  ]);

  readonly categories = computed(() =>
    [...this.categoriesSignal()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly rootCategories = computed(() =>
    this.categories().filter((category) => category.parentCategoryId === null),
  );

  readonly totalCategoryCount = computed(() => this.categories().length);

  readonly totalItemCount = computed(() =>
    this.categories().reduce((sum, category) => sum + category.itemsCount, 0),
  );

  readonly categoryTree = computed(() => this.buildCategoryTree(this.categories()));

  getById(id: string): Category | undefined {
    return this.categories().find((category) => category.id === id);
  }

  getDetailById(id: string): CategoryDetail | undefined {
    const target = this.getById(id);

    if (!target) {
      return undefined;
    }

    const subCategories = this.categories().filter((entry) => entry.parentCategoryId === id);
    const items = this.itemsByCategory.get(id) ?? [];

    return {
      ...target,
      subCategories,
      items,
    };
  }

  create(payload: CreateCategoryRequest): Category {
    const parent = payload.parentCategoryId ? this.getById(payload.parentCategoryId) : undefined;

    const created: Category = {
      id: this.generateId(),
      name: payload.name.trim(),
      description: payload.description.trim(),
      parentCategoryId: payload.parentCategoryId ?? null,
      parentCategoryName: parent?.name,
      subCategoriesCount: 0,
      itemsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.categoriesSignal.update((categories) => this.recalculateCounts([...categories, created]));
    return created;
  }

  update(payload: UpdateCategoryRequest): Category | undefined {
    let updatedCategory: Category | undefined;

    this.categoriesSignal.update((categories) => {
      const parent = payload.parentCategoryId ? this.getById(payload.parentCategoryId) : undefined;

      const updated = categories.map((category) => {
        if (category.id !== payload.id) {
          return category;
        }

        updatedCategory = {
          ...category,
          name: payload.name.trim(),
          description: payload.description.trim(),
          parentCategoryId: payload.parentCategoryId ?? null,
          parentCategoryName: parent?.name,
          updatedAt: new Date(),
        };

        return updatedCategory;
      });

      return this.recalculateCounts(updated);
    });

    return updatedCategory;
  }

  remove(id: string): void {
    this.categoriesSignal.update((categories) => {
      const children = new Set(
        categories
          .filter((category) => category.parentCategoryId === id)
          .map((category) => category.id),
      );

      const remaining = categories.filter(
        (category) => category.id !== id && !children.has(category.id),
      );

      return this.recalculateCounts(remaining);
    });
    this.itemsByCategory.delete(id);
  }

  private recalculateCounts(categories: Category[]): Category[] {
    return categories.map((category) => {
      const subCategoriesCount = categories.filter(
        (entry) => entry.parentCategoryId === category.id,
      ).length;

      return {
        ...category,
        subCategoriesCount,
        itemsCount: this.itemsByCategory.get(category.id)?.length ?? category.itemsCount,
      };
    });
  }

  private buildCategoryTree(categories: Category[]): CategoryTree[] {
    const byParent = new Map<string | null, Category[]>();

    for (const category of categories) {
      const key = category.parentCategoryId ?? null;
      const current = byParent.get(key) ?? [];
      byParent.set(key, [...current, category]);
    }

    const buildBranch = (parentId: string | null): CategoryTree[] =>
      (byParent.get(parentId) ?? [])
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          children: buildBranch(category.id),
        }));

    return buildBranch(null);
  }

  private generateId(): string {
    return `cat-${Math.random().toString(36).slice(2, 10)}`;
  }
}
