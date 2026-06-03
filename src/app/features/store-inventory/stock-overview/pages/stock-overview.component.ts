import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryService, InventoryStockDto, StockMovementDto } from '../../../../core/services/inventory.service';

interface StockHistoryEntry {
  date: string;
  type: string;
  quantity: number;
  reference: string;
  performedBy: string;
  notes?: string;
}

interface StockDisplayRow {
  id: string;
  itemName: string;
  sku: string;
  warehouse: string;
  currentStock: number;
  reserved: number;
  available: number;
  minThreshold: number;
  maxThreshold: number;
  unit: string;
  status: string;
  statusClass: string;
  lastUpdated: string;
  itemId: string;
}

interface MonthlyTrendPoint {
  month: string;
  total: number;
  inflow: number;
  outflow: number;
  barHeight: number;
}

interface CategoryDistItem {
  name: string;
  count: number;
  percentage: number;
}

interface TopStockItem {
  rank: number;
  name: string;
  sku: string;
  stock: number;
  barWidth: number;
}

interface SummaryStats {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  inflowToday: number;
  outflowToday: number;
  netChange: number;
}

const MOCK_MONTHLY = {
  months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  totals: [4200, 4450, 4100, 4800, 5100, 4900, 5300, 5600, 5200, 5800, 6100, 5900],
  inflows: [850, 920, 780, 1100, 1250, 1150, 1300, 1400, 1200, 1500, 1600, 1450],
  outflows: [720, 800, 650, 950, 1050, 980, 1100, 1200, 1050, 1300, 1400, 1250],
};

