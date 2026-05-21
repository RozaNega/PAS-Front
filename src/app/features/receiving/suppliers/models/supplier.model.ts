export interface SupplierModel {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  tin?: string;
  isActive: boolean;
}

export interface CreateSupplierRequest {
  /** Maps to API `supplierName`. */
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  /** Maps to API `tinNumber` (required non-empty for create; auto-generated in service if blank/short). */
  tin?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  tin?: string;
  isActive?: boolean;
}
