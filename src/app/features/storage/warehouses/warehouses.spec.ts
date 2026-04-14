import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Warehouses } from './warehouses';

describe('Warehouses', () => {
  let component: Warehouses;
  let fixture: ComponentFixture<Warehouses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Warehouses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Warehouses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
