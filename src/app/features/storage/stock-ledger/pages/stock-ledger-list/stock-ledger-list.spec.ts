import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockLedgerList } from './stock-ledger-list';

describe('StockLedgerList', () => {
  let component: StockLedgerList;
  let fixture: ComponentFixture<StockLedgerList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLedgerList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockLedgerList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
