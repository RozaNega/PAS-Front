import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
]);

interface ReportTab {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface KpiCard {
  label: string;
  value: string;
  trend: string;
  icon: string;
  color: string;
}

interface TableRow {
  id: number;
  [key: string]: string | number;
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss',
})
export class ReportsDashboardComponent {
  activeTab = 'valuation';

  dateRange = 'this-month';

  tabs: ReportTab[] = [
    { id: 'valuation', label: 'Valuation Reports', icon: 'bi bi-currency-dollar', color: '#3b82f6' },
    { id: 'requisition', label: 'Requisition Reports', icon: 'bi bi-list-check', color: '#8b5cf6' },
    { id: 'stock', label: 'Stock Reports', icon: 'bi bi-boxes', color: '#10b981' },
    { id: 'issuance', label: 'Issuance Reports', icon: 'bi bi-file-text', color: '#f59e0b' },
    { id: 'compliance', label: 'Compliance Reports', icon: 'bi bi-shield-check', color: '#ef4444' },
    { id: 'audit', label: 'Audit Reports', icon: 'bi bi-file-earmark-spreadsheet', color: '#06b6d4' },
  ];

  get kpiCards(): KpiCard[] {
    switch (this.activeTab) {
      case 'valuation':
        return [
          { label: 'Total Value', value: '$2.4M', trend: '+12% this quarter', icon: 'bi bi-currency-dollar', color: '#3b82f6' },
          { label: 'Depreciation', value: '$156K', trend: 'Annual depreciation', icon: 'bi bi-graph-down-arrow', color: '#f59e0b' },
          { label: 'Properties', value: '1,234', trend: 'Total valued properties', icon: 'bi bi-buildings', color: '#10b981' },
          { label: 'Locations', value: '45', trend: 'Locations covered', icon: 'bi bi-geo-alt', color: '#8b5cf6' },
        ];
      case 'requisition':
        return [
          { label: 'Total Requests', value: '312', trend: 'This month', icon: 'bi bi-list-check', color: '#8b5cf6' },
          { label: 'Pending', value: '12', trend: '5 urgent', icon: 'bi bi-clock', color: '#f59e0b' },
          { label: 'Approved', value: '245', trend: '78% approval rate', icon: 'bi bi-check-circle', color: '#10b981' },
          { label: 'Avg Time', value: '2.3d', trend: 'Processing time', icon: 'bi bi-clock-history', color: '#3b82f6' },
        ];
      case 'stock':
        return [
          { label: 'Total Items', value: '1,234', trend: '+12% this month', icon: 'bi bi-boxes', color: '#10b981' },
          { label: 'Low Stock', value: '23', trend: '5 critical', icon: 'bi bi-exclamation-triangle', color: '#f59e0b' },
          { label: 'Total Value', value: '$456K', trend: '+8% this month', icon: 'bi bi-currency-dollar', color: '#3b82f6' },
          { label: 'Warehouses', value: '5', trend: 'All active', icon: 'bi bi-building', color: '#8b5cf6' },
        ];
      case 'issuance':
        return [
          { label: 'Total Issues', value: '456', trend: '+15% this month', icon: 'bi bi-arrow-down-circle', color: '#f59e0b' },
          { label: 'Pending Issues', value: '8', trend: '2 urgent', icon: 'bi bi-clock', color: '#ef4444' },
          { label: 'Departments', value: '12', trend: 'Active departments', icon: 'bi bi-people', color: '#3b82f6' },
          { label: 'Issued Value', value: '$234K', trend: '+10% this month', icon: 'bi bi-currency-dollar', color: '#10b981' },
        ];
      case 'compliance':
        return [
          { label: 'Compliance Score', value: '94%', trend: 'Excellent rating', icon: 'bi bi-shield-check', color: '#10b981' },
          { label: 'Violations', value: '5', trend: 'This month', icon: 'bi bi-exclamation-triangle', color: '#ef4444' },
          { label: 'Audit Passed', value: '18', trend: '100% pass rate', icon: 'bi bi-check2-all', color: '#3b82f6' },
          { label: 'Documents', value: '98%', trend: 'Documentation complete', icon: 'bi bi-file-earmark-check', color: '#8b5cf6' },
        ];
      case 'audit':
        return [
          { label: 'Total Logs', value: '15,678', trend: 'This month', icon: 'bi bi-journal-text', color: '#06b6d4' },
          { label: 'Active Users', value: '89', trend: 'Currently logged in', icon: 'bi bi-person-badge', color: '#3b82f6' },
          { label: 'Security Events', value: '23', trend: 'This week', icon: 'bi bi-shield-lock', color: '#ef4444' },
          { label: 'Retention', value: '90d', trend: 'Policy compliance', icon: 'bi bi-clock-history', color: '#f59e0b' },
        ];
      default:
        return [];
    }
  }

