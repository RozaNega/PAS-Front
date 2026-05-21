import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InspectionService, InspectionDto } from '../../inspections/services/inspection.service';

interface InspectionLog {
  id: string;
  date: string;
  grnNumber: string;
  item: string;
  inspector: string;
  result: 'Pass' | 'Fail' | 'Partial';
}

@Component({
  selector: 'app-inspection-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-logs.component.html',
  styleUrls: ['./inspection-logs.component.scss'],
})
export class InspectionLogsComponent implements OnInit {
  private readonly inspections = inject(InspectionService);

  searchTerm = signal('');
  dateRange = { start: '', end: '' };
  resultFilter = signal('All');
  inspectorFilter = signal('All Inspectors');

  readonly results = ['All', 'Pass', 'Fail', 'Partial'];

  allLogs = signal<InspectionLog[]>([]);
  inspectors = signal<string[]>(['All Inspectors']);
  loading = signal(false);
  error = signal<string | null>(null);

  summary = computed(() => {
    const logs = this.allLogs();
    const n = logs.length || 1;
    const pass = logs.filter((l) => l.result === 'Pass').length;
    const fail = logs.filter((l) => l.result === 'Fail').length;
    const partial = logs.filter((l) => l.result === 'Partial').length;
    return {
      totalInspections: logs.length,
      passRate: Math.round((pass / n) * 100),
      failRate: Math.round((fail / n) * 100),
      partialRate: Math.round((partial / n) * 100),
      avgTime: 12,
    };
  });

  barHeightsPass = signal<number[]>([]);
  barHeightsFail = signal<number[]>([]);
  barHeightsPartial = signal<number[]>([]);

  showModal = signal(false);
  selectedLog = signal<InspectionLog | null>(null);

  filteredLogs = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const result = this.resultFilter();
    const inspector = this.inspectorFilter();
    return this.allLogs().filter((log) => {
      const matchesSearch =
        !search ||
        log.grnNumber.toLowerCase().includes(search) ||
        log.item.toLowerCase().includes(search);
      const matchesResult = result === 'All' || log.result === result;
      const matchesInspector = inspector === 'All Inspectors' || log.inspector === inspector;
      return matchesSearch && matchesResult && matchesInspector;
    });
  });

  ngOnInit(): void {
    const passHeights: number[] = [];
    const failHeights: number[] = [];
    const partialHeights: number[] = [];
    for (let i = 0; i < 8; i++) {
      passHeights.push(this.getRandomHeight(70, 20));
      failHeights.push(this.getRandomHeight(15, 10));
      partialHeights.push(this.getRandomHeight(15, 10));
    }
    this.barHeightsPass.set(passHeights);
    this.barHeightsFail.set(failHeights);
    this.barHeightsPartial.set(partialHeights);
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inspections.getAll().subscribe({
      next: (res) => {
        const rows = res.success !== false && Array.isArray(res.data) ? res.data : [];
        const logs = this.flattenInspections(rows);
        this.allLogs.set(logs);
        const names = new Set<string>();
        logs.forEach((l) => names.add(l.inspector));
        this.inspectors.set(['All Inspectors', ...[...names].sort()]);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Failed to load inspection logs');
        this.allLogs.set([]);
        this.loading.set(false);
      },
    });
  }

  private flattenInspections(rows: InspectionDto[]): InspectionLog[] {
    const out: InspectionLog[] = [];
    let seq = 0;
    for (const row of rows) {
      const grn = row.receivingNoteId || row.id;
      const date = row.inspectionDate ? new Date(row.inspectionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
      const inspector = row.inspectedBy || '—';
      const items = Array.isArray(row.items) ? row.items : [];
      if (!items.length) {
        out.push({
          id: `${row.id}-${seq++}`,
          date,
          grnNumber: String(grn),
          item: row.notes || 'Inspection',
          inspector,
          result: this.mapResult(row.status),
        });
        continue;
      }
      items.forEach((it: unknown, idx: number) => {
        const o = (it ?? {}) as Record<string, unknown>;
        const name = String(o['name'] ?? o['itemName'] ?? `Line ${idx + 1}`);
        const r = String(o['overallResult'] ?? o['result'] ?? row.status ?? 'Pass');
        out.push({
          id: `${row.id}-${idx}`,
          date,
          grnNumber: String(grn),
          item: name,
          inspector,
          result: this.mapResult(r),
        });
      });
    }
    return out;
  }

  private mapResult(s: string | undefined): InspectionLog['result'] {
    const v = (s || '').toLowerCase();
    if (v.includes('fail') || v.includes('reject')) return 'Fail';
    if (v.includes('partial')) return 'Partial';
    return 'Pass';
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onResultFilterChange(value: string): void {
    this.resultFilter.set(value);
  }

  onInspectorFilterChange(value: string): void {
    this.inspectorFilter.set(value);
  }

  exportData(): void {
    const rows = this.filteredLogs();
    const header = ['Date', 'GRN / Note', 'Item', 'Inspector', 'Result'];
    const csv = [header.join(',')].concat(
      rows.map((l) =>
        [l.date, l.grnNumber, `"${l.item.replace(/"/g, '""')}"`, `"${l.inspector.replace(/"/g, '""')}"`, l.result].join(','),
      ),
    );
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inspection-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  openDetailsModal(log: InspectionLog): void {
    this.selectedLog.set(log);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedLog.set(null);
  }

  printReport(): void {
    window.print();
  }

  getResultColor(result: string): string {
    const colors: Record<string, string> = { Pass: 'green', Fail: 'red', Partial: 'yellow' };
    return colors[result] || 'gray';
  }

  getResultIcon(result: string): string {
    const icons: Record<string, string> = { Pass: '🟢', Fail: '🔴', Partial: '🟡' };
    return icons[result] || '⚪';
  }

  getRandomHeight(base: number, variance: number): number {
    return base + Math.random() * variance;
  }
}
