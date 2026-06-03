import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { ItemMasterApi } from '../../services/item-master-api';

@Component({
  selector: 'app-item-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-detail.html',
  styleUrl: './item-detail.css',
})
export class ItemDetail {
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly items = this.itemApi.items;
  protected readonly selectedId = signal('');
  protected readonly detail = computed(() =>
    this.selectedId() ? this.itemApi.getById(this.selectedId()) : undefined,
  );

  constructor() {
    effect(() => {
      const items = this.items();
      if (items.length > 0 && !this.selectedId()) {
        this.selectedId.set(String(items[0].id));
      }
    });
  }

  protected selectItem(id: string): void {
    this.selectedId.set(id);
  }
}
