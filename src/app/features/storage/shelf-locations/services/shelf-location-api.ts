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
  private readonly shelfLocationsSignal = signal<ShelfLocationRecord[]>([
    {
      id: 1,
      warehouseCode: 'WHS-MAIN',
      code: 'A-01-01',
      zone: 'A1',
      maxUnits: 220,
      active: true,
    },
    {
      id: 2,
      warehouseCode: 'WHS-MAIN',
      code: 'A-01-02',
      zone: 'A1',
      maxUnits: 220,
      active: true,
    },
    {
      id: 3,
      warehouseCode: 'WHS-COLD',
      code: 'C-02-01',
      zone: 'C2',
      maxUnits: 110,
      active: true,
    },
  ]);

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
