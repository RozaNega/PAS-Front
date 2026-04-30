import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-generic-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generic-page.component.html',
  styleUrl: './generic-page.component.scss',
})
export class GenericPageComponent {
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

  recentScans = [
    { id: 1, itemName: 'Office Chair', sku: 'SKU-001', location: 'Warehouse A, Shelf 12', time: '2 min ago' },
    { id: 2, itemName: 'Laptop', sku: 'SKU-002', location: 'Warehouse B, Shelf 5', time: '5 min ago' },
    { id: 3, itemName: 'Printer Paper', sku: 'SKU-003', location: 'Warehouse A, Shelf 8', time: '10 min ago' },
    { id: 4, itemName: 'Desk Lamp', sku: 'SKU-004', location: 'Warehouse C, Shelf 3', time: '15 min ago' },
  ];

  isScanning = false;
  manualQrCode = '';
  selectedScanId: number | null = null;

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

  toggleCamera(): void {
    this.isScanning = !this.isScanning;
  }

  clearScanner(): void {
    this.manualQrCode = '';
    this.selectedScanId = null;
    this.isScanning = false;
  }

  lookupQR(): void {
    if (this.manualQrCode.trim()) {
      alert(`Looking up QR code: ${this.manualQrCode}`);
      this.manualQrCode = '';
    }
  }

  selectScan(id: number): void {
    this.selectedScanId = id;
  }

  viewScanDetails(id: number): void {
    const scan = this.recentScans.find(s => s.id === id);
    if (scan) {
      alert(`Viewing details for: ${scan.itemName}`);
    }
  }

  issueItem(id: number): void {
    const scan = this.recentScans.find(s => s.id === id);
    if (scan) {
      alert(`Issuing item: ${scan.itemName}`);
    }
  }

  receiveItem(id: number): void {
    const scan = this.recentScans.find(s => s.id === id);
    if (scan) {
      alert(`Receiving item: ${scan.itemName}`);
    }
  }

  createBackup(): void {
    alert('Creating backup...');
  }

  restoreBackup(id: number): void {
    const backup = this.backupHistory.find(b => b.id === id);
    if (backup) {
      alert(`Restoring backup: ${backup.name}`);
    }
  }
}