  get chartOptions(): Record<string, unknown> {
    switch (this.activeTab) {
      case 'valuation':
        return this.valuationChartOpts();
      case 'requisition':
        return this.requisitionChartOpts();
      case 'stock':
        return this.stockChartOpts();
      case 'issuance':
        return this.issuanceChartOpts();
      case 'compliance':
        return this.complianceChartOpts();
      case 'audit':
        return this.auditChartOpts();
      default:
        return {};
    }
  }

  get chartOptions2(): Record<string, unknown> {
    switch (this.activeTab) {
      case 'valuation':
        return this.depreciationChartOpts();
      case 'requisition':
        return this.approvalRateChartOpts();
      case 'stock':
        return this.warehouseChartOpts();
      case 'issuance':
        return this.issuanceDeptChartOpts();
      case 'compliance':
        return this.complianceAreaChartOpts();
      case 'audit':
        return this.auditActivityChartOpts();
      default:
        return {};
    }
  }

  get tableColumns(): { label: string; key: string }[] {
    switch (this.activeTab) {
      case 'valuation':
        return [
          { label: 'Property', key: 'property' },
          { label: 'Type', key: 'type' },
          { label: 'Value', key: 'value' },
          { label: 'Depreciation', key: 'depreciation' },
          { label: 'Status', key: 'status' },
        ];
      case 'requisition':
        return [
          { label: 'Request ID', key: 'Request ID' },
          { label: 'Department', key: 'department' },
          { label: 'Items', key: 'items' },
          { label: 'Status', key: 'status' },
          { label: 'Date', key: 'date' },
        ];
      case 'stock':
        return [
          { label: 'Item Name', key: 'Item Name' },
          { label: 'SKU', key: 'sku' },
          { label: 'Category', key: 'category' },
          { label: 'Stock', key: 'stock' },
          { label: 'Status', key: 'status' },
        ];
      case 'issuance':
        return [
          { label: 'SIV No', key: 'SIV No' },
          { label: 'Department', key: 'department' },
          { label: 'Items', key: 'items' },
          { label: 'Value', key: 'value' },
          { label: 'Date', key: 'date' },
        ];
      case 'compliance':
        return [
          { label: 'Area', key: 'area' },
          { label: 'Score', key: 'score' },
          { label: 'Status', key: 'status' },
          { label: 'Findings', key: 'findings' },
          { label: 'Last Audit', key: 'Last Audit' },
        ];
      case 'audit':
        return [
          { label: 'User', key: 'user' },
          { label: 'Action', key: 'action' },
          { label: 'Resource', key: 'resource' },
          { label: 'IP Address', key: 'IP Address' },
          { label: 'Timestamp', key: 'timestamp' },
        ];
      default:
        return [];
    }
  }

  private tableIdCounter = 1;

