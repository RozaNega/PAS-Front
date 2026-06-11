import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import QRCode from 'qrcode';
import { InventoryStockDto } from '../../../../core/services/inventory.service';

interface QrItem {
  id: string;
  itemName: string;
  sku: string;
  warehouse?: string;
  shelf?: string;
  dataUrl: string;
}

@Component({
  selector: 'app-qr-codes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-codes.component.html',
  styleUrls: ['./qr-codes.component.scss']
})
export class QRCodesComponent implements OnInit {
  private readonly router = inject(Router);

  items = signal<QrItem[]>([]);
  loading = signal(false);
  generating = signal(false);
  printMode = signal(false);
  searchTerm = signal('');

  manualInput = signal('');
  manualQrUrl = signal('');
  manualGenerating = signal(false);
  showManual = signal(false);
  showScanner = signal(false);

  filteredItems = computed(() => {
    const q = this.searchTerm().toLowerCase();
    return this.items().filter(i =>
      !q || i.itemName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const stateItems: InventoryStockDto[] = nav?.extras?.state?.['items'];
    if (stateItems?.length) {
      this.items.set(stateItems.map(i => ({
        id: i.id,
        itemName: i.itemName,
        sku: i.sku,
        warehouse: i.warehouseName,
        shelf: i.shelfLocation,
        dataUrl: ''
      })));
      this.generateAll();
    }
  }

  async generateAll(): Promise<void> {
    const list = this.items();
    if (!list.length) return;
    this.loading.set(true);
    try {
      for (const item of list) {
        const data = JSON.stringify({
          id: item.id,
          name: item.itemName,
          sku: item.sku,
          warehouse: item.warehouse || '',
          shelf: item.shelf || ''
        });
        item.dataUrl = await QRCode.toDataURL(data, {
          width: 280, margin: 1, color: { dark: '#1e293b', light: '#ffffff' }
        });
      }
      this.items.set([...list]);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async generateManual(): Promise<void> {
    const text = this.manualInput().trim();
    if (!text) return;
    this.manualGenerating.set(true);
    try {
      this.manualQrUrl.set(await QRCode.toDataURL(text, {
        width: 280, margin: 1, color: { dark: '#1e293b', light: '#ffffff' }
      }));
    } catch (e) {
      console.error(e);
    } finally {
      this.manualGenerating.set(false);
    }
  }

  addManualAsItem(): void {
    const text = this.manualInput().trim();
    if (!text || !this.manualQrUrl()) return;
    const sku = text.length > 20 ? text.slice(0, 20) + '…' : text;
    this.items.update(list => [...list, {
      id: 'manual-' + Date.now(),
      itemName: text,
      sku,
      dataUrl: this.manualQrUrl()
    }]);
    this.manualInput.set('');
    this.manualQrUrl.set('');
    this.showManual.set(false);
  }

  downloadSingle(item: QrItem): void {
    if (!item.dataUrl) return;
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `qr-${item.sku}.png`;
    a.click();
  }

  async downloadAll(): Promise<void> {
    const list = this.filteredItems().filter(i => i.dataUrl);
    if (!list.length) return;
    if (list.length === 1) { this.downloadSingle(list[0]); return; }
    const cols = 4;
    const rows = Math.ceil(list.length / cols);
    const cw = 260, ch = 340;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cw;
    canvas.height = rows * ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) { this.downloadSingle(list[0]); return; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cw, y = row * ch;
      const img = new Image();
      await new Promise<void>(resolve => {
        img.onload = () => {
          const size = 200;
          ctx.drawImage(img, x + (cw - size) / 2, y + 10, size, size);
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.itemName, x + cw / 2, y + size + 35);
          ctx.fillStyle = '#64748b';
          ctx.font = '11px sans-serif';
          ctx.fillText(item.sku, x + cw / 2, y + size + 52);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = item.dataUrl;
      });
    }
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `qr-codes-${new Date().toISOString().split('T')[0]}.png`;
    a.click();
  }

  print(): void {
    this.printMode.set(true);
    setTimeout(() => { window.print(); setTimeout(() => this.printMode.set(false), 100); }, 300);
  }

  clearItems(): void {
    this.items.set([]);
    this.searchTerm.set('');
  }

  cancel(): void {
    if (this.items().length) {
      this.router.navigate(['/admin/inventory']);
    } else {
      this.router.navigate(['/storekeeper/catalog']);
    }
  }
}
