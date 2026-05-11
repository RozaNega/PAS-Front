export interface ServiceRequest {
  id: string;
  srNumber: string;
  requesterId: string;
  requesterName: string;
  department?: string;
  purpose?: string;
  urgency?: string;
  notes?: string;
  approvedById?: string;
  approvedByName?: string;
  requestDate: string;
  status: string;
  totalItems: number;
  totalQuantity: number;
  issuedQuantity: number;
}

export interface ServiceRequestDetail extends ServiceRequest {
  items: ServiceRequestItem[];
  createdAt: string;
  updatedAt?: string;
  pendingQty: number;
  shelfId?: string;
  shelfLocation?: string;
}

export interface ServiceRequestItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitOfMeasure: string;
  requestedQty: number;
  issuedQty: number;
  pendingQty: number;
  shelfId?: string;
  shelfLocation?: string;
}

export interface CreateServiceRequestRequest {
  department: string;
  purpose: string;
  urgency: string;
  notes?: string;
  items: CreateServiceRequestItem[];
}

export interface CreateServiceRequestItem {
  itemId: string;
  requestedQty: number;
  shelfId?: string;
}

export interface ApproveServiceRequestRequest {
  id: string;
  remarks?: string;
}

export interface RejectServiceRequestRequest {
  id: string;
  reason: string;
}

export interface IssueServiceRequestRequest {
  id: string;
  items: IssueItemRequest[];
}

export interface IssueItemRequest {
  srDetailId: string;
  issuedQty: number;
  shelfId?: string;
}

export type ServiceRequestModel = ServiceRequest;