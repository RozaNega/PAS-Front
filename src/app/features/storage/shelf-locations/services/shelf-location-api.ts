import { Injectable, signal } from '@angular/core';

export interface ShelfLocationRecord {
  id: number;
  warehouseCode: string;
  code: string;
  zone: string;
  maxUnits: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShelfLocationApi {
  private readonly shelfLocationsSignal = signal<ShelfLocationRecord[]>([]);

  list(): ShelfLocationRecord[] {
    return this.shelfLocationsSignal();
  }

  getById(id: number): ShelfLocationRecord | undefined {
    return this.shelfLocationsSignal().find((location) => location.id === id);
  }

  byWarehouse(warehouseCode: string): ShelfLocationRecord[] {
    return this.shelfLocationsSignal().filter(
      (location) => location.warehouseCode === warehouseCode,
    );
  }

  create(payload: Omit<ShelfLocationRecord, 'id'>): ShelfLocationRecord {
    const nextId = Math.max(0, ...this.shelfLocationsSignal().map((location) => location.id)) + 1;
    const created: ShelfLocationRecord = {
      id: nextId,
      ...payload,
    };
    this.shelfLocationsSignal.update((items) => [...items, created]);
    return created;
  }

  update(
    id: number,
    changes: Partial<Omit<ShelfLocationRecord, 'id'>>,
  ): ShelfLocationRecord | undefined {
    let updated: ShelfLocationRecord | undefined;
    this.shelfLocationsSignal.update((items) =>
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
