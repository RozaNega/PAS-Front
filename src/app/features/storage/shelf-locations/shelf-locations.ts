import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ShelfLocationApi } from './services/shelf-location-api';

@Component({
  selector: 'app-shelf-locations',
  imports: [],
  templateUrl: './shelf-locations.html',
  styleUrl: './shelf-locations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShelfLocations {
  private readonly shelfLocationApi = inject(ShelfLocationApi);

  readonly totals = computed(() => {
    const records = this.shelfLocationApi.list();
    return {
      count: records.length,
      activeCount: records.filter((item) => item.active).length,
      totalCapacity: records.reduce((sum, item) => sum + item.maxUnits, 0),
    };
  });
}
