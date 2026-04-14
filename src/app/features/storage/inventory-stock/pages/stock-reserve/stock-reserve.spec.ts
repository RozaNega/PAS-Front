import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockReserve } from './stock-reserve';

describe('StockReserve', () => {
  let component: StockReserve;
  let fixture: ComponentFixture<StockReserve>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockReserve]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockReserve);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
