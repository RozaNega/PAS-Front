export interface ServiceRequest {
  id: string;
  srNumber: string;
  requesterId: string;
  requesterName: string;
  approvedById?: string;
  approvedByName?: string;
  requestDate: string;
  status: string;
  totalItems: number;
  totalQuantity: number;
  issuedQuantity: number;
}

export interface ServiceRequestDetail extends ServiceRequest {
  department?: string;
  items: ServiceRequestItem[];
  createdAt: string;
  updatedAt?: string;
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

export interface ServiceRequestTimeline {
  requestId: string;
  currentStep: number;
  totalSteps: number;
  estimatedCompletion?: string;
  currentApprover?: string;
  steps: TimelineStep[];
}

export interface TimelineStep {
  step: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  completedDate?: string;
  estimatedDate?: string;
}

export interface ServiceRequestActivity {
  id: string;
  requestId: string;
  timestamp: string;
  action: string;
  performedBy: string;
  details?: string;
}

export interface CancelServiceRequestRequest {
  id: string;
  reason?: string;
  notifyApprover: boolean;
  sendEmailConfirmation: boolean;
}

export type ServiceRequestModel = ServiceRequest;