  get tableData(): TableRow[] {
    const now = Date.now();
    switch (this.activeTab) {
      case 'valuation':
        return [
          { id: now + 1, property: 'Office Tower A', type: 'Building', value: '$850K', depreciation: '$12K', status: 'Active' },
          { id: now + 2, property: 'Warehouse B', type: 'Warehouse', value: '$420K', depreciation: '$8K', status: 'Active' },
          { id: now + 3, property: 'Fleet Vehicles', type: 'Vehicle', value: '$380K', depreciation: '$45K', status: 'Depreciating' },
          { id: now + 4, property: 'IT Equipment', type: 'Equipment', value: '$290K', depreciation: '$38K', status: 'Depreciating' },
          { id: now + 5, property: 'Furniture Set', type: 'Furniture', value: '$180K', depreciation: '$15K', status: 'Active' },
          { id: now + 6, property: 'Land Parcel A', type: 'Land', value: '$1.2M', depreciation: '$0K', status: 'Appreciating' },
        ];
      case 'requisition':
        return [
          { id: now + 1, 'Request ID': 'REQ-1023', department: 'IT', items: 'Laptops, Monitors', status: 'Approved', date: '2026-05-28' },
          { id: now + 2, 'Request ID': 'REQ-1024', department: 'HR', items: 'Office Chairs', status: 'Pending', date: '2026-05-27' },
          { id: now + 3, 'Request ID': 'REQ-1025', department: 'Finance', items: 'Printers', status: 'Approved', date: '2026-05-26' },
          { id: now + 4, 'Request ID': 'REQ-1026', department: 'Operations', items: 'Safety Gear', status: 'Rejected', date: '2026-05-25' },
          { id: now + 5, 'Request ID': 'REQ-1027', department: 'Sales', items: 'Tablets', status: 'Pending', date: '2026-05-24' },
          { id: now + 6, 'Request ID': 'REQ-1028', department: 'IT', items: 'Server Rack', status: 'Completed', date: '2026-05-23' },
        ];
      case 'stock':
        return [
          { id: now + 1, 'Item Name': 'Office Chair', sku: 'SKU-001', category: 'Furniture', stock: 120, status: 'In Stock' },
          { id: now + 2, 'Item Name': 'Laptop', sku: 'SKU-002', category: 'Electronics', stock: 25, status: 'Low Stock' },
          { id: now + 3, 'Item Name': 'Printer Paper', sku: 'SKU-003', category: 'Supplies', stock: 500, status: 'In Stock' },
          { id: now + 4, 'Item Name': 'Desk Lamp', sku: 'SKU-004', category: 'Furniture', stock: 15, status: 'Low Stock' },
          { id: now + 5, 'Item Name': 'USB Cable', sku: 'SKU-005', category: 'Electronics', stock: 200, status: 'In Stock' },
          { id: now + 6, 'Item Name': 'Whiteboard', sku: 'SKU-006', category: 'Office', stock: 8, status: 'Critical' },
        ];
      case 'issuance':
        return [
          { id: now + 1, 'SIV No': 'SIV-2026-001', department: 'IT', items: '3 Laptops', value: '$4,500', date: '2026-05-28' },
          { id: now + 2, 'SIV No': 'SIV-2026-002', department: 'HR', items: '10 Chairs', value: '$2,300', date: '2026-05-27' },
          { id: now + 3, 'SIV No': 'SIV-2026-003', department: 'Finance', items: '2 Printers', value: '$1,800', date: '2026-05-26' },
          { id: now + 4, 'SIV No': 'SIV-2026-004', department: 'Ops', items: 'Safety Kits', value: '$950', date: '2026-05-25' },
          { id: now + 5, 'SIV No': 'SIV-2026-005', department: 'Sales', items: '5 Tablets', value: '$3,200', date: '2026-05-24' },
        ];
      case 'compliance':
        return [
          { id: now + 1, area: 'Data Security', score: '96%', status: 'Compliant', findings: 'Minor', 'Last Audit': '2026-05-15' },
          { id: now + 2, area: 'Access Control', score: '92%', status: 'Compliant', findings: 'None', 'Last Audit': '2026-05-10' },
          { id: now + 3, area: 'Documentation', score: '88%', status: 'Needs Review', findings: '3 issues', 'Last Audit': '2026-05-05' },
          { id: now + 4, area: 'Workflow Compliance', score: '95%', status: 'Compliant', findings: 'None', 'Last Audit': '2026-04-28' },
          { id: now + 5, area: 'Audit Trail', score: '98%', status: 'Compliant', findings: 'Minor', 'Last Audit': '2026-04-20' },
        ];
      case 'audit':
        return [
          { id: now + 1, user: 'John Doe', action: 'Login', resource: 'Auth System', 'IP Address': '192.168.1.10', timestamp: '2026-05-28 09:15' },
          { id: now + 2, user: 'Jane Smith', action: 'Update', resource: 'Property Record', 'IP Address': '192.168.1.22', timestamp: '2026-05-28 09:30' },
          { id: now + 3, user: 'Admin User', action: 'Delete', resource: 'User Account', 'IP Address': '10.0.0.5', timestamp: '2026-05-28 10:00' },
          { id: now + 4, user: 'Bob Wilson', action: 'Export', resource: 'Stock Report', 'IP Address': '192.168.1.15', timestamp: '2026-05-28 10:15' },
          { id: now + 5, user: 'Alice Brown', action: 'View', resource: 'Dashboard', 'IP Address': '192.168.1.8', timestamp: '2026-05-28 10:30' },
        ];
      default:
        return [];
    }
  }

