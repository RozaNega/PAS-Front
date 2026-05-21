import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryStockDto } from '../../../../core/services/inventory.service';

@Component({
  selector: 'app-qr-codes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-codes.component.html',
  styleUrls: ['./qr-codes.component.scss']
})
export class QRCodesComponent implements OnInit {
  private readonly router = inject(Router);

  items = signal<InventoryStockDto[]>([]);
  qrCodes = signal<Map<string, string>>(new Map());
  loading = signal(false);
  printMode = signal(false);

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['items']) {
      this.items.set(navigation.extras.state['items']);
      this.generateQRCodes();
    } else {
      this.router.navigate(['/admin/inventory']);
    }
  }

  generateQRCodes(): void {
    this.loading.set(true);
    const qrMap = new Map<string, string>();

    this.items().forEach(item => {
      const qrData = {
        id: item.itemId,
        name: item.itemName,
        sku: item.sku,
        warehouse: item.warehouseId,
        shelf: item.shelfId
      };

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
      qrMap.set(item.id, qrUrl);
    });

    this.qrCodes.set(qrMap);
    this.loading.set(false);
  }

  getQRCode(itemId: string): string {
    return this.qrCodes().get(itemId) || '';
  }

  print(): void {
    window.print();
  }

  download(): void {
    const link = document.createElement('a');
    link.href = this.getQRCode(this.items()[0].id);
    link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
  }

  cancel(): void {
    this.router.navigate(['/admin/inventory']);
  }
}
