import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocationEdit } from './shelf-location-edit';

describe('ShelfLocationEdit', () => {
  let component: ShelfLocationEdit;
  let fixture: ComponentFixture<ShelfLocationEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocationEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocationEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
