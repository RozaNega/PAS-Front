export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoleDetail extends Role {
  permissions: Permission[];
  userCount?: number;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
}

export interface UserRoleDto {
  userId: string;
  roleId: string;
  roleName: string;
  assignedAt: string;
  assignedBy?: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

export interface RemoveRoleRequest {
  userId: string;
  roleId: string;
}

export interface RolesApiResponse {
  success: boolean;
  message: string;
  data: Role[] | Role | null;
  statusCode: number;
}

export interface PermissionApiResponse {
  success: boolean;
  message: string;
  data: Permission[] | Permission | null;
  statusCode: number;
}
