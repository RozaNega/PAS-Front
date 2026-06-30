import { Injectable, signal } from '@angular/core';

export interface WarehouseRecord {
  id: number;
  code: string;
  name: string;
  address: string;
  capacity: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WarehouseApi {
  private readonly warehousesSignal = signal<WarehouseRecord[]>([]);

  list(): WarehouseRecord[] {
    return this.warehousesSignal();
  }

  getById(id: number): WarehouseRecord | undefined {
    return this.warehousesSignal().find((warehouse) => warehouse.id === id);
  }

  create(payload: Omit<WarehouseRecord, 'id'>): WarehouseRecord {
    const nextId = Math.max(0, ...this.warehousesSignal().map((warehouse) => warehouse.id)) + 1;
    const created: WarehouseRecord = {
      id: nextId,
      ...payload,
    };
    this.warehousesSignal.update((items) => [...items, created]);
    return created;
  }

  update(id: number, changes: Partial<Omit<WarehouseRecord, 'id'>>): WarehouseRecord | undefined {
    let updated: WarehouseRecord | undefined;
    this.warehousesSignal.update((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        updated = {
          ...item,
          ...changes,
        };
        return updated;
      }),
    );
    return updated;
  }
}
