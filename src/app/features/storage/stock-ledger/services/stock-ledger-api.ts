import { Injectable, signal } from '@angular/core';

export type StockMovementType = 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'TRANSFER';

export interface StockLedgerRecord {
  id: number;
  sku: string;
  movementType: StockMovementType;
  quantity: number;
  warehouseCode: string;
  reference: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class StockLedgerApi {
  private readonly ledgerSignal = signal<StockLedgerRecord[]>([
    {
      id: 1,
      sku: 'ITM-1001',
      movementType: 'RECEIPT',
      quantity: 300,
      warehouseCode: 'WHS-MAIN',
      reference: 'PO-10021',
      createdAt: '2026-03-18T09:15:00.000Z',
    },
    {
      id: 2,
      sku: 'ITM-3104',
      movementType: 'ISSUE',
      quantity: 40,
      warehouseCode: 'WHS-MAIN',
      reference: 'SO-42001',
      createdAt: '2026-03-19T13:32:00.000Z',
    },
    {
      id: 3,
      sku: 'ITM-4420',
      movementType: 'ADJUSTMENT',
      quantity: -12,
      warehouseCode: 'WHS-COLD',
      reference: 'ADJ-3308',
      createdAt: '2026-03-20T07:05:00.000Z',
    },
  ]);

  list(): StockLedgerRecord[] {
    return this.ledgerSignal();
  }

  listBySku(sku: string): StockLedgerRecord[] {
    return this.ledgerSignal().filter((entry) => entry.sku === sku);
  }

  add(payload: Omit<StockLedgerRecord, 'id' | 'createdAt'>): StockLedgerRecord {
    const nextId = Math.max(0, ...this.ledgerSignal().map((entry) => entry.id)) + 1;
    const created: StockLedgerRecord = {
      id: nextId,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    this.ledgerSignal.update((entries) => [created, ...entries]);
    return created;
  }
}
