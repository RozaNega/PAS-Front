import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ItemMasterApi } from './item-master-api';

@Component({
  selector: 'app-services',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly totalItems = this.itemApi.items;
  protected readonly activeItemCount = this.itemApi.activeItemCount;
  protected readonly totalStock = this.itemApi.totalStock;
}
