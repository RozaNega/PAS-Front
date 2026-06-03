import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMasterApi } from '../../services/item-master-api';
import { ItemMasterListDto } from '../../../../../core/services/item-master.service';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-list.html',
  styleUrl: './item-list.css',
})
export class ItemList {
  private readonly itemApi = inject(ItemMasterApi);

  protected readonly items = this.itemApi.items;
  protected readonly isLoading = this.itemApi.isLoading;
  protected readonly hasItems = computed(() => this.items().length > 0);
  
  protected readonly selectedIds = signal<Set<string>>(new Set());

  protected toggleSelection(id: string): void {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  protected toggleAll(): void {
    if (this.selectedIds().size === this.items().length) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.items().map(i => String(i.id))));
    }
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected removeItem(item: ItemMasterListDto): void {
    if (confirm(`Are you sure you want to delete ${item.itemName}?`)) {
      this.itemApi.remove(String(item.id));
    }
  }

  protected onBulkEdit(): void {
    console.log('Bulk Edit:', Array.from(this.selectedIds()));
  }

  protected onBulkAdjust(): void {
    const qty = prompt('Enter adjustment quantity (e.g. 10 or -5):');
    if (qty) {
      this.itemApi.bulkAdjustStock(Array.from(this.selectedIds()), Number(qty));
    }
  }

  protected onBulkExport(): void {
    this.itemApi.bulkExport(Array.from(this.selectedIds()));
  }

  protected onGenerateQR(): void {
    this.itemApi.generateQrCodes(Array.from(this.selectedIds()));
  }
}

