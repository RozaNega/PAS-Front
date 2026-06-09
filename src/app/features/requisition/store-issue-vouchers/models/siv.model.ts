export interface StoreIssueVoucher {
  id: string;
  sivNumber: string;
  srId: string;
  srNumber: string;
  issueDate: string;
  issuedById: string;
  issuedByName: string;
  recipientSignature: string;
  recipientName?: string;
  recipientDepartment?: string;
  totalItems: number;
  totalQuantity: number;
  status: string;
}

export interface StoreIssueVoucherDetail extends StoreIssueVoucher {
  items: SIVItem[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedDate?: string;
  remarks?: string;
}

export interface SIVItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  requestedQty: number;
  issuedQty: number;
  unitOfMeasure: string;
  shelfId?: string;
  shelfLocation?: string;
  warehouseName?: string;
  unitPrice?: number;
  totalValue?: number;
}

export interface CreateStoreIssueVoucherRequest {
  serviceRequestId?: string;
  issuedToId?: string;
  department: string;
  notes?: string;
  items: CreateSIVItemRequest[];
}

export interface CreateSIVItemRequest {
  itemId?: string;
  srDetailId?: string;
  issuedQty: number;
  shelfId?: string;
}

export interface UpdateStoreIssueVoucherRequest {
  id: string;
  recipientSignature?: string;
  recipientName?: string;
  recipientDepartment?: string;
  remarks?: string;
}

export interface ApproveSIVRequest {
  id: string;
  remarks?: string;
}

export type SIVStatusMetadata = {
  value: string;
  label: string;
  color: string;
  icon: string;
};

export const SIV_STATUSES: SIVStatusMetadata[] = [
  { value: 'Draft', label: 'Draft', color: 'secondary', icon: 'fa-file-alt' },
  { value: 'Pending', label: 'Pending Approval', color: 'warning', icon: 'fa-clock' },
  { value: 'Approved', label: 'Approved', color: 'success', icon: 'fa-check-circle' },
  { value: 'Rejected', label: 'Rejected', color: 'danger', icon: 'fa-times-circle' },
  { value: 'Issued', label: 'Issued', color: 'info', icon: 'fa-truck' },
  { value: 'Completed', label: 'Completed', color: 'primary', icon: 'fa-check-double' }
];