const MOCK_ITEMS: InventoryStockDto[] = [
  { id: 'inv-m01', itemId: 'item-m01', itemName: 'Teff - White', sku: 'GRA-TEF-WH-001', shelfId: 'sh-m01', shelfLocation: 'Silo-A-01', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 2500, reservedStock: 400, availableStock: 2100, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T10:00:00.000Z', minimumThreshold: 500, maximumThreshold: 5000 },
  { id: 'inv-m02', itemId: 'item-m02', itemName: 'Coffee - Arabica', sku: 'CRP-COF-AR-002', shelfId: 'sh-m02', shelfLocation: 'Cold-A-02', warehouseId: 'wh-cold', warehouseName: 'Cold Storage', currentStock: 1800, reservedStock: 300, availableStock: 1500, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T08:30:00.000Z', minimumThreshold: 400, maximumThreshold: 4000 },
  { id: 'inv-m03', itemId: 'item-m03', itemName: 'Maize - Yellow', sku: 'GRA-MAI-YL-003', shelfId: 'sh-m03', shelfLocation: 'Silo-B-02', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 3200, reservedStock: 600, availableStock: 2600, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-27T14:00:00.000Z', minimumThreshold: 800, maximumThreshold: 6000 },
  { id: 'inv-m04', itemId: 'item-m04', itemName: 'Sesame Seeds', sku: 'OIL-SES-SD-004', shelfId: 'sh-m04', shelfLocation: 'Dry-A-03', warehouseId: 'wh-main', warehouseName: 'Main Warehouse', currentStock: 900, reservedStock: 150, availableStock: 750, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-27T11:00:00.000Z', minimumThreshold: 200, maximumThreshold: 2000 },
  { id: 'inv-m05', itemId: 'item-m05', itemName: 'Wheat - Hard Red', sku: 'GRA-WHT-HR-005', shelfId: 'sh-m05', shelfLocation: 'Silo-B-03', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 4100, reservedStock: 800, availableStock: 3300, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-26T16:00:00.000Z', minimumThreshold: 1000, maximumThreshold: 8000 },
  { id: 'inv-m06', itemId: 'item-m06', itemName: 'Barley - Food Grade', sku: 'GRA-BAR-FG-006', shelfId: 'sh-m06', shelfLocation: 'Silo-A-04', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 1600, reservedStock: 250, availableStock: 1350, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T09:00:00.000Z', minimumThreshold: 400, maximumThreshold: 3500 },
  { id: 'inv-m07', itemId: 'item-m07', itemName: 'Sorghum - Red', sku: 'GRA-SRG-RD-007', shelfId: 'sh-m07', shelfLocation: 'Silo-A-05', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 2800, reservedStock: 500, availableStock: 2300, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-25T13:00:00.000Z', minimumThreshold: 600, maximumThreshold: 5000 },
  { id: 'inv-m08', itemId: 'item-m08', itemName: 'Honey - Pure', sku: 'FOD-HON-PR-008', shelfId: 'sh-m08', shelfLocation: 'Dry-B-01', warehouseId: 'wh-main', warehouseName: 'Main Warehouse', currentStock: 350, reservedStock: 80, availableStock: 270, unitOfMeasure: 'Ltrs', lastUpdated: '2026-05-28T07:00:00.000Z', minimumThreshold: 100, maximumThreshold: 800 },
  { id: 'inv-m09', itemId: 'item-m09', itemName: 'Cotton - Raw', sku: 'TEX-COT-RW-009', shelfId: 'sh-m09', shelfLocation: 'Dry-B-02', warehouseId: 'wh-branch', warehouseName: 'Branch Warehouse', currentStock: 750, reservedStock: 120, availableStock: 630, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-27T10:00:00.000Z', minimumThreshold: 200, maximumThreshold: 2000 },
  { id: 'inv-m10', itemId: 'item-m10', itemName: 'Sugarcane - Raw', sku: 'AGR-SGR-RW-010', shelfId: 'sh-m10', shelfLocation: 'Dry-B-03', warehouseId: 'wh-branch', warehouseName: 'Branch Warehouse', currentStock: 4200, reservedStock: 900, availableStock: 3300, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-26T09:00:00.000Z', minimumThreshold: 1000, maximumThreshold: 8000 },
  { id: 'inv-m11', itemId: 'item-m11', itemName: 'Haricot Beans', sku: 'GRA-HBN-RD-011', shelfId: 'sh-m11', shelfLocation: 'Silo-B-04', warehouseId: 'wh-silo', warehouseName: 'Grain Silo', currentStock: 1200, reservedStock: 200, availableStock: 1000, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T12:00:00.000Z', minimumThreshold: 300, maximumThreshold: 3000 },
  { id: 'inv-m12', itemId: 'item-m12', itemName: 'Sunflower Oil', sku: 'OIL-SUN-RF-012', shelfId: 'sh-m12', shelfLocation: 'Cold-B-01', warehouseId: 'wh-cold', warehouseName: 'Cold Storage', currentStock: 600, reservedStock: 100, availableStock: 500, unitOfMeasure: 'Ltrs', lastUpdated: '2026-05-27T15:00:00.000Z', minimumThreshold: 150, maximumThreshold: 1500 },
  { id: 'inv-m13', itemId: 'item-m13', itemName: 'Salt - Iodized', sku: 'FOD-SLT-ID-013', shelfId: 'sh-m13', shelfLocation: 'Dry-A-06', warehouseId: 'wh-main', warehouseName: 'Main Warehouse', currentStock: 450, reservedStock: 90, availableStock: 360, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T06:00:00.000Z', minimumThreshold: 150, maximumThreshold: 1000 },
  { id: 'inv-m14', itemId: 'item-m14', itemName: 'Pepper - Red Dry', sku: 'SPC-PPR-RD-014', shelfId: 'sh-m14', shelfLocation: 'Dry-A-07', warehouseId: 'wh-main', warehouseName: 'Main Warehouse', currentStock: 120, reservedStock: 25, availableStock: 95, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T11:00:00.000Z', minimumThreshold: 50, maximumThreshold: 400 },
  { id: 'inv-m15', itemId: 'item-m15', itemName: 'Chat - Fresh', sku: 'AGR-CHT-FR-015', shelfId: 'sh-m15', shelfLocation: 'Cold-A-03', warehouseId: 'wh-cold', warehouseName: 'Cold Storage', currentStock: 280, reservedStock: 60, availableStock: 220, unitOfMeasure: 'Kgs', lastUpdated: '2026-05-28T05:00:00.000Z', minimumThreshold: 80, maximumThreshold: 600 },
];

const MOCK_HISTORY: Record<string, StockHistoryEntry[]> = {
  'item-m01': [
    { date: '2026-05-25T09:00:00.000Z', type: 'In', quantity: 500, reference: 'GRN-2026-0045', performedBy: 'Abebe Kebede' },
    { date: '2026-05-22T14:00:00.000Z', type: 'Out', quantity: 300, reference: 'SIV-2026-0088', performedBy: 'Tigist Haile' },
    { date: '2026-05-18T10:00:00.000Z', type: 'In', quantity: 800, reference: 'GRN-2026-0040', performedBy: 'Abebe Kebede' },
    { date: '2026-05-15T08:00:00.000Z', type: 'Out', quantity: 200, reference: 'SIV-2026-0080', performedBy: 'Meron Lemma' },
    { date: '2026-05-10T11:00:00.000Z', type: 'Adjustment', quantity: -50, reference: 'ADJ-2026-0012', performedBy: 'Girma Wolde', notes: 'Quality check deduction' },
  ],
  'item-m02': [
    { date: '2026-05-26T10:00:00.000Z', type: 'In', quantity: 400, reference: 'GRN-2026-0043', performedBy: 'Abebe Kebede' },
    { date: '2026-05-24T09:00:00.000Z', type: 'Out', quantity: 200, reference: 'SIV-2026-0085', performedBy: 'Sara Kedir' },
    { date: '2026-05-20T14:00:00.000Z', type: 'In', quantity: 600, reference: 'GRN-2026-0038', performedBy: 'Lemma Tesfaye' },
    { date: '2026-05-16T11:00:00.000Z', type: 'Out', quantity: 350, reference: 'SIV-2026-0076', performedBy: 'Tigist Haile' },
  ],
  'item-m03': [
    { date: '2026-05-24T08:00:00.000Z', type: 'In', quantity: 1000, reference: 'GRN-2026-0042', performedBy: 'Girma Wolde' },
    { date: '2026-05-21T10:00:00.000Z', type: 'Out', quantity: 500, reference: 'SIV-2026-0082', performedBy: 'Meron Lemma' },
    { date: '2026-05-15T09:00:00.000Z', type: 'In', quantity: 1200, reference: 'GRN-2026-0035', performedBy: 'Abebe Kebede' },
  ],
  'item-m04': [
    { date: '2026-05-23T11:00:00.000Z', type: 'In', quantity: 300, reference: 'GRN-2026-0041', performedBy: 'Lemma Tesfaye' },
    { date: '2026-05-20T08:00:00.000Z', type: 'Out', quantity: 150, reference: 'SIV-2026-0079', performedBy: 'Sara Kedir' },
    { date: '2026-05-17T14:00:00.000Z', type: 'In', quantity: 400, reference: 'GRN-2026-0037', performedBy: 'Tigist Haile' },
  ],
  'item-m05': [
    { date: '2026-05-25T13:00:00.000Z', type: 'In', quantity: 1200, reference: 'GRN-2026-0044', performedBy: 'Abebe Kebede' },
    { date: '2026-05-22T09:00:00.000Z', type: 'Out', quantity: 600, reference: 'SIV-2026-0083', performedBy: 'Girma Wolde' },
    { date: '2026-05-18T10:00:00.000Z', type: 'In', quantity: 800, reference: 'GRN-2026-0039', performedBy: 'Meron Lemma' },
    { date: '2026-05-14T08:00:00.000Z', type: 'Out', quantity: 400, reference: 'SIV-2026-0074', performedBy: 'Sara Kedir' },
  ],
  'item-m06': [
    { date: '2026-05-26T14:00:00.000Z', type: 'In', quantity: 400, reference: 'GRN-2026-0046', performedBy: 'Tigist Haile' },
    { date: '2026-05-23T10:00:00.000Z', type: 'Out', quantity: 250, reference: 'SIV-2026-0084', performedBy: 'Lemma Tesfaye' },
  ],
  'item-m07': [
    { date: '2026-05-24T09:00:00.000Z', type: 'In', quantity: 600, reference: 'GRN-2026-0042', performedBy: 'Girma Wolde' },
    { date: '2026-05-21T11:00:00.000Z', type: 'Out', quantity: 350, reference: 'SIV-2026-0081', performedBy: 'Meron Lemma' },
    { date: '2026-05-17T08:00:00.000Z', type: 'In', quantity: 700, reference: 'GRN-2026-0036', performedBy: 'Abebe Kebede' },
  ],
  'item-m08': [
    { date: '2026-05-25T10:00:00.000Z', type: 'In', quantity: 100, reference: 'GRN-2026-0043', performedBy: 'Sara Kedir' },
    { date: '2026-05-22T14:00:00.000Z', type: 'Out', quantity: 60, reference: 'SIV-2026-0086', performedBy: 'Tigist Haile' },
    { date: '2026-05-18T09:00:00.000Z', type: 'In', quantity: 120, reference: 'GRN-2026-0038', performedBy: 'Lemma Tesfaye' },
  ],
  'item-m09': [
    { date: '2026-05-24T11:00:00.000Z', type: 'In', quantity: 200, reference: 'GRN-2026-0040', performedBy: 'Lemma Tesfaye' },
    { date: '2026-05-21T09:00:00.000Z', type: 'Out', quantity: 80, reference: 'SIV-2026-0081', performedBy: 'Meron Lemma' },
  ],
};

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function createMockMovements(): StockMovementDto[] {
  const now = new Date();
  const tod = now.toISOString();
  const yesterday = addDays(now, -1).toISOString();
  const d2 = addDays(now, -2).toISOString();
  const d3 = addDays(now, -3).toISOString();
  const d4 = addDays(now, -4).toISOString();
  return [
    { id: 'mov-t01', itemId: 'item-m01', itemName: 'Teff - White', sku: 'GRA-TEF-WH-001', shelfId: 'sh-m01', shelfLocation: 'Silo-A-01', movementType: 'GRN', quantity: 500, previousStock: 2000, newStock: 2500, referenceNumber: 'GRN-2026-0045', referenceType: 'GRN', movementDate: tod, performedBy: 'Abebe Kebede' },
    { id: 'mov-t02', itemId: 'item-m02', itemName: 'Coffee - Arabica', sku: 'CRP-COF-AR-002', shelfId: 'sh-m02', shelfLocation: 'Cold-A-02', movementType: 'SIV', quantity: -200, previousStock: 2000, newStock: 1800, referenceNumber: 'SIV-2026-0090', referenceType: 'SIV', movementDate: tod, performedBy: 'Sara Kedir' },
    { id: 'mov-t03', itemId: 'item-m03', itemName: 'Maize - Yellow', sku: 'GRA-MAI-YL-003', shelfId: 'sh-m03', shelfLocation: 'Silo-B-02', movementType: 'GRN', quantity: 1000, previousStock: 2200, newStock: 3200, referenceNumber: 'GRN-2026-0042', referenceType: 'GRN', movementDate: yesterday, performedBy: 'Girma Wolde' },
    { id: 'mov-t04', itemId: 'item-m08', itemName: 'Honey - Pure', sku: 'FOD-HON-PR-008', shelfId: 'sh-m08', shelfLocation: 'Dry-B-01', movementType: 'SIV', quantity: -60, previousStock: 410, newStock: 350, referenceNumber: 'SIV-2026-0089', referenceType: 'SIV', movementDate: tod, performedBy: 'Tigist Haile' },
    { id: 'mov-t05', itemId: 'item-m11', itemName: 'Haricot Beans', sku: 'GRA-HBN-RD-011', shelfId: 'sh-m11', shelfLocation: 'Silo-B-04', movementType: 'GRN', quantity: 300, previousStock: 900, newStock: 1200, referenceNumber: 'GRN-2026-0046', referenceType: 'GRN', movementDate: tod, performedBy: 'Lemma Tesfaye' },
    { id: 'mov-t06', itemId: 'item-m05', itemName: 'Wheat - Hard Red', sku: 'GRA-WHT-HR-005', shelfId: 'sh-m05', shelfLocation: 'Silo-B-03', movementType: 'SIV', quantity: -600, previousStock: 4700, newStock: 4100, referenceNumber: 'SIV-2026-0088', referenceType: 'SIV', movementDate: yesterday, performedBy: 'Meron Lemma' },
    { id: 'mov-t07', itemId: 'item-m14', itemName: 'Pepper - Red Dry', sku: 'SPC-PPR-RD-014', shelfId: 'sh-m14', shelfLocation: 'Dry-A-07', movementType: 'GRN', quantity: 50, previousStock: 70, newStock: 120, referenceNumber: 'GRN-2026-0044', referenceType: 'GRN', movementDate: d2, performedBy: 'Sara Kedir' },
    { id: 'mov-t08', itemId: 'item-m09', itemName: 'Cotton - Raw', sku: 'TEX-COT-RW-009', shelfId: 'sh-m09', shelfLocation: 'Dry-B-02', movementType: 'SIV', quantity: -100, previousStock: 850, newStock: 750, referenceNumber: 'SIV-2026-0087', referenceType: 'SIV', movementDate: d3, performedBy: 'Abebe Kebede' },
    { id: 'mov-t09', itemId: 'item-m06', itemName: 'Barley - Food Grade', sku: 'GRA-BAR-FG-006', shelfId: 'sh-m06', shelfLocation: 'Silo-A-04', movementType: 'GRN', quantity: 400, previousStock: 1200, newStock: 1600, referenceNumber: 'GRN-2026-0041', referenceType: 'GRN', movementDate: d2, performedBy: 'Girma Wolde' },
    { id: 'mov-t10', itemId: 'item-m12', itemName: 'Sunflower Oil', sku: 'OIL-SUN-RF-012', shelfId: 'sh-m12', shelfLocation: 'Cold-B-01', movementType: 'SIV', quantity: -50, previousStock: 650, newStock: 600, referenceNumber: 'SIV-2026-0086', referenceType: 'SIV', movementDate: d4, performedBy: 'Tigist Haile' },
  ];
}

function getItemStatus(currentStock: number, minThreshold: number, maxThreshold: number): { status: string; statusClass: string } {
  if (minThreshold > 0 && currentStock <= minThreshold) return { status: 'Low Stock', statusClass: 'low-stock' };
  if (currentStock === 0) return { status: 'Out of Stock', statusClass: 'out-of-stock' };
  if (maxThreshold > 0 && currentStock >= maxThreshold) return { status: 'Overstocked', statusClass: 'overstocked' };
  return { status: 'In Stock', statusClass: 'in-stock' };
}

@Component({
  selector: 'app-stock-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-overview.component.html',
  styleUrls: ['./stock-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockOverviewComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  loading = signal(false);
  loadError = signal<string | null>(null);
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  searchQuery = signal('');
  currentPage = signal(1);
  rowsPerPage = signal(10);
  showDetailModal = signal(false);
  selectedItem = signal<StockDisplayRow | null>(null);
  showExportDropdown = signal(false);

  private allItems = signal<InventoryStockDto[]>([]);
  private movements = signal<StockMovementDto[]>([]);
  private usedMock = signal(false);

  selectedHistory = signal<StockHistoryEntry[]>([]);

  displayRows = computed<StockDisplayRow[]>(() => {
    return this.allItems().map(item => this.toDisplayRow(item));
  });

  summaryStats = computed<SummaryStats>(() => {
    const items = this.allItems();
    const movs = this.movements();
    const totalItems = items.reduce((s, i) => s + (Number(i.currentStock) || 0), 0);
    const totalStockValue = items.reduce((s, i) => s + (Number(i.currentStock) || 0) * 15, 0);
    const lowStockItems = items.filter(i => {
      const min = Number(i.minimumThreshold) || 0;
      const q = Number(i.currentStock) || 0;
      return min > 0 && q <= min;
    }).length;

    const today = toYmd(new Date());
    let inflowToday = 0;
    let outflowToday = 0;

    for (const m of movs) {
      if (m.movementDate && m.movementDate.startsWith(today)) {
        const q = Number(m.quantity) || 0;
        const type = this.classifyMovement(m);
        if (type === 'in') inflowToday += Math.abs(q);
        else if (type === 'out') outflowToday += Math.abs(q);
      }
    }

    return { totalItems, totalStockValue, lowStockItems, inflowToday, outflowToday, netChange: inflowToday - outflowToday };
  });

  monthlyTrend = computed<MonthlyTrendPoint[]>(() => {
    const movs = this.movements();
    if (movs.length === 0 || this.usedMock()) {
      const maxVal = Math.max(...MOCK_MONTHLY.totals, 1);
      return MOCK_MONTHLY.months.map((month, i) => ({
        month,
        total: MOCK_MONTHLY.totals[i],
        inflow: MOCK_MONTHLY.inflows[i],
        outflow: MOCK_MONTHLY.outflows[i],
        barHeight: (MOCK_MONTHLY.totals[i] / maxVal) * 100,
      }));
    }
    const monthlyMap = new Map<string, { total: number; inflow: number; outflow: number }>();
    for (const m of movs) {
      if (!m.movementDate) continue;
      const monthKey = m.movementDate.slice(0, 7);
      if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { total: 0, inflow: 0, outflow: 0 });
      const entry = monthlyMap.get(monthKey)!;
      const q = Number(m.quantity) || 0;
      entry.total += Math.abs(q);
      const type = this.classifyMovement(m);
      if (type === 'in') entry.inflow += Math.abs(q);
      else if (type === 'out') entry.outflow += Math.abs(q);
    }
    const sortedKeys = [...monthlyMap.keys()].sort();
    const maxVal = Math.max(...sortedKeys.map(k => monthlyMap.get(k)!.total), 1);
    return sortedKeys.map(key => {
      const entry = monthlyMap.get(key)!;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(key.slice(5, 7), 10) - 1;
      return {
        month: months[monthIndex] || key,
        total: entry.total,
        inflow: entry.inflow,
        outflow: entry.outflow,
        barHeight: (entry.total / maxVal) * 100,
      };
    });
  });

  categoryDistribution = computed<CategoryDistItem[]>(() => {
    const cmap = new Map<string, number>();
    for (const r of this.allItems()) {
      const cat = r.unitOfMeasure || 'Units';
      cmap.set(cat, (cmap.get(cat) || 0) + (Number(r.currentStock) || 0));
    }
    const maxC = Math.max(...[...cmap.values()], 1);
    return [...cmap.entries()]
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / maxC) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });

  topItems = computed<TopStockItem[]>(() => {
    const items = this.allItems();
    const maxStock = Math.max(...items.map(i => Number(i.currentStock) || 0), 1);
    return [...items]
      .sort((a, b) => (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0))
      .slice(0, 10)
      .map((item, i) => ({
        rank: i + 1,
        name: item.itemName || '\u2014',
        sku: item.sku || '\u2014',
        stock: Number(item.currentStock) || 0,
        barWidth: Math.round(((Number(item.currentStock) || 0) / maxStock) * 100),
      }));
  });

  filteredItems = computed<StockDisplayRow[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.displayRows();
    return this.displayRows().filter(item =>
      item.itemName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.warehouse.toLowerCase().includes(q)
    );
  });

  pagedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredItems().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredItems().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const count = this.filteredItems().length;
    if (count === 0) return { start: 0, end: 0, total: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    return { start, end: Math.min(this.currentPage() * this.rowsPerPage(), count), total: count };
  });

  isUsingMock = computed(() => this.usedMock());

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const today = new Date();
    const startMonth = toYmd(addDays(today, -60));
    const end = toYmd(today);

    forkJoin({
      overview: this.inventory.getStockOverview({ pageSize: 10000 }),
      movements: this.inventory.getStockMovements({ dateFrom: startMonth, dateTo: end, pageSize: 2000 }),
    }).subscribe({
      next: ({ overview, movements }) => {
        this.loading.set(false);
        if (overview.success !== false && Array.isArray(overview.data) && overview.data.length > 0) {
          this.allItems.set(overview.data);
          this.usedMock.set(false);
          this.loadError.set(null);
        } else {
          this.allItems.set(MOCK_ITEMS);
          this.usedMock.set(true);
        }
        if (movements.success !== false && Array.isArray(movements.data)) {
          this.movements.set(movements.data);
        } else {
          this.movements.set(createMockMovements());
        }
        if (this.usedMock()) {
          this.movements.set(createMockMovements());
        }
        const msg = this.usedMock() ? 'Using sample data (API unavailable)' : 'Data loaded successfully';
        this.notification.set({ type: 'success', message: msg });
        this.autoDismiss();
      },
      error: () => {
        this.loading.set(false);
        this.allItems.set(MOCK_ITEMS);
        this.movements.set(createMockMovements());
        this.usedMock.set(true);
        this.notification.set({ type: 'success', message: 'Using sample data (API unavailable)' });
        this.autoDismiss();
      },
    });
  }

  private autoDismiss(): void {
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void {
    this.notification.set(null);
  }

  private toDisplayRow(item: InventoryStockDto): StockDisplayRow {
    const currentStock = Number(item.currentStock) || 0;
    const reserved = Number(item.reservedStock) || 0;
    const available = Number(item.availableStock) || 0;
    const minThreshold = Number(item.minimumThreshold) || 0;
    const maxThreshold = Number(item.maximumThreshold) || 0;
    const { status, statusClass } = getItemStatus(currentStock, minThreshold, maxThreshold);
    return {
      id: item.id,
      itemName: item.itemName || '\u2014',
      sku: item.sku || '\u2014',
      warehouse: item.warehouseName || '\u2014',
      currentStock, reserved, available, minThreshold, maxThreshold,
      unit: item.unitOfMeasure || 'Units',
      status, statusClass,
      lastUpdated: item.lastUpdated,
      itemId: item.itemId,
    };
  }

  selId(): string { return this.selectedItem()?.id ?? ''; }
  selName(): string { return this.selectedItem()?.itemName ?? ''; }
  selSku(): string { return this.selectedItem()?.sku ?? ''; }
  selWarehouse(): string { return this.selectedItem()?.warehouse ?? ''; }
  selCurrentStock(): number { return this.selectedItem()?.currentStock ?? 0; }
  selReserved(): number { return this.selectedItem()?.reserved ?? 0; }
  selAvailable(): number { return this.selectedItem()?.available ?? 0; }
  selMinThreshold(): number { return this.selectedItem()?.minThreshold ?? 0; }
  selMaxThreshold(): number { return this.selectedItem()?.maxThreshold ?? 0; }
  selUnit(): string { return this.selectedItem()?.unit ?? ''; }
  selStatus(): string { return this.selectedItem()?.status ?? ''; }
  selStatusClass(): string { return this.selectedItem()?.statusClass ?? ''; }
  selLastUpdated(): string { return this.selectedItem()?.lastUpdated ?? ''; }

  openDetailModal(row: StockDisplayRow): void {
    this.selectedItem.set(row);
    const history = MOCK_HISTORY[row.itemId];
    this.selectedHistory.set(history ?? []);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedItem.set(null);
    this.selectedHistory.set([]);
  }

  onSearch(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  onRowsPerPageChange(e: Event): void {
    this.rowsPerPage.set(+(e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return String(value);
  }

  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
    return '$' + String(value);
  }

  formatDate(iso: string): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getStatusIcon(): string {
    const status = this.selectedItem()?.status;
    if (status === 'In Stock') return 'bi-check-circle-fill';
    if (status === 'Low Stock') return 'bi-exclamation-triangle-fill';
    if (status === 'Out of Stock') return 'bi-x-circle-fill';
    if (status === 'Overstocked') return 'bi-exclamation-diamond-fill';
    return 'bi-question-circle';
  }

  getHistoryIcon(type: string): string {
    if (type === 'In') return 'bi-arrow-down-circle text-green';
    if (type === 'Out') return 'bi-arrow-up-circle text-orange';
    return 'bi-arrow-left-right text-blue';
  }

  getHistoryColor(type: string): string {
    if (type === 'In') return '#10b981';
    if (type === 'Out') return '#f59e0b';
    return '#3b82f6';
  }

  getHistoryQuantity(type: string, qty: number): string {
    if (type === 'In') return '+' + String(qty);
    if (type === 'Out') return '-' + String(qty);
    return String(qty);
  }

  private classifyMovement(d: StockMovementDto): 'in' | 'out' | 'other' {
    const u = (d.movementType + ' ' + d.referenceType).toUpperCase();
    if (u.includes('TRANSFER')) return 'other';
    if (u.includes('IN') || u.includes('RECEIV') || u.includes('GRN')) return 'in';
    if (u.includes('OUT') || u.includes('ISSUE') || u.includes('SIV')) return 'out';
    const q = Number(d.quantity) || 0;
    if (q > 0) return 'in';
    if (q < 0) return 'out';
    return 'other';
  }

  exportCSV(): void {
    this.showExportDropdown.set(false);
    const rows = this.filteredItems();
    if (!rows.length) return;

    const header = ['Item Name', 'SKU', 'Warehouse', 'Current Stock', 'Reserved', 'Available', 'Min Threshold', 'Max Threshold', 'Status', 'Last Updated'];
    const lines = rows.map(r => [
      '"' + r.itemName + '"',
      r.sku,
      '"' + r.warehouse + '"',
      String(r.currentStock),
      String(r.reserved),
      String(r.available),
      String(r.minThreshold),
      String(r.maxThreshold),
      r.status,
      this.formatDate(r.lastUpdated),
    ].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-overview-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
