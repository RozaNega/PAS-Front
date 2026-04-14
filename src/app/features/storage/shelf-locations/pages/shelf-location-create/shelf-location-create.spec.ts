import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocationCreate } from './shelf-location-create';

describe('ShelfLocationCreate', () => {
  let component: ShelfLocationCreate;
  let fixture: ComponentFixture<ShelfLocationCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocationCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocationCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
