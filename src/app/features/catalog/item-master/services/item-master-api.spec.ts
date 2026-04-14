import { TestBed } from '@angular/core/testing';

import { ItemMasterApi } from './item-master-api';

describe('ItemMasterApi', () => {
  let service: ItemMasterApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemMasterApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
