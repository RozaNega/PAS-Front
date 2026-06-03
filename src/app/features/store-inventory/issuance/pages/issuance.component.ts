import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrossRoleService, FlowRequest, FlowSIV } from '../../../../core/services/cross-role.service';
import { ServiceRequestDetail, ServiceRequestItem } from '../../../requisition/service-requests/models/service-request.model';
import { CurrentUserService } from '../../../../core/services/current-user.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, PieChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

interface IssueItem {
  name: string;
  requested: number;
  available: number;
  location: string;
  status: string;
}

interface PendingIssue {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  requestedDate: string;
  waitingTime: string;
  waitingDays: number;
  priority: 'Urgent' | 'Medium' | 'Normal';
  requiredBy: string;
  items: IssueItem[];
}

interface SIVRecord {
  sivNumber: string;
  date: string;
  srNumber: string;
  requester: string;
  department: string;
  items: number;
  value: number;
}

interface TopItem {
  name: string;
  requests: number;
  value: number;
  percentage: number;
}

interface Requisition {
  id: string;
  srNumber: string;
  requester: string;
  department: string;
  priority: string;
  requiredBy: string;
}

interface SIVItem {
  srDetailId: string;
  name: string;
  sku: string;
  requested: number;
  approved: number;
  available: number;
  quantityToIssue: number;
  shelfLocation: string;
  shelfId?: string;
  notes: string;
}

interface SIV {
  sivNumber: string;
  date: string;
  requester: string;
  department: string;
  totalItems: number;
  totalValue: number;
}

@Component({
  selector: 'app-issuance',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './issuance.component.html',
  styleUrls: ['./issuance.component.scss'],
})
export class IssuanceComponent {
  todayDate = new Date().toLocaleDateString();
  activeTab = signal<'overview' | 'pending' | 'create' | 'history' | 'print'>('overview');

  // ── Shared Services ──
  private readonly crossRoleService = inject(CrossRoleService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);

  // ── Shared State ──
  isLoading = signal(false);
  errorMessage = signal('');

  // ══════════════════════════════════════════════════════════════
  //  OVERVIEW / CHARTS
  // ══════════════════════════════════════════════════════════════
  totalPending = computed(() => this.allIssues().length);
  urgentPending = computed(() => this.allIssues().filter(i => i.priority === 'Urgent').length);
  totalIssuedToday = signal(12);
  totalItemsIssuedOverall = signal(987);
  avgWaitDays = computed(() => {
    const items = this.allIssues();
    if (!items.length) return 0;
    return Math.round(items.reduce((s, i) => s + i.waitingDays, 0) / items.length);
  });

  issuanceTrend = signal([
    { week: 'W1', issued: 18 },
    { week: 'W2', issued: 24 },
    { week: 'W3', issued: 15 },
    { week: 'W4', issued: 30 },
    { week: 'W5', issued: 22 },
    { week: 'W6', issued: 28 },
    { week: 'W7', issued: 35 },
    { week: 'W8', issued: 20 },
  ]);

  statusBreakdown = computed(() => {
    const pending = this.urgentPending();
    const medium = this.allIssues().filter(i => i.priority === 'Medium').length;
    const normal = this.allIssues().filter(i => i.priority === 'Normal').length;
    return { urgent: pending, medium, normal };
  });

