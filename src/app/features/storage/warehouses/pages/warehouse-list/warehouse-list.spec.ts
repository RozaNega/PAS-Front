import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseList } from './warehouse-list';

describe('WarehouseList', () => {
  let component: WarehouseList;
  let fixture: ComponentFixture<WarehouseList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WarehouseList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
