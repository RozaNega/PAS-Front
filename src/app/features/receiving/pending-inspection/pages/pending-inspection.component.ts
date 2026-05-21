import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReceivingNoteService, ReceivingNoteDto } from '../../receiving-notes/services/receiving-note.service';
import { InspectionService } from '../../inspections/services/inspection.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface InspectionLine {
  name: string;
  received: number;
  batchNumber: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export interface InspectionChecklist {
  packagingIntact: boolean;
  physicalCondition: boolean;
  serialNumbersMatch: boolean;
  accessoriesIncluded: boolean;
  powerOnTest: boolean;
}

export interface PendingInspection {
  id: string;
  grnNumber: string;
  supplier: string;
  receivedDate: string;
  itemsToInspect: number;
  priority: 'High' | 'Medium' | 'Low';
  items: InspectionLine[];
}

@Component({
  selector: 'app-pending-inspection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pending-inspection.component.html',
  styleUrls: ['./pending-inspection.component.scss'],
})
export class PendingInspectionComponent implements OnInit {
  private readonly notes = inject(ReceivingNoteService);
  private readonly inspections = inject(InspectionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  searchTerm = signal('');
  sortBy = signal('Oldest');

  pendingInspections = signal<PendingInspection[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  filteredPending = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    return this.pendingInspections().filter(
      (p) =>
        !q ||
        p.grnNumber.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q),
    );
  });

  selectedIds = signal<Set<string>>(new Set());

  showModal = signal(false);
  selectedInspection = signal<PendingInspection | null>(null);

  inspectionDraft = {
    inspectorName: '',
    inspectionDate: '',
    results: [] as Array<
      InspectionLine & {
        checklist: InspectionChecklist;
        overallResult: string;
        comments: string;
      }
    >,
    disposition: 'Return to Supplier',
    comments: '',
  };

  ngOnInit(): void {
    this.refreshData();
    const u = this.auth.getCurrentUser();
    this.inspectionDraft.inspectorName = u?.fullName || u?.username || '';
  }

  refreshData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notes.getAll().subscribe({
      next: (res) => {
        const rows = (res.success !== false && Array.isArray(res.data) ? res.data : [])
          .map((n) => this.mapNoteToPending(n))
          .filter((x): x is PendingInspection => x !== null);
        this.pendingInspections.set(this.sortRows(rows));
        this.selectedIds.set(new Set());
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Failed to load pending inspections');
        this.pendingInspections.set([]);
        this.loading.set(false);
      },
    });
  }

  private sortRows(rows: PendingInspection[]): PendingInspection[] {
    const copy = [...rows];
    const sort = this.sortBy();
    if (sort === 'Newest') {
      copy.reverse();
    } else if (sort === 'Priority') {
      const rank = { High: 0, Medium: 1, Low: 2 };
      copy.sort((a, b) => rank[a.priority] - rank[b.priority]);
    }
    return copy;
  }

  onSortChange(): void {
    this.pendingInspections.set(this.sortRows([...this.pendingInspections()]));
  }

  private mapNoteToPending(note: ReceivingNoteDto): PendingInspection | null {
    const status = (note.status || '').toLowerCase();
    if (
      status.includes('pass') ||
      status.includes('approv') ||
      status.includes('complete') ||
      status.includes('released') ||
      status.includes('fail')
    ) {
      return null;
    }
    const lines: InspectionLine[] = (Array.isArray(note.items) ? note.items : []).map((it: unknown, i: number) => {
      const row = (it ?? {}) as Record<string, unknown>;
      return {
        name: String(row['itemName'] ?? row['name'] ?? row['description'] ?? `Item ${i + 1}`),
        received: Number(row['quantityReceived'] ?? row['received'] ?? row['quantity'] ?? 0),
        batchNumber: String(row['batchNumber'] ?? row['batch'] ?? '—'),
        status: 'Pending',
      };
    });
    if (!lines.length) {
      lines.push({
        name: 'All lines',
        received: note.totalQuantity ?? 0,
        batchNumber: '—',
        status: 'Pending',
      });
    }
    const priority: PendingInspection['priority'] =
      lines.length > 2 ? 'High' : lines.length > 1 ? 'Medium' : 'Low';
    return {
      id: note.id,
      grnNumber: note.noteNumber || note.grnNumber || `GRN-${note.id.slice(0, 8)}`,
      supplier: note.supplierName || '—',
      receivedDate: this.formatRelative(note.receivingDate),
      itemsToInspect: lines.length,
      priority,
      items: lines,
    };
  }

  private formatRelative(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  selectAll(checked: boolean): void {
    if (!checked) {
      this.selectedIds.set(new Set());
      return;
    }
    this.selectedIds.set(new Set(this.pendingInspections().map((p) => p.id)));
  }

  bulkInspect(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      alert('Select one or more GRNs first.');
      return;
    }
    const user = this.auth.getCurrentUser()?.username ?? this.auth.getCurrentUser()?.fullName ?? 'Inspector';
    const calls = ids.map((receivingNoteId) =>
      this.inspections.create({
        receivingNoteId,
        inspectedBy: user,
        inspectionDate: new Date().toISOString().split('T')[0],
        status: 'Completed',
        items: [],
        notes: 'Bulk inspection',
      }),
    );
    forkJoin(calls).subscribe({
      next: () => {
        alert('Bulk inspection records created.');
        this.refreshData();
      },
      error: (e) => alert(e?.error?.message || e?.message || 'Bulk inspect failed'),
    });
  }

  bulkRelease(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      alert('Select one or more GRNs first.');
      return;
    }
    forkJoin(ids.map((id) => this.notes.approve(id))).subscribe({
      next: () => {
        alert('Selected GRNs released to stock (approved).');
        this.refreshData();
      },
      error: (e) => alert(e?.error?.message || e?.message || 'Bulk release failed'),
    });
  }

  viewGrn(id: string): void {
    void this.router.navigate(['/admin/receiving/grn'], { queryParams: { id } });
  }

  returnOne(id: string): void {
    if (!confirm('Mark this GRN as returned to supplier?')) return;
    this.notes.returnToSupplier(id).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.refreshData();
        } else {
          alert(res.message || 'Return failed');
        }
      },
      error: (e) => alert(e?.error?.message || e?.message || 'Return failed'),
    });
  }

  openInspectionModal(inspection: PendingInspection): void {
    this.selectedInspection.set(inspection);
    this.inspectionDraft.inspectorName =
      this.auth.getCurrentUser()?.fullName || this.auth.getCurrentUser()?.username || 'Inspector';
    this.inspectionDraft.inspectionDate = new Date().toISOString().split('T')[0];
    this.inspectionDraft.results = inspection.items.map((item) => ({
      ...item,
      checklist: {
        packagingIntact: true,
        physicalCondition: true,
        serialNumbersMatch: true,
        accessoriesIncluded: true,
        powerOnTest: true,
      },
      overallResult: 'Pass',
      comments: '',
    }));
    this.inspectionDraft.disposition = 'Return to Supplier';
    this.inspectionDraft.comments = '';
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedInspection.set(null);
  }

  submitInspection(): void {
    const insp = this.selectedInspection();
    if (!insp) return;
    const form = this.inspectionDraft;
    const user = form.inspectorName || this.auth.getCurrentUser()?.username || 'Inspector';
    const payload = {
      receivingNoteId: insp.id,
      inspectedBy: user,
      inspectionDate: form.inspectionDate,
      status: 'Completed',
      notes: [form.comments, `Disposition: ${form.disposition}`].filter(Boolean).join(' | '),
      disposition: form.disposition,
      items: form.results.map((r) => ({
        name: r.name,
        received: r.received,
        batchNumber: r.batchNumber,
        overallResult: r.overallResult,
        comments: r.comments,
        checklist: r.checklist,
      })),
    };
    this.inspections.create(payload).subscribe({
      next: (res) => {
        if (res.success !== false) {
          this.closeModal();
          this.refreshData();
        } else {
          alert(res.message || 'Inspection save failed');
        }
      },
      error: (e) => alert(e?.error?.message || e?.message || 'Inspection save failed'),
    });
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = { High: 'red', Medium: 'yellow', Low: 'green' };
    return colors[priority] || 'gray';
  }

  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = { High: '🔴', Medium: '🟡', Low: '🟢' };
    return icons[priority] || '⚪';
  }
}
