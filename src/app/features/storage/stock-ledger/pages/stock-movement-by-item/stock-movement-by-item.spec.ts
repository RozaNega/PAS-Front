import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockMovementByItem } from './stock-movement-by-item';

describe('StockMovementByItem', () => {
  let component: StockMovementByItem;
  let fixture: ComponentFixture<StockMovementByItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockMovementByItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockMovementByItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
