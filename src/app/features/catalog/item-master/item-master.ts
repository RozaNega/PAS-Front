import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ItemMasterApi } from './services/item-master-api';

@Component({
  selector: 'app-item-master',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-master.html',
  styleUrl: './item-master.css',
})
export class ItemMaster {
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly currentView = signal<'list' | 'create' | 'edit' | 'detail'>('list');
  protected readonly totalItems = this.itemApi.items;
  protected readonly activeItemCount = this.itemApi.activeItemCount;
  protected readonly totalStock = this.itemApi.totalStock;

  protected setView(view: 'list' | 'create' | 'edit' | 'detail'): void {
    this.currentView.set(view);
  }
}
