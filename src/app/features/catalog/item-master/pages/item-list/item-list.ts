import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ItemRecord } from '../../models/models';
import { ItemMasterApi } from '../../services/item-master-api';

@Component({
  selector: 'app-item-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-list.html',
  styleUrl: './item-list.css',
})
export class ItemList {
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly items = this.itemApi.items;
  protected readonly hasItems = computed(() => this.items().length > 0);

  protected removeItem(item: ItemRecord): void {
    this.itemApi.remove(item.id);
  }
}
