import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WarehouseApi } from './services/warehouse-api';

@Component({
  selector: 'app-warehouses',
  imports: [],
  templateUrl: './warehouses.html',
  styleUrl: './warehouses.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Warehouses {
  private readonly warehouseApi = inject(WarehouseApi);

  readonly totals = computed(() => {
    const records = this.warehouseApi.list();
    return {
      warehouseCount: records.length,
      activeCount: records.filter((item) => item.active).length,
      totalCapacity: records.reduce((sum, item) => sum + item.capacity, 0),
    };
  });
}
