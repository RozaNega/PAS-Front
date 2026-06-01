import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface InspectionChecklist {
  packaging: boolean;
  physicalCondition: boolean;
  serialNumbers: boolean;
  accessories: boolean;
  powerOnTest: boolean;
}

interface InspectionLog {
  id: string;
  date: string;
  grnNumber: string;
  itemName: string;
  inspectorName: string;
  result: 'Pass' | 'Fail' | 'Partial';
  details: string;
  checklist: InspectionChecklist;
  comments: string;
  disposition: string;
  supplierName: string;
}

const MOCK_LOGS: InspectionLog[] = [
  { id: 'INSP-001', date: '2026-05-29', grnNumber: 'GRN-2405-001', itemName: 'Laptop Dell Latitude 5540', inspectorName: 'James Kariuki', result: 'Pass', details: 'All 25 units passed inspection', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'All units meet specification', disposition: 'Released to stock', supplierName: 'Tech Supplies Ltd' },
  { id: 'INSP-002', date: '2026-05-28', grnNumber: 'GRN-2405-002', itemName: 'HP LaserJet Printer', inspectorName: 'Grace Wanjiku', result: 'Fail', details: '3 of 10 units have paper feed issues', checklist: { packaging: true, physicalCondition: false, serialNumbers: true, accessories: true, powerOnTest: false }, comments: 'Paper tray misaligned on 3 units, power test failed on 1 unit', disposition: '3 units quarantined, 1 unit returned to supplier', supplierName: 'Office Solutions Ltd' },
  { id: 'INSP-003', date: '2026-05-27', grnNumber: 'GRN-2405-003', itemName: 'Server Rack Cabinet', inspectorName: 'Peter Otieno', result: 'Pass', details: 'All items verified against PO', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Heavy items - forklift used for unloading', disposition: 'Released to data center', supplierName: 'DataServ Ltd' },
  { id: 'INSP-004', date: '2026-05-26', grnNumber: 'GRN-2405-004', itemName: 'Network Switch 48-Port', inspectorName: 'James Kariuki', result: 'Partial', details: 'Cable management kit missing from 5 units', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: false, powerOnTest: true }, comments: 'Cable management brackets not included in packaging', disposition: '5 units held - supplier to provide missing accessories', supplierName: 'NetPro Systems' },
  { id: 'INSP-005', date: '2026-05-25', grnNumber: 'GRN-2405-005', itemName: 'External Hard Drive 2TB', inspectorName: 'Grace Wanjiku', result: 'Pass', details: '50 units all functional', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Batch testing completed successfully', disposition: 'Released to stores', supplierName: 'Tech Supplies Ltd' },
  { id: 'INSP-006', date: '2026-05-24', grnNumber: 'GRN-2405-006', itemName: 'Monitor 27" 4K', inspectorName: 'John Mwangi', result: 'Fail', details: '2 units have dead pixels', checklist: { packaging: true, physicalCondition: false, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Dead pixels on left side of screen on 2 units', disposition: '2 units returned - warranty claim filed', supplierName: 'ViewTech Displays' },
  { id: 'INSP-007', date: '2026-05-23', grnNumber: 'GRN-2405-007', itemName: 'UPS Battery Backup 1500VA', inspectorName: 'Peter Otieno', result: 'Pass', details: '20 units all passed load test', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Battery charge levels verified', disposition: 'Released to IT stores', supplierName: 'PowerGuard Ltd' },
  { id: 'INSP-008', date: '2026-05-22', grnNumber: 'GRN-2405-008', itemName: 'Cat6 Ethernet Cable 10m', inspectorName: 'James Kariuki', result: 'Partial', details: '15 boxes received, 2 boxes have incorrect colour', checklist: { packaging: true, physicalCondition: true, serialNumbers: false, accessories: false, powerOnTest: true }, comments: 'Colour mismatch - blue instead of grey', disposition: '2 boxes quarantined for return', supplierName: 'NetPro Systems' },
  { id: 'INSP-009', date: '2026-05-21', grnNumber: 'GRN-2405-009', itemName: 'Keyboard & Mouse Combo', inspectorName: 'Grace Wanjiku', result: 'Pass', details: '100 units all functional', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Sample testing of 20 units all passed', disposition: 'Released to general stores', supplierName: 'Office Solutions Ltd' },
  { id: 'INSP-010', date: '2026-05-20', grnNumber: 'GRN-2405-010', itemName: 'Webcam 1080p', inspectorName: 'John Mwangi', result: 'Fail', details: '8 units have microphone issues', checklist: { packaging: true, physicalCondition: true, serialNumbers: false, accessories: true, powerOnTest: false }, comments: 'Microphone not detected on 8 units, serial numbers missing on packaging', disposition: '8 units returned, supplier notified', supplierName: 'Tech Supplies Ltd' },
  { id: 'INSP-011', date: '2026-05-19', grnNumber: 'GRN-2405-011', itemName: 'Wireless Access Point', inspectorName: 'Peter Otieno', result: 'Pass', details: '30 units all configured and tested', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Firmware updated before acceptance', disposition: 'Released to network team', supplierName: 'NetPro Systems' },
  { id: 'INSP-012', date: '2026-05-18', grnNumber: 'GRN-2405-012', itemName: 'Desk Mount Dual Monitor Arm', inspectorName: 'James Kariuki', result: 'Partial', details: 'Missing VESA mount screws in 10 units', checklist: { packaging: true, physicalCondition: true, serialNumbers: false, accessories: false, powerOnTest: false }, comments: 'Screw packets not included in boxes', disposition: 'Supplier sending replacement screws', supplierName: 'Office Solutions Ltd' },
  { id: 'INSP-013', date: '2026-05-17', grnNumber: 'GRN-2405-013', itemName: 'USB-C Hub Multiport', inspectorName: 'Grace Wanjiku', result: 'Pass', details: '40 units all tested OK', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'HDMI and USB ports verified', disposition: 'Released to stores', supplierName: 'Tech Supplies Ltd' },
  { id: 'INSP-014', date: '2026-05-16', grnNumber: 'GRN-2405-014', itemName: 'Smartboard Interactive Display', inspectorName: 'John Mwangi', result: 'Fail', details: 'Touch calibration off on 1 unit, dead pixels on another', checklist: { packaging: true, physicalCondition: false, serialNumbers: true, accessories: true, powerOnTest: false }, comments: 'Calibration software needs update, panel defect on unit 2', disposition: '1 unit returned, 1 unit held for technician review', supplierName: 'ViewTech Displays' },
  { id: 'INSP-015', date: '2026-05-15', grnNumber: 'GRN-2405-015', itemName: 'Laptop Docking Station', inspectorName: 'Peter Otieno', result: 'Pass', details: '35 units all passed connectivity test', checklist: { packaging: true, physicalCondition: true, serialNumbers: true, accessories: true, powerOnTest: true }, comments: 'Dual monitor output verified on each unit', disposition: 'Released to IT equipment store', supplierName: 'DataServ Ltd' },
];

const WEEK_LABELS = ['May 4', 'May 11', 'May 18', 'May 25', 'Jun 1', 'Jun 8', 'Jun 15', 'Jun 22'];

const CHART_PASS = [18, 22, 15, 25, 20, 28, 24, 30];
const CHART_FAIL = [4, 3, 6, 2, 5, 1, 3, 2];
const CHART_PARTIAL = [3, 5, 2, 4, 3, 6, 2, 4];

@Component({
  selector: 'app-inspection-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-logs.component.html',
  styleUrls: ['./inspection-logs.component.scss'],
})
export class InspectionLogsComponent implements OnInit {
  searchTerm = signal('');
  dateStart = signal('');
  dateEnd = signal('');
  resultFilter = signal('All');
  inspectorFilter = signal('All Inspectors');
  currentPage = signal(1);
  rowsPerPage = signal(10);

  readonly results = ['All', 'Pass', 'Fail', 'Partial'];
  readonly rowsOptions = [10, 20, 50];
  readonly weekLabels = WEEK_LABELS;

  allLogs = signal<InspectionLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  useMockData = signal(false);

  chartPass = signal<number[]>([]);
  chartFail = signal<number[]>([]);
  chartPartial = signal<number[]>([]);

  showDetailModal = signal(false);
  selectedLog = signal<InspectionLog | null>(null);

  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  inspectors = computed(() => {
    const names = new Set(this.allLogs().map(l => l.inspectorName));
    return ['All Inspectors', ...[...names].sort()];
  });

  summaryStats = computed(() => {
    const logs = this.allLogs();
    const total = logs.length || 1;
    const pass = logs.filter(l => l.result === 'Pass').length;
    const fail = logs.filter(l => l.result === 'Fail').length;
    const partial = logs.filter(l => l.result === 'Partial').length;
    return {
      totalInspections: logs.length,
      passCount: pass,
      failCount: fail,
      partialCount: partial,
      passRate: Math.round((pass / total) * 100),
      failRate: Math.round((fail / total) * 100),
      partialRate: Math.round((partial / total) * 100),
    };
  });

  maxChartValue = computed(() => {
    const all = [...this.chartPass(), ...this.chartFail(), ...this.chartPartial()];
    return Math.max(...all, 1);
  });

  filteredLogs = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const result = this.resultFilter();
    const inspector = this.inspectorFilter();
    const start = this.dateStart();
    const end = this.dateEnd();

    return this.allLogs().filter(log => {
      const matchesSearch = !search ||
        log.grnNumber.toLowerCase().includes(search) ||
        log.itemName.toLowerCase().includes(search) ||
        log.inspectorName.toLowerCase().includes(search);
      const matchesResult = result === 'All' || log.result === result;
      const matchesInspector = inspector === 'All Inspectors' || log.inspectorName === inspector;
      const matchesDate = (!start || log.date >= start) && (!end || log.date <= end);
      return matchesSearch && matchesResult && matchesInspector && matchesDate;
    });
  });

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.rowsPerPage();
    return this.filteredLogs().slice(start, start + this.rowsPerPage());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLogs().length / this.rowsPerPage())));

  displayRange = computed(() => {
    const total = this.filteredLogs().length;
    if (total === 0) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.rowsPerPage() + 1;
    const end = Math.min(this.currentPage() * this.rowsPerPage(), total);
    return { start, end };
  });

  ngOnInit(): void {
    this.chartPass.set(CHART_PASS);
    this.chartFail.set(CHART_FAIL);
    this.chartPartial.set(CHART_PARTIAL);
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.allLogs.set(MOCK_LOGS);
      this.useMockData.set(true);
    } catch {
      this.error.set('Failed to load inspection logs');
    }
    this.loading.set(false);
  }

  onSearch(value: string): void { this.searchTerm.set(value); this.currentPage.set(1); }
  onResultFilter(value: string): void { this.resultFilter.set(value); this.currentPage.set(1); }
  onInspectorFilter(value: string): void { this.inspectorFilter.set(value); this.currentPage.set(1); }
  onDateStartChange(value: string): void { this.dateStart.set(value); this.currentPage.set(1); }
  onDateEndChange(value: string): void { this.dateEnd.set(value); this.currentPage.set(1); }
  onRowsPerPageChange(value: string): void { this.rowsPerPage.set(+value); this.currentPage.set(1); }

  resetFilters(): void {
    this.searchTerm.set('');
    this.dateStart.set('');
    this.dateEnd.set('');
    this.resultFilter.set('All');
    this.inspectorFilter.set('All Inspectors');
    this.currentPage.set(1);
  }

  goToPage(page: number): void { this.currentPage.set(page); }

  openDetailModal(log: InspectionLog): void {
    this.selectedLog.set(log);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedLog.set(null);
  }

  exportCSV(): void {
    const rows = this.filteredLogs();
    const header = ['Date', 'GRN#', 'Item', 'Inspector', 'Result', 'Supplier', 'Disposition'];
    const csv = [header.join(',')].concat(
      rows.map(l => [
        l.date,
        l.grnNumber,
        `"${l.itemName.replace(/"/g, '""')}"`,
        `"${l.inspectorName.replace(/"/g, '""')}"`,
        l.result,
        `"${l.supplierName.replace(/"/g, '""')}"`,
        `"${l.disposition.replace(/"/g, '""')}"`,
      ].join(','))
    );
    const blob = new Blob([csv.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inspection-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.notification.set({ type: 'success', message: 'CSV exported successfully' });
    setTimeout(() => this.notification.set(null), 4000);
  }

  dismissNotification(): void { this.notification.set(null); }
}
