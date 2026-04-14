import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocationForm } from './shelf-location-form';

describe('ShelfLocationForm', () => {
  let component: ShelfLocationForm;
  let fixture: ComponentFixture<ShelfLocationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocationForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocationForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
