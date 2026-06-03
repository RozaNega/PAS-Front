import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

// ─── Inventory Valuation ────────────────────────────────────────────────────

export interface InventoryValuationReportDto {
  generatedAt: string;
  generatedBy?: string;
  filters: ReportFilterInfo;
  summary: InventoryReportSummary;
  items: InventoryValuationItemDto[];
  byCategory: ValuationByCategoryDto[];
  byWarehouse: ValuationByWarehouseDto[];
}

export interface ReportFilterInfo {
  asOfDate?: string;
  categoryId?: string;
  warehouseId?: string;
  includeZeroStock: boolean;
  itemSearch?: string;
}

export interface InventoryReportSummary {
  totalItems: number;
  totalStockItems: number;
  totalQuantity: number;
  totalValue: number;
  averageItemValue: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export interface InventoryValuationItemDto {
  itemId: string;
  sku?: string;
  itemName?: string;
  categoryName?: string;
  unitOfMeasure?: string;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  minStockLevel: number;
  isLowStock: boolean;
  status?: string;
  locations: InventoryLocationDto[];
}

export interface InventoryLocationDto {
  warehouseName?: string;
  shelfLocation?: string;
  quantity: number;
  value: number;
}

export interface ValuationByCategoryDto {
  categoryName?: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentageOfTotal: number;
}

export interface ValuationByWarehouseDto {
  warehouseName?: string;
  itemCount: number;
  totalQuantity: number;
  totalValue: number;
  percentageOfTotal: number;
}

// ─── Stock Movement ──────────────────────────────────────────────────────────

export interface StockMovementReportDto {
  generatedAt: string;
  generatedBy?: string;
  period: ReportPeriod;
  summary: MovementSummary;
  byType: MovementByTypeDto[];
  topMovingItems: MovementByItemDto[];
  dailyTrend: MovementTrendDto[];
  movements: StockMovementDetailDto[];
}

export interface ReportPeriod {
  fromDate: string;
  toDate: string;
}

export interface MovementSummary {
  totalTransactions: number;
  totalInbound: number;
  totalOutbound: number;
  totalAdjustments: number;
  totalQuantityIn: number;
  totalQuantityOut: number;
  netMovement: number;
  uniqueItemsMoved: number;
}

export interface MovementByTypeDto {
  transactionType?: string;
  count: number;
  quantity: number;
  percentage: number;
}

export interface MovementByItemDto {
  itemId: string;
  itemName?: string;
  sku?: string;
  totalQuantity: number;
  transactionCount: number;
  inboundQuantity: number;
  outboundQuantity: number;
  netMovement: number;
}

export interface MovementTrendDto {
  date: string;
  inbound: number;
  outbound: number;
  net: number;
}

export interface StockMovementDetailDto {
  date: string;
  transactionType?: string;
  itemName?: string;
  sku?: string;
  quantityChange: number;
  warehouse?: string;
  shelfLocation?: string;
  reference?: string;
  performedBy?: string;
}

// ─── Disposal Report ─────────────────────────────────────────────────────────

export interface DisposalReportDto {
  generatedAt: string;
  generatedBy?: string;
  period: ReportPeriod;
  summary: DisposalSummary;
  byReason: DisposalByReasonDto[];
  byMethod: DisposalByMethodDto[];
  byMonth: DisposalByMonthDto[];
  disposals: DisposalDetailDto[];
}

export interface DisposalSummary {
  totalDisposals: number;
  totalItems: number;
  totalQuantity: number;
  totalEstimatedValue: number;
  averageValuePerItem: number;
  pendingApprovals: number;
  approvedDisposals: number;
  rejectedDisposals: number;
}

export interface DisposalByReasonDto {
  reason?: string;
  count: number;
  quantity: number;
  totalValue: number;
  percentage: number;
}

export interface DisposalByMethodDto {
  method?: string;
  count: number;
  quantity: number;
  totalValue: number;
  percentage: number;
}

export interface DisposalByMonthDto {
  month?: string;
  year: number;
  count: number;
  quantity: number;
  value: number;
}

export interface DisposalDetailDto {
  id: string;
  disposalDate: string;
  itemName?: string;
  itemSKU?: string;
  quantity: number;
  reason?: string;
  method?: string;
  status?: string;
  estimatedValue: number;
  disposedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
}

// ─── Requisition History Report ───────────────────────────────────────────────

export interface RequisitionHistoryReportDto {
  generatedAt: string;
  generatedBy?: string;
  period: ReportPeriod;
  summary: RequisitionSummary;
  byStatus: RequisitionByStatusDto[];
  byDepartment: RequisitionByDepartmentDto[];
  byMonth: RequisitionByMonthDto[];
  requisitions: RequisitionDetailDto[];
}

export interface RequisitionSummary {
  totalRequisitions: number;
  totalItems: number;
  totalQuantity: number;
  issuedQuantity: number;
  totalValue: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  issuedCount: number;
  completedCount: number;
  fulfillmentRate: number;
}

export interface RequisitionByStatusDto {
  status?: string;
  count: number;
  items: number;
  quantity: number;
  percentage: number;
}

export interface RequisitionByDepartmentDto {
  department?: string;
  count: number;
  requestors: number;
  quantity: number;
  percentage: number;
}

export interface RequisitionByMonthDto {
  month?: string;
  year: number;
  count: number;
  quantity: number;
  issuedQuantity: number;
}

export interface RequisitionDetailDto {
  id: string;
  srNumber?: string;
  requestDate: string;
  requesterName?: string;
  department?: string;
  status?: string;
  itemCount: number;
  totalQuantity: number;
  issuedQuantity: number;
  approverName?: string;
  approvedDate?: string;
  sivNumber?: string;
  issueDate?: string;
  items: RequisitionItemDto[];
}

export interface RequisitionItemDto {
  itemName?: string;
  sku?: string;
  requestedQty: number;
  issuedQty: number;
  unitOfMeasure?: string;
}

// ─── Property Valuation Report ────────────────────────────────────────────────

export interface PropertyValuationReportDto {
  generatedAt: string;
  generatedBy?: string;
  filters: PropertyReportFilterInfo;
  summary: PropertyValuationSummary;
  byType: PropertyValuationByTypeDto[];
  byLocation: PropertyValuationByLocationDto[];
  byCategory: PropertyValuationByCategoryDto[];
  byAge: PropertyValuationByAgeDto[];
  properties: PropertyValuationDetailDto[];
}

export interface PropertyReportFilterInfo {
  asOfDate?: string;
  locationId?: string;
  propertyTypeId?: string;
  propertyCategoryId?: string;
  minValue?: number;
  maxValue?: number;
  searchTerm?: string;
}

export interface PropertyValuationSummary {
  totalProperties: number;
  totalItems: number;
  totalValue: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  propertiesWithoutLocation: number;
  propertiesWithoutSafetyBox: number;
}

export interface PropertyValuationByTypeDto {
  propertyType?: string;
  count: number;
  items: number;
  totalValue: number;
  percentage: number;
}

export interface PropertyValuationByLocationDto {
  location?: string;
  count: number;
  items: number;
  totalValue: number;
  percentage: number;
}

export interface PropertyValuationByCategoryDto {
  category?: string;
  count: number;
  items: number;
  totalValue: number;
  percentage: number;
}

export interface PropertyValuationByAgeDto {
  ageRange?: string;
  count: number;
  totalValue: number;
  minYears: number;
  maxYears: number;
}

export interface PropertyValuationDetailDto {
  id: string;
  tagNumber?: string;
  name?: string;
  serialNumber?: string;
  propertyType?: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
  purchaseDate: string;
  ageInYears: number;
  location?: string;
  safetyBox?: string;
  shelfNumber?: number;
}

export interface PropertyIssuanceReportDto {
  generatedAt: string;
  generatedBy?: string;
  fromDate: string;
  toDate: string;
  totalVouchers: number;
  totalIssuedItems: number;
  items: PropertyIssuanceItemDto[];
}

export interface PropertyIssuanceItemDto {
  voucherId: string;
  sivNumber?: string;
  issueDate: string;
  issuedBy?: string;
  recipientName?: string;
  department?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private apiService: ApiService) {}