  private baseChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    };
  }

  private valuationChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Electronics', 'Furniture', 'Vehicles', 'Equipment', 'Other'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}K' } },
      series: [{
        type: 'bar',
        data: [850, 420, 680, 320, 210],
        itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  private depreciationChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}K' } },
      series: [{
        type: 'line',
        data: [42, 45, 48, 43, 47, 44],
        smooth: true,
        lineStyle: { color: '#f59e0b', width: 3 },
        itemStyle: { color: '#f59e0b' },
        areaStyle: { color: 'rgba(245, 158, 11, 0.1)' },
      }],
    };
  }

  private requisitionChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['IT', 'HR', 'Finance', 'Ops', 'Sales'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar',
        data: [85, 52, 41, 63, 38],
        itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  private approvalRateChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['55%', '75%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { scale: false },
        data: [
          { value: 78, name: 'Approved', itemStyle: { color: '#10b981' } },
          { value: 12, name: 'Pending', itemStyle: { color: '#f59e0b' } },
          { value: 10, name: 'Rejected', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  }

  private stockChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Warehouse D', 'Warehouse E'], axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar',
        data: [3200, 2100, 4500, 2800, 1500],
        itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  private warehouseChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        emphasis: { scale: true },
        data: [
          { value: 28, name: 'Warehouse A', itemStyle: { color: '#3b82f6' } },
          { value: 18, name: 'Warehouse B', itemStyle: { color: '#10b981' } },
          { value: 25, name: 'Warehouse C', itemStyle: { color: '#f59e0b' } },
          { value: 18, name: 'Warehouse D', itemStyle: { color: '#8b5cf6' } },
          { value: 11, name: 'Warehouse E', itemStyle: { color: '#06b6d4' } },
        ],
      }],
    };
  }

  private issuanceChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar',
        data: [65, 78, 52, 89, 72, 95],
        itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] },
        barWidth: '35%',
      }],
    };
  }

  private issuanceDeptChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['IT', 'HR', 'Finance', 'Ops', 'Sales'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', formatter: '${v}K' } },
      series: [{
        type: 'line',
        data: [28, 15, 22, 18, 12],
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 3 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.1)' },
      }],
    };
  }

  private complianceChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Data Security', 'Access Control', 'Documentation', 'Workflow', 'Audit Trail'], axisLabel: { color: '#94a3b8', rotate: 15 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#94a3b8', formatter: '{v}%' } },
      series: [{
        type: 'bar',
        data: [96, 92, 88, 95, 98],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#10b981' },
            { offset: 1, color: '#34d399' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        barWidth: '45%',
      }],
    };
  }

  private complianceAreaChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        label: { show: true, position: 'outside', formatter: '{b}: {d}%', color: '#94a3b8', fontSize: 11 },
        emphasis: { scale: true },
        data: [
          { value: 94, name: 'Compliant', itemStyle: { color: '#10b981' } },
          { value: 6, name: 'Non-Compliant', itemStyle: { color: '#ef4444' } },
        ],
      }],
    };
  }

  private auditChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Login', 'Update', 'Delete', 'Export', 'View'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [{
        type: 'bar',
        data: [245, 180, 45, 92, 310],
        itemStyle: { color: '#06b6d4', borderRadius: [6, 6, 0, 0] },
        barWidth: '45%',
      }],
    };
  }

  private auditActivityChartOpts(): Record<string, unknown> {
    return {
      ...this.baseChartOpts(),
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' } },
      series: [
        {
          type: 'line',
          data: [120, 180, 150, 210, 190, 45, 25],
          smooth: true,
          lineStyle: { color: '#06b6d4', width: 3 },
          itemStyle: { color: '#06b6d4' },
          areaStyle: { color: 'rgba(6, 182, 212, 0.1)' },
        },
        {
          type: 'bar',
          data: [0, 0, 0, 0, 0, 0, 0],
          barWidth: 0,
        },
      ],
    };
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'approved' || s === 'compliant' || s === 'in stock') return 'status-success';
    if (s === 'pending' || s === 'needs review' || s === 'low stock') return 'status-warning';
    if (s === 'rejected' || s === 'critical' || s === 'depreciating') return 'status-danger';
    return 'status-info';
  }

  selectedItem: TableRow | null = null;
  showDetailModal = false;

  viewItem(row: TableRow): void {
    this.selectedItem = row;
    this.showDetailModal = true;
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedItem = null;
  }

  deleteItem(row: TableRow): void {
    if (confirm(`Are you sure you want to delete this record?`)) {
      alert(`Record has been deleted successfully.`);
    }
  }

  exportReport(): void {
    alert(`Exporting ${this.activeTab} report...`);
  }

  printReport(): void {
    window.print();
  }
}
