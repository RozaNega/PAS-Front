export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Ordered'
  | 'Received'
  | 'Completed'
  | 'Cancelled';

export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitOfMeasure: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalCost: number;
  notes: string;
  createdBy: string;
  createdById: string;
  createdDate: Date;
  approvedBy?: string;
  approvedById?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedReason?: string;
  rejectedDate?: Date;
  orderedDate?: Date;
  receivedDate?: Date;
  completedDate?: Date;
  requiresDirectorApproval: boolean;
  directorApprovedBy?: string;
  directorApprovedDate?: Date;
}
