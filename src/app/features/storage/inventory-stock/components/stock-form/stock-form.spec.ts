import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockForm } from './stock-form';

describe('StockForm', () => {
  let component: StockForm;
  let fixture: ComponentFixture<StockForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
