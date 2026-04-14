import { Injectable, computed, signal } from '@angular/core';

import { CreateItemRequest, ItemRecord, UpdateItemRequest } from '../models/models';

@Injectable({
  providedIn: 'root',
})
export class ItemMasterApi {
  private readonly itemsSignal = signal<ItemRecord[]>([
    {
      id: 'itm-rice',
      sku: 'FD-1001',
      name: 'Basmati Rice 5kg',
      categoryId: 'cat-food',
      categoryName: 'Food Staples',
      unitOfMeasure: 'Bag',
      price: 12.5,
      stockOnHand: 124,
      status: 'active',
      createdAt: new Date('2026-01-10T09:00:00.000Z'),
      updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    },
    {
      id: 'itm-water',
      sku: 'BV-2204',
      name: 'Sparkling Water 500ml',
      categoryId: 'cat-bev',
      categoryName: 'Beverages',
      unitOfMeasure: 'Bottle',
      price: 1.15,
      stockOnHand: 412,
      status: 'active',
      createdAt: new Date('2026-01-22T14:00:00.000Z'),
      updatedAt: new Date('2026-03-02T11:45:00.000Z'),
    },
    {
      id: 'itm-oats',
      sku: 'FD-3310',
      name: 'Rolled Oats 1kg',
      categoryId: 'cat-grains',
      categoryName: 'Grains',
      unitOfMeasure: 'Pack',
      price: 3.75,
      stockOnHand: 68,
      status: 'draft',
      createdAt: new Date('2026-02-15T12:15:00.000Z'),
      updatedAt: new Date('2026-03-05T08:30:00.000Z'),
    },
  ]);

  readonly items = computed(() =>
    [...this.itemsSignal()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly activeItemCount = computed(
    () => this.items().filter((item) => item.status === 'active').length,
  );

  readonly totalStock = computed(() =>
    this.items().reduce((sum, item) => sum + item.stockOnHand, 0),
  );

  getById(id: string): ItemRecord | undefined {
    return this.items().find((item) => item.id === id);
  }

  create(payload: CreateItemRequest): ItemRecord {
    const created: ItemRecord = {
      ...payload,
      id: this.generateId(),
      sku: payload.sku.trim().toUpperCase(),
      name: payload.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.itemsSignal.update((items) => [...items, created]);
    return created;
  }

  update(payload: UpdateItemRequest): ItemRecord | undefined {
    let updatedItem: ItemRecord | undefined;

    this.itemsSignal.update((items) =>
      items.map((item) => {
        if (item.id !== payload.id) {
          return item;
        }

        updatedItem = {
          ...item,
          ...payload,
          sku: payload.sku.trim().toUpperCase(),
          name: payload.name.trim(),
          updatedAt: new Date(),
        };

        return updatedItem;
      }),
    );

    return updatedItem;
  }

  remove(id: string): void {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  private generateId(): string {
    return `itm-${Math.random().toString(36).slice(2, 10)}`;
  }
}
