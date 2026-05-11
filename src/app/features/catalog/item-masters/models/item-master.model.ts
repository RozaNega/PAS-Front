export interface ItemMasterListDto {
  id: string;
  itemName: string;
  sku: string;
  description?: string;
  unitOfMeasure: string;
  stockQuantity: number;
  categoryId?: string;
  categoryName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemMasterDetailDto extends ItemMasterListDto {
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  specifications?: Record<string, any>;
  minimumStock: number;
  maximumStock: number;
  reorderLevel: number;
}

export interface CreateItemMasterRequest {
  itemName: string;
  sku: string;
  description?: string;
  unitOfMeasure: string;
  categoryId?: string;
  minimumStock?: number;
  maximumStock?: number;
  reorderLevel?: number;
  specifications?: Record<string, any>;
}

export interface UpdateItemMasterRequest extends Partial<CreateItemMasterRequest> {
  id: string;
  isActive?: boolean;
}

export interface ItemMasterModel extends ItemMasterListDto {}
