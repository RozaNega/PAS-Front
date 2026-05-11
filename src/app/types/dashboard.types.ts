export type RequestStatus = 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Completed';
export type RequestPriority = 'Normal' | 'Medium' | 'Urgent';

export interface RequestSummaryCard {
  title: string;
  value: number;
  subtitle: string;
  trend?: string;
  icon: string;
  tone: 'blue' | 'amber' | 'green' | 'rose';
}

export interface PendingRequest {
  srNumber: string;
  priority: RequestPriority;
  requestedDate: string;
  waitingTime: string;
  requiredDate: string;
  items: string[];
  status: RequestStatus;
}

export interface RecentActivity {
  date: string;
  description: string;
  type: 'approved' | 'completed' | 'submitted' | 'rejected';
}

export interface RequestTrendData {
  month: string;
  submitted: number;
  approved: number;
  completed: number;
  rejected: number;
}

export interface QuickLink {
  label: string;
  icon: string;
  route: string;
}

export interface ServiceRequest {
  srNumber: string;
  date: string;
  items: number;
  priority: RequestPriority;
  status: RequestStatus;
  requiredBy: string;
  requester: string;
  department: string;
  justification: string;
}

export interface RequestItem {
  itemId: string;
  srDetailId: string;
  name: string;
  sku: string;
  quantity: number;
  requestedQty: number;
  preferredShelfId: string;
  notes: string;
  approved?: number;
  issued?: number;
  status?: string;
}

export interface ApiRequestItem {
  itemId: string;
  srDetailId: string;
  requestedQty: number;
  preferredShelfId: string;
  notes: string;
}

export interface ApiServiceRequest {
  items: ApiRequestItem[];
  remarks: string;
}

export interface ApiReturnMaterialRequest {
  itemId: string;
  quantity: number;
  reason: string;
  returnType: string;
  sourceLocationId: string;
  sourceShelfId: string;
  supplierId: string;
  batchNumber: string;
  expiryDate: string;
  reference: string;
  remarks: string;
}

export interface RequestDetails {
  srNumber: string;
  requestedDate: string;
  requiredBy: string;
  priority: RequestPriority;
  status: RequestStatus;
  department: string;
  justification: string;
  approvedBy?: string;
  items: RequestItem[];
  timeline: TimelineEntry[];
  attachments: string[];
}

export interface TimelineEntry {
  date: string;
  action: string;
}

export interface CatalogItem {
  sku: string;
  name: string;
  category: string;
  available: number;
  status: 'Good' | 'Low' | 'Out of Stock';
  lastRestocked: string;
  uom: string;
  location?: string;
  description?: string;
  specifications?: string[];
}

export interface ItemAvailability {
  warehouse: string;
  shelfLocation: string;
  available: number;
  reserved: number;
  status: string;
}

export interface ItemDetails {
  sku: string;
  name: string;
  category: string;
  description?: string;
  uom: string;
  location?: string;
  available: number;
  status: 'Good' | 'Low' | 'Out of Stock';
  lastRestocked: string;
  availability?: ItemAvailability[];
  specifications?: string[];
}

export interface UserProfile {
  fullName: string;
  employeeCode: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  joinDate: string;
  profilePicture?: string;
  username?: string;
  password?: string;
}

export interface RequestHistory {
  year: number;
  totalRequests: number;
  approved: number;
  rejected: number;
  completed: number;
  approvalRate: number;
}

export interface SIV {
  sivNumber: string;
  date: string;
  items: string;
  status: 'Issued' | 'Pending';
  srNumber?: string;
}

export interface SIVDetails {
  sivNumber: string;
  date: string;
  issueTime: string;
  srNumber: string;
  issuedBy: string;
  receivedBy: string;
  status: 'Issued' | 'Pending';
  issuedTo?: string;
  department?: string;
  notes?: string;
  items: SIVItem[];
}

export interface SIVItem {
  sku: string;
  name: string;
  quantity: number;
  uom?: string;
  serialNumber?: string;
}

export interface NotificationSettings {
  emailOnApproved: boolean;
  emailOnRejected: boolean;
  emailOnReady: boolean;
  weeklySummary: boolean;
  monthlyDigest: boolean;
}

export interface AccountSecurity {
  lastPasswordChange: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
}

export interface NewRequestForm {
  requester: string;
  department: string;
  requiredBy: string;
  remarks: string;
  justification: string;
  priority: RequestPriority;
  items: RequestItem[];
}