  // Inventory Valuation
  getInventoryValuation(params?: {
    locationId?: string;
    categoryId?: string;
    asOfDate?: string;
  }): Observable<ApiResponseModel<InventoryValuationReportDto>> {
    return this.apiService.get<InventoryValuationReportDto>('InventoryReports/valuation', params);
  }

  exportInventoryValuation(params?: {
    locationId?: string;
    categoryId?: string;
    asOfDate?: string;
  }): Observable<Blob> {
    return this.apiService.getBlob('InventoryReports/valuation/export', params);
  }

  // Stock Movement
  getStockMovement(params?: {
    itemId?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    transactionType?: string;
  }): Observable<ApiResponseModel<StockMovementReportDto>> {
    return this.apiService.get<StockMovementReportDto>('StockMovementReports', params);
  }

  exportStockMovement(params?: {
    itemId?: string;
    warehouseId?: string;
    fromDate?: string;
    toDate?: string;
    transactionType?: string;
  }): Observable<Blob> {
    return this.apiService.getBlob('StockMovementReports/export', params);
  }

  // Disposal
  getDisposalReport(params?: {
    fromDate?: string;
    toDate?: string;
    reason?: string;
    itemId?: string;
  }): Observable<ApiResponseModel<DisposalReportDto>> {
    return this.apiService.get<DisposalReportDto>('DisposalReports', params);
  }

  exportDisposalReport(params?: {
    fromDate?: string;
    toDate?: string;
    reason?: string;
    itemId?: string;
  }): Observable<Blob> {
    return this.apiService.getBlob('DisposalReports/export', params);
  }

  // Requisition History
  getRequisitionHistory(params?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    requesterId?: string;
  }): Observable<ApiResponseModel<RequisitionHistoryReportDto>> {
    return this.apiService.get<RequisitionHistoryReportDto>('RequisitionReports', params);
  }

  exportRequisitionHistory(params?: {
    fromDate?: string;
    toDate?: string;
    status?: string;
    requesterId?: string;
  }): Observable<Blob> {
    return this.apiService.getBlob('RequisitionReports/export', params);
  }

  // Property Valuation
  getPropertyValuation(params?: {
    locationId?: string;
    propertyTypeId?: string;
    propertyCategoryId?: string;
    asOfDate?: string;
  }): Observable<ApiResponseModel<PropertyValuationReportDto>> {
    return this.apiService.get<PropertyValuationReportDto>('PropertyReports/valuation', params);
  }

  exportPropertyValuation(params?: {
    locationId?: string;
    propertyTypeId?: string;
    propertyCategoryId?: string;
    asOfDate?: string;
  }): Observable<Blob> {
    return this.apiService.getBlob('PropertyReports/valuation/export', params);
  }

  // Property Issuance
  getPropertyIssuance(params?: {
    fromDate?: string;
    toDate?: string;
    locationId?: string;
    department?: string;
    employeeId?: string;
  }): Observable<ApiResponseModel<PropertyIssuanceReportDto>> {
    return this.apiService.get<PropertyIssuanceReportDto>('PropertyReports/issuance', params);
  }
}
