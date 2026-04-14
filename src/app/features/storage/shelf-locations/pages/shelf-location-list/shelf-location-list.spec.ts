import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocationList } from './shelf-location-list';

describe('ShelfLocationList', () => {
  let component: ShelfLocationList;
  let fixture: ComponentFixture<ShelfLocationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocationList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocationList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
