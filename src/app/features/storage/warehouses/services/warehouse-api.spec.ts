import { TestBed } from '@angular/core/testing';

import { WarehouseApi } from './warehouse-api';

describe('WarehouseApi', () => {
  let service: WarehouseApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WarehouseApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
