import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WarehouseEdit } from './warehouse-edit';

describe('WarehouseEdit', () => {
  let component: WarehouseEdit;
  let fixture: ComponentFixture<WarehouseEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WarehouseEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
