import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryStock } from './inventory-stock';

describe('InventoryStock', () => {
  let component: InventoryStock;
  let fixture: ComponentFixture<InventoryStock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryStock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryStock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
