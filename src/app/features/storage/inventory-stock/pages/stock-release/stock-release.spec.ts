import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockRelease } from './stock-release';

describe('StockRelease', () => {
  let component: StockRelease;
  let fixture: ComponentFixture<StockRelease>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockRelease]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockRelease);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
