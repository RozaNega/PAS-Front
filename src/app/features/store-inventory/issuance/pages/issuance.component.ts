import { Component, signal, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { CrossRoleService } from '../../../../core/services/cross-role.service';
import { ServiceRequestDetail, ServiceRequestItem } from '../../../requisition/service-requests/models/service-request.model';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { StoreIssueVoucherService, CreateStoreIssueVoucherRequest } from '../../../requisition/sivs/services/siv.service';
import { ServiceRequestService as CoreServiceRequestService, ServiceRequest as CoreServiceRequest } from '../../../../core/services/service-request.service';

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
  itemId?: string;
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
export class IssuanceComponent implements OnInit, OnDestroy {
  todayDate = new Date().toLocaleDateString();
  activeTab = signal<'overview' | 'pending' | 'create' | 'history' | 'print'>('overview');

  // ── Shared Services ──
  private readonly crossRoleService = inject(CrossRoleService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);
  private readonly sivService = inject(StoreIssueVoucherService);
  private readonly coreServiceRequestService = inject(CoreServiceRequestService);

  // ── Shared State ──
  isLoading = signal(false);
  errorMessage = signal('');
  notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Auto-refresh ──
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL_MS = 30000;
  private static readonly ZERO_GUID = '00000000-0000-0000-0000-000000000000';

  private isValidGuid(id: string | undefined | null): boolean {
    if (id == null) return false;
    const str = String(id).trim();
    if (!str || str === IssuanceComponent.ZERO_GUID || str === '0') return false;
    return true;
  }

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
  modalIssueItems = signal<ServiceRequestItem[]>([]);
  isProcessing = signal(false);
  currentStep = signal(1);

  constructor() {}

  ngOnInit(): void {
    this.loadPendingIssues();
    this.loadSIVs();
    this.loadHistorySIVs();
    this.loadPrintSIVs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshSubscription = interval(this.REFRESH_INTERVAL_MS).subscribe(() => {
      if (this.activeTab() === 'create' || this.activeTab() === 'pending') {
        this.loadSIVs();
        this.loadPendingIssues();
      }
      if (this.activeTab() === 'history' || this.activeTab() === 'print') {
        this.loadHistorySIVs();
        this.loadPrintSIVs();
      }
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  private mapCoreToRequisition(r: CoreServiceRequest): Requisition {
    return {
      id: String(r.id),
      srNumber: r.requestNumber || r.title || `SR-${r.id}`,
      requester: r.requester || r.requesterId || 'Employee',
      department: r.department || 'Unassigned',
      priority: r.priority || 'Medium',
      requiredBy: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
  }

  private mapCoreToPendingIssue(r: CoreServiceRequest): PendingIssue {
    const submitted = new Date(r.submittedDate);
    const waitingDays = Math.max(0, Math.floor((Date.now() - submitted.getTime()) / 86400000));
    return {
      id: String(r.id),
      srNumber: r.requestNumber || r.title || `SR-${r.id}`,
      requester: r.requester || r.requesterId || 'Employee',
      department: r.department || 'Unassigned',
      requestedDate: submitted.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      waitingTime: `${waitingDays}d ${Math.floor(Math.random() * 24)}h`,
      waitingDays,
      priority: r.priority === 'Urgent' || r.priority === 'High' ? 'Urgent' : r.priority === 'Low' ? 'Normal' : 'Medium',
      requiredBy: new Date(Date.now() + (waitingDays + 3) * 86400000).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      items: [],
    };
  }

  private loadPendingIssues(): void {
    this.isLoading.set(true);
    this.coreServiceRequestService.getApprovedRequests().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
        console.log('[Pending] Core API approved requests:', list.length);
        const valid = list.filter(r => this.isValidGuid(String(r.id)));
        this.allIssues.set(valid.map(r => this.mapCoreToPendingIssue(r)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('[Pending] Failed to load:', err);
        this.allIssues.set([]);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string): void { this.searchTerm.set(value); }
  onPriorityChange(value: string): void { this.priorityFilter.set(value); }
  onDepartmentChange(value: string): void { this.departmentFilter.set(value); }

  openProcessModal(issue: PendingIssue): void {
    this.selectedIssue.set(issue);
    this.currentStep.set(1);
    this.isProcessing.set(false);
    this.modalIssueItems.set([]);

    if (!this.isValidGuid(issue.id)) {
      this.showNotification('error', 'Invalid service request ID. Cannot load details.');
      this.showProcessModal.set(true);
      return;
    }

    this.crossRoleService.getRequestDetail(issue.id).subscribe({
      next: (detail) => {
        this.selectedIssueDetail.set(detail);
        if (detail?.items?.length) {
          this.modalIssueItems.set(detail.items.map(i => ({ ...i })));
        }
      },
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
    if (!issue || !this.isValidGuid(issue.id)) {
      this.isProcessing.set(false);
      this.showNotification('error', 'Invalid service request. Cannot process issue.');
      return;
    }

    const items = this.modalIssueItems()
      .filter(item => item.pendingQty > 0)
      .map(item => ({
        srDetailId: item.id,
        issuedQty: item.pendingQty,
        shelfId: item.shelfId || undefined,
      }));

    console.log('[SIV] Processing issue for:', issue.srNumber, 'items:', items);
    this.crossRoleService.issueRequest(issue.id, items).subscribe({
      next: (success) => {
        console.log('[SIV] Issue result:', success);
        this.isProcessing.set(false);
        if (success) {
          this.showNotification('success', `Issue for ${issue.srNumber} processed! SIV created.`);
        } else {
          this.showNotification('error', 'Failed to process issue. Please try again.');
        }
        this.closeProcessModal();
        this.loadPendingIssues();
        this.loadHistorySIVs();
        this.loadPrintSIVs();
      },
      error: (err) => {
        console.error('[SIV] Issue error:', err);
        this.isProcessing.set(false);
        this.showNotification('error', 'Error processing issue.');
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
    this.coreServiceRequestService.getApprovedRequests().subscribe({
      next: (res) => {
        const list = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
        console.log('[SIV] Core API approved requests:', list.length);
        const valid = list.filter(r => this.isValidGuid(String(r.id)));
        console.log('[SIV] After filter:', valid.length, 'valid');
        this.requisitions.set(valid.map(r => this.mapCoreToRequisition(r)));
      },
      error: (err) => {
        console.error('[SIV] Failed to load approved requests:', err);
        this.requisitions.set([]);
      },
    });
  }

  selectRequisition(req: Requisition): void {
    if (!this.isValidGuid(req.id)) {
      this.showNotification('error', 'Invalid requisition ID. Cannot load this request.');
      return;
    }

    this.selectedRequisition.set(req);
    this.generateSivNumber();
    this.issueDate.set(new Date().toISOString().split('T')[0]);
    const user = this.currentUserService['currentUserSubject']?.value;
    this.issuedBy.set(user?.fullName || user?.username || 'Store Keeper');

    this.isLoading.set(true);
    this.sivItems.set([]);
    console.log('[SIV] Loading items for request:', req.id, req.srNumber);
    this.crossRoleService.getRequestDetail(req.id).subscribe({
      next: (detail) => {
        console.log('[SIV] Detail response:', JSON.stringify(detail));
        this.isLoading.set(false);
        const items = detail?.items;
        if (items?.length) {
          this.sivItems.set(items.map(item => ({
            srDetailId: item.id || '',
            itemId: item.itemId || '',
            name: item.itemName || (item as any).name || (item as any).Name || 'Item',
            sku: item.sku || '',
            requested: item.requestedQty || 0,
            approved: item.requestedQty || 0,
            available: 0,
            quantityToIssue: item.pendingQty || item.requestedQty || 1,
            shelfLocation: item.shelfLocation || '',
            shelfId: item.shelfId || '',
            notes: '',
          })));
          console.log('[SIV] Loaded', this.sivItems().length, 'items');
          this.sivStep.set(2);
        } else {
          console.warn('[SIV] No items in detail');
          this.showNotification('error', 'No items found in this requisition.');
          this.sivItems.set([]);
        }
      },
      error: (err) => {
        console.error('[SIV] Failed to load detail:', err);
        this.isLoading.set(false);
        this.showNotification('error', 'Could not load requisition details. Please try again.');
        this.sivItems.set([]);
      },
    });
  }

  private generateSivNumber(): void {
    const count = this.requisitions().length + 1;
    this.sivNumber.set(`SIV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`);
  }

  sivNextStep(): void {
    if (this.sivStep() === 1 && !this.selectedRequisition()) return;
    if (this.sivStep() === 2 && this.sivItems().length === 0) {
      this.showNotification('error', 'No items loaded for this requisition.');
      return;
    }
    if (this.sivStep() === 3 && this.sivItems().length === 0) {
      this.showNotification('error', 'Please add at least one item.');
      return;
    }
    this.sivStep.update(s => Math.min(s + 1, this.totalSivSteps));
  }
  sivPreviousStep(): void { this.sivStep.update(s => Math.max(s - 1, 1)); }

  generateSIV(): void {
    const req = this.selectedRequisition();
    if (!req || !this.isValidGuid(req.id)) {
      this.showNotification('error', 'No valid requisition selected. Please go back and select a requisition.');
      return;
    }

    const items = this.sivItems().filter(i => i.quantityToIssue > 0);
    if (!items.length) {
      this.showNotification('error', 'Please add at least one item with quantity > 0');
      return;
    }

    const user = this.currentUserService['currentUserSubject']?.value;
    const command: CreateStoreIssueVoucherRequest = {
      serviceRequestId: req.id,
      issuedToId: req.requester || user?.id || user?.username || '',
      department: req.department || 'General',
      notes: '',
      items: items.map(i => ({
        itemId: i.itemId || i.srDetailId,
        srDetailId: i.srDetailId || undefined,
        issuedQty: i.quantityToIssue,
        shelfId: i.shelfId || undefined,
      })),
    };

    console.log('[SIV] Creating SIV with payload:', JSON.stringify(command));
    this.isProcessingSiv.set(true);
    this.sivService.create(command).subscribe({
      next: (res) => {
        console.log('[SIV] Create response:', JSON.stringify(res));
        this.isProcessingSiv.set(false);
        if (res.success) {
          this.showNotification('success', `SIV created successfully! ID: ${res.data}`);
          this.sivStep.set(1);
          this.selectedRequisition.set(null);
          this.sivItems.set([]);
          this.loadHistorySIVs();
          this.loadPrintSIVs();
          this.activeTab.set('history');
        } else {
          this.showNotification('error', 'Failed to create SIV: ' + (res.message || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error('[SIV] Create error:', err);
        this.isProcessingSiv.set(false);
        const backendMsg = err?.error?.message || err?.message || '';
        const friendlyMsg = backendMsg.toLowerCase().includes('not found')
          ? 'The associated service request could not be found. Please try again.'
          : backendMsg || 'Error creating SIV.';
        this.showNotification('error', friendlyMsg);
      },
    });
  }

  updateSivItem(index: number, field: string, event: Event): void {
    const val = field === 'notes'
      ? (event.target as HTMLInputElement).value
      : Number((event.target as HTMLInputElement).value);
    this.sivItems.update(items => items.map((item, i) => i === index ? { ...item, [field]: val } : item));
  }

  updateModalIssueItem(index: number, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.modalIssueItems.update(items => items.map((item, i) => i === index ? { ...item, pendingQty: val } : item));
  }

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification.set({ type, message });
    setTimeout(() => this.notification.set(null), 5000);
  }

  cancelCreate(): void {
    this.sivStep.set(1);
    this.selectedRequisition.set(null);
    this.sivItems.set([]);
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
        console.log('[SIV] History loaded:', flowSivs.length, 'SIVs');
        this.sivs.set(flowSivs.map(siv => ({
          sivNumber: siv.sivNumber,
          date: siv.issueDate,
          srNumber: siv.srNumber,
          requester: siv.requesterName,
          department: siv.department,
          items: siv.totalItems,
          value: 0,
        })));
      },
      error: (err) => {
        console.error('[SIV] Failed to load history:', err);
        this.sivs.set([]);
      },
    });
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
          totalValue: 0,
        })));
      },
      error: () => this.printSivs.set([]),
    });
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

  refreshRequisitions(): void {
    this.loadSIVs();
    this.loadPendingIssues();
  }
}
