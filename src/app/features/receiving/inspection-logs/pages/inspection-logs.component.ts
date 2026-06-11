import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InspectionsService, InspectionDto } from '../../../../core/services/inspections.service';

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

const WEEK_LABELS: string[] = [];

@Component({
  selector: 'app-inspection-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-logs.component.html',
  styleUrls: ['./inspection-logs.component.scss'],
})
export class InspectionLogsComponent implements OnInit {
  private readonly inspectionsService = inject(InspectionsService);

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
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inspectionsService.getAll().subscribe({
      next: (res) => {
        if (res.success !== false && Array.isArray(res.data?.items) && res.data.items.length > 0) {
          this.allLogs.set(this.mapToInspectionLogs(res.data.items));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private mapToInspectionLogs(dtos: InspectionDto[]): InspectionLog[] {
    return dtos.map(dto => {
      const firstItem = dto.items?.[0];
      return {
        id: dto.id,
        date: dto.inspectionDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        grnNumber: dto.grnNumber ?? '',
        itemName: firstItem?.itemName ?? 'Unknown Item',
        inspectorName: dto.inspectorName ?? 'Unknown',
        result: dto.isPassed ? 'Pass' : 'Fail',
        details: firstItem?.remarks ?? '',
        checklist: {
          packaging: true,
          physicalCondition: true,
          serialNumbers: true,
          accessories: true,
          powerOnTest: true,
        },
        comments: firstItem?.remarks ?? '',
        disposition: dto.deviationNotes ?? '',
        supplierName: dto.inspectorName ?? 'Unknown',
      };
    });
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
