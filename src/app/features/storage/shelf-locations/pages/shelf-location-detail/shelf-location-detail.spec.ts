import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocationDetail } from './shelf-location-detail';

describe('ShelfLocationDetail', () => {
  let component: ShelfLocationDetail;
  let fixture: ComponentFixture<ShelfLocationDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocationDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocationDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