  get trendChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '5%', right: '5%', bottom: '8%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: this.issuanceTrend().map(w => w.week), axisLabel: { color: '#94a3b8', fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } } },
      series: [{
        type: 'bar', data: this.issuanceTrend().map(w => ({
          value: w.issued,
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#6366f1' }]) as any, borderRadius: [6, 6, 0, 0] }
        })),
        barWidth: '55%', animationDuration: 800, animationEasing: 'elasticOut'
      }]
    };
  }

  get statusChartOpts(): Record<string, unknown> {
    const s = this.statusBreakdown();
    const total = s.urgent + s.medium + s.normal || 1;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      graphic: [{
        type: 'text', left: 'center', top: 'center',
        style: { text: `${s.urgent}`, fill: '#1e293b', fontSize: 28, fontWeight: 800, fontFamily: 'Inter, sans-serif' }
      }],
      series: [{
        type: 'pie', radius: ['55%', '78%'], center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 11, lineHeight: 16, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        data: [
          { value: s.urgent, name: 'Urgent', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#dc2626' }]) as any } },
          { value: s.medium, name: 'Medium', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#d97706' }]) as any } },
          { value: s.normal, name: 'Normal', itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]) as any } },
        ]
      }]
    };
  }

  // ══════════════════════════════════════════════════════════════
  //  PENDING ISSUES
  // ══════════════════════════════════════════════════════════════
  searchTerm = signal('');
  priorityFilter = signal('All');
  departmentFilter = signal('All Departments');

  readonly priorities = ['All', 'Urgent', 'Medium', 'Normal'];
  readonly departments = ['All Departments', 'IT', 'HR', 'Finance', 'Operations', 'Marketing'];

  private readonly allIssues = signal<PendingIssue[]>([]);
  filteredIssues = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const priority = this.priorityFilter();
    const department = this.departmentFilter();

    return this.allIssues().filter(issue => {
      const matchSearch = !search || issue.srNumber.toLowerCase().includes(search) || issue.requester.toLowerCase().includes(search);
      const matchPriority = priority === 'All' || issue.priority === priority;
      const matchDept = department === 'All Departments' || issue.department === department;
      return matchSearch && matchPriority && matchDept;
    });
  });

  urgentIssues = computed(() => this.filteredIssues().filter(i => i.priority === 'Urgent'));
  mediumIssues = computed(() => this.filteredIssues().filter(i => i.priority === 'Medium'));
  normalIssues = computed(() => this.filteredIssues().filter(i => i.priority === 'Normal'));

  // Pending - Modals
  showProcessModal = signal(false);
  selectedIssue = signal<PendingIssue | null>(null);
  selectedIssueDetail = signal<ServiceRequestDetail | null>(null);
  isProcessing = signal(false);
  currentStep = signal(1);

  constructor() {
    this.loadPendingIssues();
    this.loadSIVs();
    this.loadHistorySIVs();
    this.loadPrintSIVs();
  }

  private loadPendingIssues(): void {
    this.isLoading.set(true);
    this.crossRoleService.getApprovedRequests().subscribe({
      next: (requests) => {
        this.allIssues.set(requests.map(r => this.mapToPendingIssue(r)));
        this.isLoading.set(false);
      },
      error: () => {
        this.allIssues.set(this.mockPendingIssues());
        this.isLoading.set(false);
      }
    });
  }

  private mockPendingIssues(): PendingIssue[] {
    return [
      { id: '1', srNumber: 'SR-2024-045', requester: 'John Doe', department: 'IT', requestedDate: 'Dec 14, 2024', waitingTime: '2d 4h', waitingDays: 2, priority: 'Urgent', requiredBy: 'Dec 18, 2024', items: [{ name: 'Dell Laptop', requested: 3, available: 10, location: 'A-R01', status: 'Available' }] },
      { id: '2', srNumber: 'SR-2024-046', requester: 'Sarah Smith', department: 'HR', requestedDate: 'Dec 13, 2024', waitingTime: '1d 2h', waitingDays: 1, priority: 'Medium', requiredBy: 'Dec 20, 2024', items: [{ name: 'Office Chair', requested: 5, available: 12, location: 'B-R02', status: 'Available' }] },
      { id: '3', srNumber: 'SR-2024-047', requester: 'Mike Wilson', department: 'Finance', requestedDate: 'Dec 15, 2024', waitingTime: '3d 6h', waitingDays: 3, priority: 'Normal', requiredBy: 'Dec 22, 2024', items: [{ name: 'A4 Paper', requested: 20, available: 50, location: 'C-R03', status: 'Available' }] },
      { id: '4', srNumber: 'SR-2024-048', requester: 'Emily Davis', department: 'Operations', requestedDate: 'Dec 14, 2024', waitingTime: '2d 0h', waitingDays: 2, priority: 'Urgent', requiredBy: 'Dec 17, 2024', items: [{ name: 'Safety Goggles', requested: 10, available: 5, location: 'D-R01', status: 'Low Stock' }, { name: 'Work Gloves', requested: 15, available: 30, location: 'D-R01', status: 'Available' }] },
      { id: '5', srNumber: 'SR-2024-049', requester: 'James Brown', department: 'Marketing', requestedDate: 'Dec 12, 2024', waitingTime: '4d 1h', waitingDays: 4, priority: 'Medium', requiredBy: 'Dec 25, 2024', items: [{ name: 'Monitor Stand', requested: 4, available: 8, location: 'A-R02', status: 'Available' }] },
      { id: '6', srNumber: 'SR-2024-050', requester: 'Lisa White', department: 'IT', requestedDate: 'Dec 15, 2024', waitingTime: '1d 5h', waitingDays: 1, priority: 'Urgent', requiredBy: 'Dec 19, 2024', items: [{ name: 'Network Switch', requested: 2, available: 4, location: 'E-R01', status: 'Available' }] },
    ];
  }

  private mapToPendingIssue(r: FlowRequest): PendingIssue {
    const days = r.waitingDays ?? 0;
    return {
      id: r.id,
      srNumber: r.srNumber,
      requester: r.requesterName,
      department: r.department,
      requestedDate: new Date(r.requestDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      waitingTime: `${days}d ${Math.floor(Math.random() * 24)}h`,
      waitingDays: days,
      priority: r.urgency === 'Urgent' || r.urgency === 'High' ? 'Urgent' : r.urgency === 'Low' ? 'Normal' : 'Medium',
      requiredBy: new Date(Date.now() + (days + 3) * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      items: [],
    };
  }

  onSearchChange(value: string): void { this.searchTerm.set(value); }
  onPriorityChange(value: string): void { this.priorityFilter.set(value); }
  onDepartmentChange(value: string): void { this.departmentFilter.set(value); }

  openProcessModal(issue: PendingIssue): void {
    this.selectedIssue.set(issue);
    this.currentStep.set(1);
    this.isProcessing.set(false);
    this.crossRoleService.getRequestDetail(issue.id).subscribe({
      next: (detail) => this.selectedIssueDetail.set(detail),
      error: () => this.selectedIssueDetail.set(null),
    });
    this.showProcessModal.set(true);
  }

  closeProcessModal(): void {
    this.showProcessModal.set(false);
    this.selectedIssue.set(null);
    this.selectedIssueDetail.set(null);
    this.currentStep.set(1);
  }

  nextStep(): void { this.currentStep.update(s => Math.min(s + 1, 3)); }
  previousStep(): void { this.currentStep.update(s => Math.max(s - 1, 1)); }

  processIssue(): void {
    this.isProcessing.set(true);
    const issue = this.selectedIssue();
    if (!issue) { this.isProcessing.set(false); return; }
    this.crossRoleService.issueRequest(issue.id, []).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.closeProcessModal();
        this.loadPendingIssues();
      },
      error: () => {
        this.isProcessing.set(false);
        this.closeProcessModal();
      }
    });
  }

  viewDetails(issue: PendingIssue): void { this.openProcessModal(issue); }
  addNote(_issue: PendingIssue): void { }
  snooze(_issue: PendingIssue): void { }
  bulkProcess(): void { }
  printPickingList(): void { }
  exportList(): void { }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Urgent': return '#ef4444';
      case 'Medium': return '#f59e0b';
      default: return '#10b981';
    }
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Review Requisition';
      case 2: return 'Select Items & Quantities';
      case 3: return 'SIV Details & Signature';
      default: return '';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  CREATE SIV
  // ══════════════════════════════════════════════════════════════
  sivStep = signal(1);
  readonly totalSivSteps = 4;

  selectedRequisition = signal<Requisition | null>(null);
  requisitions = signal<Requisition[]>([]);
  sivItems = signal<SIVItem[]>([]);
  isProcessingSiv = signal(false);
  requisitionSearch = signal('');

  filteredRequisitions = computed(() => {
    const s = this.requisitionSearch().toLowerCase();
    if (!s) return this.requisitions();
    return this.requisitions().filter(r =>
      r.srNumber.toLowerCase().includes(s) || r.requester.toLowerCase().includes(s)
    );
  });

  sivNumber = signal('');
  issueDate = signal('');
  issuedBy = signal('');
  printSIV = signal(true);
  sendEmail = signal(true);
  sendSMS = signal(false);
  requireManagerSignature = signal(false);

  private loadSIVs(): void {
    this.crossRoleService.getApprovedRequests().subscribe({
      next: (requests) => this.requisitions.set(requests.map(r => this.mapToRequisition(r))),
      error: () => this.requisitions.set(this.mockRequisitions()),
    });
  }

  private mockRequisitions(): Requisition[] {
    return [
      { id: '1', srNumber: 'SR-2024-045', requester: 'John Doe', department: 'IT', priority: 'Urgent', requiredBy: 'Dec 18, 2024' },
      { id: '2', srNumber: 'SR-2024-046', requester: 'Sarah Smith', department: 'HR', priority: 'Medium', requiredBy: 'Dec 20, 2024' },
      { id: '3', srNumber: 'SR-2024-047', requester: 'Mike Wilson', department: 'Finance', priority: 'Normal', requiredBy: 'Dec 22, 2024' },
      { id: '4', srNumber: 'SR-2024-048', requester: 'Emily Davis', department: 'Operations', priority: 'Urgent', requiredBy: 'Dec 17, 2024' },
      { id: '5', srNumber: 'SR-2024-049', requester: 'James Brown', department: 'Marketing', priority: 'Medium', requiredBy: 'Dec 25, 2024' },
    ];
  }

  private mapToRequisition(r: FlowRequest): Requisition {
    return {
      id: r.id,
      srNumber: r.srNumber,
      requester: r.requesterName,
      department: r.department,
      priority: r.urgency,
      requiredBy: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
  }

  selectRequisition(req: Requisition): void {
    this.selectedRequisition.set(req);
    this.generateSivNumber();
    this.issueDate.set(new Date().toISOString().split('T')[0]);
    const user = this.currentUserService['currentUserSubject']?.value;
    this.issuedBy.set(user?.fullName || user?.username || 'Store Keeper');
    this.sivItems.set([
      { srDetailId: '1', name: 'Sample Item', sku: 'ITM-001', requested: 10, approved: 8, available: 15, quantityToIssue: 8, shelfLocation: 'A-R01-S02', notes: '' }
    ]);
  }

  private generateSivNumber(): void {
    const count = this.requisitions().length + 1;
    this.sivNumber.set(`SIV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`);
  }

  sivNextStep(): void { this.sivStep.update(s => Math.min(s + 1, this.totalSivSteps)); }
  sivPreviousStep(): void { this.sivStep.update(s => Math.max(s - 1, 1)); }

  generateSIV(): void {
    this.isProcessingSiv.set(true);
    setTimeout(() => {
      this.isProcessingSiv.set(false);
      this.sivStep.set(1);
      this.selectedRequisition.set(null);
      this.activeTab.set('history');
    }, 1000);
  }

  cancelCreate(): void {
    this.sivStep.set(1);
    this.selectedRequisition.set(null);
  }

  getSivStepTitle(): string {
    switch (this.sivStep()) {
      case 1: return 'Select Requisition';
      case 2: return 'Requisition Details';
      case 3: return 'Items to Issue';
      case 4: return 'SIV Information';
      default: return '';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  ISSUE HISTORY
  // ══════════════════════════════════════════════════════════════
  historySearchTerm = signal('');
  historyDateStart = signal('2024-12-01');
  historyDateEnd = signal('2024-12-15');

  sivs = signal<SIVRecord[]>([]);
  showSivDetailsModal = signal(false);
  selectedSIV = signal<SIVRecord | null>(null);

  totalSIVs = computed(() => this.sivs().length);
  totalItemsIssued = computed(() => this.sivs().reduce((s, i) => s + i.items, 0));
  totalValueIssued = computed(() => this.sivs().reduce((s, i) => s + i.value, 0));
  avgItemsPerSIV = computed(() => this.sivs().length ? (this.totalItemsIssued() / this.sivs().length) : 0);

  topRequestedItems = signal<TopItem[]>([
    { name: 'Dell Laptop', requests: 4, value: 9996, percentage: 25 },
    { name: 'Office Chair', requests: 3, value: 1350, percentage: 19 },
    { name: 'A4 Paper', requests: 5, value: 125, percentage: 31 },
    { name: 'Safety Goggles', requests: 2, value: 50, percentage: 13 },
    { name: 'Network Switch', requests: 1, value: 1200, percentage: 6 },
  ]);

  filteredSIVs = computed(() => {
    const s = this.historySearchTerm().toLowerCase();
    return this.sivs().filter(siv =>
      !s || siv.sivNumber.toLowerCase().includes(s) || siv.srNumber.toLowerCase().includes(s) || siv.requester.toLowerCase().includes(s)
    );
  });

  private loadHistorySIVs(): void {
    this.crossRoleService.getAllSIVs().subscribe({
      next: (flowSivs) => {
        this.sivs.set(flowSivs.map(siv => ({
          sivNumber: siv.sivNumber,
          date: siv.issueDate,
          srNumber: siv.srNumber,
          requester: siv.requesterName,
          department: siv.department,
          items: siv.totalItems,
          value: Math.round(Math.random() * 5000) + 500,
        })));
      },
      error: () => this.sivs.set(this.mockSIVs()),
    });
  }

  private mockSIVs(): SIVRecord[] {
    return [
      { sivNumber: 'SIV-2024-001', date: 'Dec 15, 2024', srNumber: 'SR-2024-045', requester: 'John Doe', department: 'IT', items: 3, value: 2499 },
      { sivNumber: 'SIV-2024-002', date: 'Dec 14, 2024', srNumber: 'SR-2024-043', requester: 'Sarah Smith', department: 'HR', items: 5, value: 450 },
      { sivNumber: 'SIV-2024-003', date: 'Dec 14, 2024', srNumber: 'SR-2024-041', requester: 'Mike Wilson', department: 'Finance', items: 2, value: 2800 },
      { sivNumber: 'SIV-2024-004', date: 'Dec 13, 2024', srNumber: 'SR-2024-039', requester: 'Emily Davis', department: 'Operations', items: 4, value: 120 },
      { sivNumber: 'SIV-2024-005', date: 'Dec 13, 2024', srNumber: 'SR-2024-037', requester: 'James Brown', department: 'Marketing', items: 1, value: 75 },
      { sivNumber: 'SIV-2024-006', date: 'Dec 12, 2024', srNumber: 'SR-2024-035', requester: 'Lisa White', department: 'IT', items: 6, value: 150 },
    ];
  }

  openSivDetailsModal(siv: SIVRecord): void {
    this.selectedSIV.set(siv);
    this.showSivDetailsModal.set(true);
  }

  closeSivDetailsModal(): void {
    this.showSivDetailsModal.set(false);
    this.selectedSIV.set(null);
  }

  printSivRecord(siv: SIVRecord): void { window.print(); }
  emailSIV(siv: SIVRecord): void { }
  downloadSIV(siv: SIVRecord): void { }

  // ══════════════════════════════════════════════════════════════
  //  PRINT SIV
  // ══════════════════════════════════════════════════════════════
  printStep = signal(1);
  readonly totalPrintSteps = 3;
  printSearchTerm = signal('');

  printSivs = signal<SIV[]>([]);
  selectedPrintSIV = signal<SIV | null>(null);

  copies = signal(1);
  paperSize = signal('A4');
  orientation = signal('Portrait');
  color = signal('Color');
  includeLetterhead = signal(true);
  showSignatures = signal(true);
  includeReturnPolicy = signal(false);
  includeQRCode = signal(false);

  showBatchPrintModal = signal(false);

  filteredPrintSIVs = computed(() => {
    const s = this.printSearchTerm().toLowerCase();
    return this.printSivs().filter(siv =>
      !s || siv.sivNumber.toLowerCase().includes(s) || siv.requester.toLowerCase().includes(s)
    );
  });

  private loadPrintSIVs(): void {
    this.crossRoleService.getAllSIVs().subscribe({
      next: (flowSivs) => {
        this.printSivs.set(flowSivs.map(siv => ({
          sivNumber: siv.sivNumber,
          date: siv.issueDate,
          requester: siv.requesterName,
          department: siv.department,
          totalItems: siv.totalItems,
          totalValue: Math.round(Math.random() * 5000) + 500,
        })));
      },
      error: () => this.printSivs.set(this.mockPrintSIVs()),
    });
  }

  private mockPrintSIVs(): SIV[] {
    return [
      { sivNumber: 'SIV-2024-001', date: 'Dec 15, 2024', requester: 'John Doe', department: 'IT', totalItems: 3, totalValue: 2499 },
      { sivNumber: 'SIV-2024-002', date: 'Dec 14, 2024', requester: 'Sarah Smith', department: 'HR', totalItems: 5, totalValue: 450 },
      { sivNumber: 'SIV-2024-003', date: 'Dec 14, 2024', requester: 'Mike Wilson', department: 'Finance', totalItems: 2, totalValue: 2800 },
      { sivNumber: 'SIV-2024-004', date: 'Dec 13, 2024', requester: 'Emily Davis', department: 'Operations', totalItems: 4, totalValue: 120 },
    ];
  }

  selectPrintSIV(siv: SIV): void { this.selectedPrintSIV.set(siv); }
  printNextStep(): void { this.printStep.update(s => Math.min(s + 1, this.totalPrintSteps)); }
  printPreviousStep(): void { this.printStep.update(s => Math.max(s - 1, 1)); }

  printCurrentSIV(): void { window.print(); }
  downloadPDF(): void { }
  previewFullPage(): void { }

  openBatchPrintModal(): void { this.showBatchPrintModal.set(true); }
  closeBatchPrintModal(): void { this.showBatchPrintModal.set(false); }
  printAll(): void { this.closeBatchPrintModal(); }

  getPrintStepTitle(): string {
    switch (this.printStep()) {
      case 1: return 'Select SIV';
      case 2: return 'SIV Details';
      case 3: return 'Print Options';
      default: return '';
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════════════════
  formatValue(value: number): string {
    if (value >= 1000000) return '$' + (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return '$' + (value / 1000).toFixed(0) + 'K';
    return '$' + value.toString();
  }
}
