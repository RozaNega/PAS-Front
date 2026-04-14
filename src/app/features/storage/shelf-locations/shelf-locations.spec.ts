import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfLocations } from './shelf-locations';

describe('ShelfLocations', () => {
  let component: ShelfLocations;
  let fixture: ComponentFixture<ShelfLocations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShelfLocations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfLocations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
