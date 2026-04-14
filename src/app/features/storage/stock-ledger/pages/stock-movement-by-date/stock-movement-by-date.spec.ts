import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockMovementByDate } from './stock-movement-by-date';

describe('StockMovementByDate', () => {
  let component: StockMovementByDate;
  let fixture: ComponentFixture<StockMovementByDate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockMovementByDate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockMovementByDate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
