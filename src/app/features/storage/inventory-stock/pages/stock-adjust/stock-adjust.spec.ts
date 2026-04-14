import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockAdjust } from './stock-adjust';

describe('StockAdjust', () => {
  let component: StockAdjust;
  let fixture: ComponentFixture<StockAdjust>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAdjust]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockAdjust);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
