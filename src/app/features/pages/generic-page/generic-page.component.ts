import { Component, inject, signal, computed, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { BrowserMultiFormatReader, Result, Exception } from '@zxing/library';

echarts.use([BarChart, LineChart, TooltipComponent, GridComponent, CanvasRenderer]);

@Component({
  selector: 'app-generic-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './generic-page.component.html',
  styleUrl: './generic-page.component.scss',
})
export class GenericPageComponent implements OnDestroy {
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly pageTitle = this.route.snapshot.data['pageTitle'] || 'Page';
  readonly pageDescription = this.route.snapshot.data['pageDescription'] || '';
  readonly icon = this.route.snapshot.data['icon'] || 'bi bi-grid';
  readonly pageType = this.route.snapshot.data['pageType'] || 'placeholder';

  sampleData = [
    { id: 1, name: 'Item 1', sku: 'SKU-001', category: 'Electronics', warehouse: 'Warehouse A', status: 'Active', date: '2024-04-28', quantity: 10 },
    { id: 2, name: 'Item 2', sku: 'SKU-002', category: 'Office Supplies', warehouse: 'Warehouse B', status: 'Pending', date: '2024-04-27', quantity: 5 },
    { id: 3, name: 'Item 3', sku: 'SKU-003', category: 'Furniture', warehouse: 'Warehouse C', status: 'Completed', date: '2024-04-26', quantity: 20 },
    { id: 4, name: 'Item 4', sku: 'SKU-004', category: 'Electronics', warehouse: 'Warehouse A', status: 'Active', date: '2024-04-25', quantity: 15 },
    { id: 5, name: 'Item 5', sku: 'SKU-005', category: 'Office Supplies', warehouse: 'Warehouse B', status: 'Pending', date: '2024-04-24', quantity: 8 },
  ];

  recentActivities = [
    { id: 1, title: 'Stock Adjustment', description: 'Adjusted stock for Item 1 (+5)', time: '5 min ago', icon: 'bi bi-sliders' },
    { id: 2, title: 'New Issue', description: 'SIV-1023 created for Department A', time: '15 min ago', icon: 'bi bi-arrow-down-circle' },
    { id: 3, title: 'Receiving Complete', description: 'GRN-456 received and inspected', time: '30 min ago', icon: 'bi bi-arrow-up-circle' },
    { id: 4, title: 'Low Stock Alert', description: 'Item 23 is below minimum level', time: '1 hour ago', icon: 'bi bi-exclamation-triangle' },
  ];

  topItems = [
    { id: 1, name: 'Office Chair', sku: 'SKU-001', category: 'Furniture', issues: 45, stock: 120, minStock: 50 },
    { id: 2, name: 'Laptop', sku: 'SKU-002', category: 'Electronics', issues: 38, stock: 25, minStock: 20 },
    { id: 3, name: 'Printer Paper', sku: 'SKU-003', category: 'Office Supplies', issues: 32, stock: 500, minStock: 200 },
    { id: 4, name: 'Desk Lamp', sku: 'SKU-004', category: 'Furniture', issues: 28, stock: 15, minStock: 30 },
    { id: 5, name: 'USB Cable', sku: 'SKU-005', category: 'Electronics', issues: 25, stock: 8, minStock: 25 },
  ];

  recentScans = signal<any[]>([]);

  isScanning = false;
  isStreaming = false;
  manualQrCode = '';
  selectedScanId: number | null = null;
  quickScanSuggestions = ['SKU-001', 'ITEM-123', 'BOX-456', 'TAG-789'];
  avgScanTime = '0.8s';
  mediaStream: MediaStream | null = null;
  private zxingReader: BrowserMultiFormatReader | null = null;
  readonly cameraVideo = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  scanCount = signal(0);
  scanResult = signal<any | null>(null);
  scanErrors = signal(0);
  totalScans = signal(0);
  scanHistory = signal<number[]>([12, 18, 9, 22, 15, 20, 10]);
  scanAnimation = signal<'idle' | 'success' | 'error'>('idle');
  scanTimeline = signal<{ type: 'success' | 'error'; itemName: string; time: string }[]>([]);
  scanTimes: number[] = [];

  readonly scanSuccessRate = computed(() =>
    this.totalScans() > 0
      ? Math.round(((this.totalScans() - this.scanErrors()) / this.totalScans()) * 100)
      : 100
  );

  readonly statusText = computed(() => {
    if (this.scanAnimation() === 'success') return 'Found';
    if (this.isScanning) return 'Scanning';
    return 'Standby';
  });

  readonly scanChartOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [{
      data: this.scanHistory(),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#3b82f6' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
        ]),
      },
      itemStyle: { color: '#3b82f6' },
    }],
    grid: { left: '10%', right: '10%', top: '15%', bottom: '15%' },
  }));

  // Backup data
  lastBackupDate = 'April 30, 2026 at 2:00 AM';
  databaseSize = '2.4 GB';
  backupHistory = [
    { id: 1, name: 'Backup_2026-04-30', date: 'Apr 30, 2026 • 2:00 AM', size: '2.4 GB' },
    { id: 2, name: 'Backup_2026-04-29', date: 'Apr 29, 2026 • 2:00 AM', size: '2.4 GB' },
    { id: 3, name: 'Backup_2026-04-28', date: 'Apr 28, 2026 • 2:00 AM', size: '2.3 GB' },
    { id: 4, name: 'Backup_2026-04-27', date: 'Apr 27, 2026 • 2:00 AM', size: '2.3 GB' },
    { id: 5, name: 'Backup_2026-04-26', date: 'Apr 26, 2026 • 2:00 AM', size: '2.3 GB' },
  ];

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'active' || statusLower === 'approved' || statusLower === 'completed' || statusLower === 'received') {
      return 'status-success';
    }
    if (statusLower === 'pending' || statusLower === 'in progress') {
      return 'status-warning';
    }
    if (statusLower === 'inactive' || statusLower === 'rejected' || statusLower === 'failed') {
      return 'status-danger';
    }
    return 'status-info';
  }

  goToAddPage(): void {
    const currentUrl = this.router.url;
    // Admin routes
    if (currentUrl.includes('/admin/properties')) {
      this.router.navigate(['/admin/properties/add']);
    } else if (currentUrl.includes('/admin/locations')) {
      this.router.navigate(['/admin/locations/add']);
    } else if (currentUrl.includes('/admin/safety-boxes')) {
      this.router.navigate(['/admin/safety-boxes/add']);
    } else if (currentUrl.includes('/admin/inventory/movements')) {
      this.router.navigate(['/admin/inventory/adjustment']);
    } else if (currentUrl.includes('/admin/inventory')) {
      this.router.navigate(['/admin/inventory/adjustment']);
    } else if (currentUrl.includes('/admin/requisitions')) {
      this.router.navigate(['/admin/requisitions']);
    } else if (currentUrl.includes('/admin/receiving')) {
      this.router.navigate(['/admin/receiving/grn']);
    } else if (currentUrl.includes('/admin/users')) {
      this.router.navigate(['/admin/users/add']);
    } else if (currentUrl.includes('/admin/warehouses')) {
      this.router.navigate(['/admin/warehouses/add']);
    } else if (currentUrl.includes('/admin/shelves')) {
      this.router.navigate(['/admin/shelves/add']);
    }
    // Storekeeper routes
    else if (currentUrl.includes('/storekeeper/inventory/movements')) {
      this.router.navigate(['../inventory/adjustment'], { relativeTo: this.route });
    } else if (currentUrl.includes('/storekeeper/shelves')) {
      this.router.navigate(['../shelves'], { relativeTo: this.route });
    } else if (currentUrl.includes('/storekeeper/inventory')) {
      this.router.navigate(['../catalog/add'], { relativeTo: this.route });
    } else if (currentUrl.includes('/storekeeper/catalog')) {
      this.router.navigate(['../catalog/add'], { relativeTo: this.route });
    } else if (currentUrl.includes('/storekeeper/receiving')) {
      this.router.navigate(['../receiving/create'], { relativeTo: this.route });
    } else if (currentUrl.includes('/storekeeper/issuing')) {
      this.router.navigate(['../issuing/create'], { relativeTo: this.route });
    }
    // Generic fallback
    else {
      this.router.navigate(['../add'], { relativeTo: this.route });
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.isStreaming) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  private async startCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.showToast('Camera not available (insecure context or no browser support)', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.mediaStream = stream;

      const videoEl = this.cameraVideo()?.nativeElement;
      if (!videoEl) {
        this.showToast('Video element not found', 'error');
        return;
      }

      videoEl.srcObject = stream;

      this.zxingReader = new BrowserMultiFormatReader();
      this.zxingReader.decodeFromVideoDevice(null, videoEl, (result: Result, error?: Exception) => {
        if (result) {
          this.handleScanResult(result.getText());
        }
      });

      this.isScanning = true;
      this.isStreaming = true;
      this.showToast('Camera activated - scanning QR & barcodes', 'success');
    } catch (err: any) {
      this.showToast(`Camera error: ${err?.message || err?.name || 'denied'}`, 'error');
      this.isScanning = false;
      this.isStreaming = false;
    }
  }

  private stopCamera(): void {
    if (this.zxingReader) {
      this.zxingReader.reset();
      this.zxingReader = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    const videoEl = this.cameraVideo()?.nativeElement;
    if (videoEl) {
      videoEl.srcObject = null;
    }
    this.isScanning = false;
    this.isStreaming = false;
    this.scanAnimation.set('idle');
  }

  private handleScanResult(data: string): void {
    const startTime = performance.now();
    const raw = data.trim();
    const parsed = this.parseQrData(raw);
    const id = Date.now();
    const result = {
      id,
      itemName: parsed.name || `Scanned: ${parsed.sku}`,
      sku: parsed.sku,
      location: parsed.location || parsed.warehouse || 'Unregistered',
      time: 'Just now',
      status: 'Found',
      quantity: 0,
      rawData: raw,
    };
    this.addScanRecord(result);

    const elapsed = ((performance.now() - startTime) / 1000);
    this.scanTimes.push(elapsed);
    if (this.scanTimes.length > 50) this.scanTimes.shift();
    const avg = this.scanTimes.reduce((a, b) => a + b, 0) / this.scanTimes.length;
    this.avgScanTime = avg < 1 ? `${Math.round(avg * 10) / 10}s` : `${Math.round(avg)}s`;

    this.showToast(`Scanned: ${result.itemName}`, 'success');
    setTimeout(() => {
      this.scanAnimation.set('idle');
      if (this.isStreaming && this.zxingReader) {
        this.zxingReader.reset();
        if (this.mediaStream) {
          const videoEl = this.cameraVideo()?.nativeElement;
          if (videoEl) this.zxingReader.decodeFromVideoDevice(null, videoEl, (r: Result) => { if (r) this.handleScanResult(r.getText()); });
        }
      }
    }, 2000);
  }

  clearScanner(): void {
    this.stopCamera();
    this.manualQrCode = '';
    this.selectedScanId = null;
    this.scanResult.set(null);
    this.scanAnimation.set('idle');
  }

  clearScanResult(): void {
    this.scanResult.set(null);
    this.selectedScanId = null;
  }

  fillManualCode(code: string): void {
    this.manualQrCode = code;
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  toast = signal<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ message, type });
    this.toastTimeout = setTimeout(() => this.toast.set(null), 3000);
  }

  private parseQrData(raw: string): { name: string; sku: string; location: string; warehouse: string; shelf: string } {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          name: parsed.name || parsed.itemName || parsed.ItemName || '',
          sku: parsed.sku || parsed.SKU || parsed.code || raw,
          location: parsed.shelfLocation || parsed.location || (parsed.shelf ? `Shelf ${parsed.shelf}` : ''),
          warehouse: parsed.warehouse || parsed.warehouseId || '',
          shelf: parsed.shelf || parsed.shelfId || '',
        };
      }
    } catch { /* not JSON, fall through */ }
    return { name: '', sku: raw, location: '', warehouse: '', shelf: '' };
  }

  private addScanRecord(result: { id: number; itemName: string; sku: string; location: string; time: string; status: string; quantity: number; rawData: string }): void {
    this.scanCount.update(c => c + 1);
    this.totalScans.update(t => t + 1);
    this.scanAnimation.set('success');
    this.scanResult.set(result);
    this.selectedScanId = result.id;
    this.recentScans.update(list => [result, ...list].slice(0, 50));
    this.scanTimeline.update(list => [{ type: 'success' as const, itemName: result.itemName || result.sku, time: 'Just now' }, ...list].slice(0, 5));
  }

  lookupQR(): void {
    const raw = this.manualQrCode.trim();
    if (!raw) return;
    const startTime = performance.now();
    const parsed = this.parseQrData(raw);
    const id = Date.now();
    const result = {
      id,
      itemName: parsed.name || `Scanned: ${parsed.sku}`,
      sku: parsed.sku,
      location: parsed.location || parsed.warehouse || 'Unregistered',
      time: 'Just now',
      status: 'Found',
      quantity: 0,
      rawData: raw,
    };
    this.addScanRecord(result);
    this.manualQrCode = '';
    const elapsed = ((performance.now() - startTime) / 1000);
    this.scanTimes.push(elapsed);
    if (this.scanTimes.length > 50) this.scanTimes.shift();
    const avg = this.scanTimes.reduce((a, b) => a + b, 0) / this.scanTimes.length;
    this.avgScanTime = avg < 1 ? `${Math.round(avg * 10) / 10}s` : `${Math.round(avg)}s`;
    this.showToast(`Scanned: ${result.itemName}`, 'success');
    setTimeout(() => this.scanAnimation.set('idle'), 1500);
  }

  selectScan(id: number): void {
    this.selectedScanId = id;
    const scan = this.recentScans().find(s => s.id === id);
    if (scan) {
      this.showToast(`Selected: ${scan.itemName}`, 'info');
    }
  }

  viewScanDetails(id: number): void {
    const scan = this.recentScans().find(s => s.id === id);
    if (scan) {
      this.selectedScanId = id;
      this.scanResult.set({ ...scan, status: 'Found' });
      this.showToast(`Viewing details for: ${scan.itemName}`, 'info');
    } else {
      this.showToast('Item not found', 'error');
    }
  }

  issueItem(id: number): void {
    const scan = this.recentScans().find(s => s.id === id) || this.scanResult();
    if (scan) {
      this.router.navigate(['/storekeeper/issuing'], {
        queryParams: { sku: scan.sku, itemName: scan.itemName },
      });
    }
  }

  receiveItem(id: number): void {
    const scan = this.recentScans().find(s => s.id === id) || this.scanResult();
    if (scan) {
      this.router.navigate(['/storekeeper/receiving'], {
        queryParams: { sku: scan.sku, itemName: scan.itemName },
      });
    }
  }

  // ---- Generic page actions ----
  exportData(): void {
    this.showToast('Exporting data...', 'info');
    setTimeout(() => this.showToast('Export completed', 'success'), 1500);
  }

  applyFilters(): void {
    this.showToast('Filters applied', 'info');
  }

  refreshData(): void {
    this.showToast('Refreshing data...', 'info');
    setTimeout(() => this.showToast('Data refreshed', 'success'), 800);
  }

  viewItem(item: any): void {
    this.showToast(`Viewing: ${item.name}`, 'info');
  }

  editItem(item: any): void {
    this.showToast(`Editing: ${item.name}`, 'info');
  }

  deleteItem(item: any): void {
    this.showToast(`Deleted: ${item.name}`, 'success');
  }

  goToPage(page: number): void {
    this.showToast(`Navigating to page ${page}`, 'info');
  }

  cancelForm(): void {
    this.showToast('Form cancelled', 'info');
  }

  saveDraft(): void {
    this.showToast('Draft saved', 'success');
  }

  submitForm(): void {
    this.showToast('Form submitted successfully', 'success');
  }

  viewDetails(item: any): void {
    this.showToast(`Viewing details: ${item.name}`, 'info');
  }

  editListItem(item: any): void {
    this.showToast(`Editing: ${item.name}`, 'info');
  }

  configureSchedule(): void {
    this.showToast('Opening schedule configuration...', 'info');
    setTimeout(() => this.showToast('Schedule updated', 'success'), 1500);
  }

  downloadBackup(backup: any): void {
    this.showToast(`Downloading: ${backup.name}`, 'info');
    setTimeout(() => this.showToast('Download complete', 'success'), 2000);
  }

  deleteBackup(backup: any): void {
    this.showToast(`Deleted backup: ${backup.name}`, 'success');
  }

  saveSettings(): void {
    this.showToast('Settings saved', 'success');
  }

  createBackup(): void {
    this.showToast('Backup started...', 'info');
    setTimeout(() => this.showToast('Backup completed successfully!', 'success'), 2000);
  }

  restoreBackup(id: number): void {
    const backup = this.backupHistory.find(b => b.id === id);
    if (backup) {
      this.showToast(`Restoring: ${backup.name}`, 'info');
      setTimeout(() => this.showToast('Restore completed!', 'success'), 2000);
    }
  }
}
