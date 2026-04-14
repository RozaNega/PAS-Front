import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockLedgerFilter } from './stock-ledger-filter';

describe('StockLedgerFilter', () => {
  let component: StockLedgerFilter;
  let fixture: ComponentFixture<StockLedgerFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLedgerFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockLedgerFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
