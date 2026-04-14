import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockLedger } from './stock-ledger';

describe('StockLedger', () => {
  let component: StockLedger;
  let fixture: ComponentFixture<StockLedger>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLedger]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockLedger);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
