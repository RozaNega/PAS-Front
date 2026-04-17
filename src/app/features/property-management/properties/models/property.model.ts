export interface Property {
  id: string;
  tagNumber: string;
  name: string;
  serialNumber: string;
  propertyTypeId: string;
  propertyTypeName: string;
  propertyCategoryId?: string;
  propertyCategoryName?: string;
  unitPrice: number;
  totalValue: number;
  quantity: number;
  purchaseDate: string;
  locationId: string;
  locationName: string;
  safetyBoxId?: string;
  safetyBoxNumber?: string;
  shelfNumber?: number;
}

export interface PropertyDetail extends Property {
  attachments: PropertyAttachment[];
  movementHistory: PropertyMovement[];
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface PropertyAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface PropertyMovement {
  date: string;
  transactionType: string;
  reference: string;
  fromLocation: string;
  toLocation: string;
  performedBy: string;
  remarks: string;
}

export interface CreatePropertyRequest {
  tagNumber: string;
  name: string;
  serialNumber: string;
  propertyTypeId: string;
  propertyCategoryId?: string;
  unitPrice: number;
  quantity: number;
  purchaseDate: string;
  locationId: string;
  safetyBoxId?: string;
  shelfNumber?: number;
}

export interface UpdatePropertyRequest extends CreatePropertyRequest {
  id: string;
}

export interface TransferPropertyRequest {
  id: string;
  newLocationId: string;
  newSafetyBoxId?: string;
  newShelfNumber?: number;
  remarks: string;
}

export type PropertyModel = Property;