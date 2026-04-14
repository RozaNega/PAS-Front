import { TestBed } from '@angular/core/testing';

import { ShelfLocationApi } from './shelf-location-api';

describe('ShelfLocationApi', () => {
  let service: ShelfLocationApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShelfLocationApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
