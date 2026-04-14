import { TestBed } from '@angular/core/testing';

import { InventoryStockApi } from './inventory-stock-api';

describe('InventoryStockApi', () => {
  let service: InventoryStockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventoryStockApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
