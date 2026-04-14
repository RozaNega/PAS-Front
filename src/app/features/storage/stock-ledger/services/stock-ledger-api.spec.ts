import { TestBed } from '@angular/core/testing';

import { StockLedgerApi } from './stock-ledger-api';

describe('StockLedgerApi', () => {
  let service: StockLedgerApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockLedgerApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
