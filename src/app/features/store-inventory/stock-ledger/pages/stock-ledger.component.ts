import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockLedgerDto, StockLedgerService } from '../../../../core/services/stock-ledger.service';

type LedgerTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'OTHER';

interface LedgerEntry {
  id: string;
  date: string;
  time: string;
  itemCode: string;
  itemName: string;
  transactionType: LedgerTransactionType;
  quantity: number;
  reference: string;
  user: string;
  warehouse: string;
  location: string;
  timestamp: number;
}

@Component({
  selector: 'app-stock-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-ledger.component.html',
  styleUrls: ['./stock-ledger.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockLedgerComponent implements OnInit {
  private readonly stockLedgerService = inject(StockLedgerService);

  readonly searchTerm = signal('');
  readonly selectedItem = signal('');
  readonly selectedType = signal('');
  readonly dateFrom = signal(this.daysAgoIsoDate(30));
  readonly dateTo = signal(this.todayIsoDate());
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly totalCount = signal(0);

  private readonly ledgerEntries = signal<LedgerEntry[]>([]);

  readonly filteredEntries = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const selectedItem = this.selectedItem();
    const selectedType = this.selectedType();
    const from = this.dateFrom() ? new Date(this.dateFrom()).getTime() : Number.NEGATIVE_INFINITY;
    const to = this.dateTo()
      ? new Date(`${this.dateTo()}T23:59:59`).getTime()
      : Number.POSITIVE_INFINITY;

    return this.ledgerEntries().filter((entry) => {
      const matchesSearch =
        search.length === 0 ||
        entry.itemName.toLowerCase().includes(search) ||
        entry.itemCode.toLowerCase().includes(search) ||
        entry.reference.toLowerCase().includes(search) ||
        entry.location.toLowerCase().includes(search) ||
        entry.warehouse.toLowerCase().includes(search);

      const matchesItem = selectedItem.length === 0 || entry.itemCode === selectedItem;
      const matchesType = selectedType.length === 0 || entry.transactionType === selectedType;
      const matchesDate = entry.timestamp >= from && entry.timestamp <= to;

      return matchesSearch && matchesItem && matchesType && matchesDate;
    });
  });

  readonly uniqueItems = computed(() =>
    [...new Set(this.ledgerEntries().map((entry) => entry.itemCode))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  ngOnInit(): void {
    this.loadData();
  }

  getCountByType(type: LedgerTransactionType): number {
    return this.filteredEntries().filter((entry) => entry.transactionType === type).length;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedItem.set('');
    this.selectedType.set('');
    this.dateFrom.set(this.daysAgoIsoDate(30));
    this.dateTo.set(this.todayIsoDate());
    this.loadData();
  }

  exportLedger(): void {
    const rows = this.filteredEntries();
    const headers = [
      'Date',
      'Time',
      'Item Code',
      'Item Name',
      'Transaction Type',
      'Quantity',
      'Reference',
      'User',
      'Warehouse',
      'Location',
    ];
    const content = [
      headers.join(','),
      ...rows.map((entry) =>
        [
          this.escapeCsv(entry.date),
          this.escapeCsv(entry.time),
          this.escapeCsv(entry.itemCode),
          this.escapeCsv(entry.itemName),
          this.escapeCsv(entry.transactionType),
          String(entry.quantity),
          this.escapeCsv(entry.reference),
          this.escapeCsv(entry.user),
          this.escapeCsv(entry.warehouse),
          this.escapeCsv(entry.location),
        ].join(','),
      ),
    ].join('\n');

    this.downloadFile(content, 'stock-ledger.csv', 'text/csv;charset=utf-8;');
  }

  getTransactionClass(type: LedgerTransactionType): string {
    switch (type) {
      case 'IN':
        return 'row--in';
      case 'OUT':
        return 'row--out';
      case 'ADJUSTMENT':
        return 'row--adjust';
      case 'TRANSFER':
        return 'row--transfer';
      default:
        return '';
    }
  }

  getBadgeClass(type: LedgerTransactionType): string {
    switch (type) {
      case 'IN':
        return 'badge--in';
      case 'OUT':
        return 'badge--out';
      case 'ADJUSTMENT':
        return 'badge--adjust';
      case 'TRANSFER':
        return 'badge--transfer';
      default:
        return 'badge--other';
    }
  }

  getQtyClass(qty: number): string {
    if (qty > 0) return 'qty--pos';
    if (qty < 0) return 'qty--neg';
    return 'qty--zero';
  }

  qtyDisplay(qty: number): string {
    return qty > 0 ? `+${qty}` : `${qty}`;
  }

  loadData(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.stockLedgerService
      .getAll({
        fromDate: this.dateFrom(),
        toDate: this.dateTo(),
        pageNumber: 1,
        pageSize: 500,
      })
      .subscribe({
        next: (response) => {
          const page = response.data;
          const items = page?.items ?? [];

          this.ledgerEntries.set(items.map((entry) => this.toLedgerEntry(entry)));
          this.totalCount.set(page?.totalCount ?? items.length);
          this.isLoading.set(false);

          if (!response.success) {
            this.loadError.set(response.message || 'Unable to load stock ledger data.');
          }
        },
        error: () => {
          this.ledgerEntries.set([]);
          this.totalCount.set(0);
          this.loadError.set('Unable to load stock ledger data from the backend.');
          this.isLoading.set(false);
        },
      });
  }

  private toLedgerEntry(entry: StockLedgerDto): LedgerEntry {
    const timestamp = this.parseTimestamp(entry.createdDate);
    const date = timestamp > 0 ? new Date(timestamp) : null;

    return {
      id: entry.id,
      date:
        date?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) || 'N/A',
      time:
        date?.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }) || 'N/A',
      itemCode: entry.sku?.trim() || entry.itemId || 'N/A',
      itemName: entry.itemName?.trim() || 'Unknown Item',
      transactionType: this.normalizeTransactionType(entry),
      quantity: entry.quantityChange ?? 0,
      reference: entry.referenceNumber?.trim() || entry.referenceId || 'N/A',
      user: entry.performedBy?.trim() || 'System',
      warehouse: entry.warehouseName?.trim() || 'N/A',
      location: entry.shelfLocation?.trim() || 'N/A',
      timestamp,
    };
  }

  private normalizeTransactionType(entry: StockLedgerDto): LedgerTransactionType {
    const value = (entry.transactionType ?? '').trim().toLowerCase();

    if (value.includes('transfer')) {
      return 'TRANSFER';
    }

    if (value.includes('adjust')) {
      return 'ADJUSTMENT';
    }

    if (
      value.includes('out') ||
      value.includes('issue') ||
      value.includes('dispatch') ||
      value.includes('release') ||
      value.includes('consume')
    ) {
      return 'OUT';
    }

    if (
      value.includes('in') ||
      value.includes('receive') ||
      value.includes('receipt') ||
      value.includes('grn')
    ) {
      return 'IN';
    }

    if ((entry.quantityChange ?? 0) < 0) {
      return 'OUT';
    }

    if ((entry.quantityChange ?? 0) > 0) {
      return 'IN';
    }

    return 'OTHER';
  }

  private parseTimestamp(value: string): number {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private todayIsoDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private daysAgoIsoDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  private escapeCsv(value: string): string {
    const normalized = value.replaceAll('"', '""');
    return `"${normalized}"`;
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
