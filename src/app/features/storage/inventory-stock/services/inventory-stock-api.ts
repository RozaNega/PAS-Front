import { Injectable, signal } from '@angular/core';

export interface StockRecord {
  id: number;
  sku: string;
  name: string;
  warehouseCode: string;
  shelfCode: string;
  onHand: number;
  reserved: number;
  reorderLevel: number;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryStockApi {
  private readonly stockSignal = signal<StockRecord[]>([
    {
      id: 1,
      sku: 'ITM-1001',
      name: 'Notebook A5',
      warehouseCode: 'WHS-MAIN',
      shelfCode: 'A-01-01',
      onHand: 850,
      reserved: 40,
      reorderLevel: 120,
    },
    {
      id: 2,
      sku: 'ITM-3104',
      name: 'Thermal Label Roll',
      warehouseCode: 'WHS-MAIN',
      shelfCode: 'A-01-02',
      onHand: 320,
      reserved: 80,
      reorderLevel: 140,
    },
    {
      id: 3,
      sku: 'ITM-4420',
      name: 'Cold Gel Pack',
      warehouseCode: 'WHS-COLD',
      shelfCode: 'C-02-01',
      onHand: 460,
      reserved: 110,
      reorderLevel: 200,
    },
  ]);

  list(): StockRecord[] {
    return this.stockSignal();
  }

  getById(id: number): StockRecord | undefined {
    return this.stockSignal().find((item) => item.id === id);
  }

  adjust(id: number, delta: number): StockRecord | undefined {
    return this.updateRecord(id, (item) => ({
      ...item,
      onHand: Math.max(0, item.onHand + delta),
      reserved: Math.min(item.reserved, Math.max(0, item.onHand + delta)),
    }));
  }

  reserve(id: number, quantity: number): StockRecord | undefined {
    return this.updateRecord(id, (item) => {
      const nextReserved = Math.min(item.onHand, item.reserved + Math.max(0, quantity));
      return {
        ...item,
        reserved: nextReserved,
      };
    });
  }

  release(id: number, quantity: number): StockRecord | undefined {
    return this.updateRecord(id, (item) => ({
      ...item,
      reserved: Math.max(0, item.reserved - Math.max(0, quantity)),
    }));
  }

  private updateRecord(
    id: number,
    updater: (record: StockRecord) => StockRecord,
  ): StockRecord | undefined {
    let updated: StockRecord | undefined;
    this.stockSignal.update((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        updated = updater(item);
        return updated;
      }),
    );
    return updated;
  }
}
