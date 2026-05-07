export enum BusinessType {
  Restaurant = 0,
  Retail = 1
}

export enum SubscriptionPlan {
  Basic = 0,
  Standard = 1,
  Premium = 2,
  Enterprise = 3
}

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  plan: SubscriptionPlan;
  isActive: boolean;
}

export interface CompanyDto {
  id: string;
  name: string;
  legalName: string;
  defaultCurrency: string;
  taxRegistrationNumber: string | null;
  isActive: boolean;
}

export interface CreateCompanyRequest {
  name: string;
  legalName: string;
  defaultCurrency: string;
  taxRegistrationNumber: string | null;
}

export interface UpdateCompanyRequest extends CreateCompanyRequest {
  id: string;
}

export interface LocationDto {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
}

export interface BranchDto {
  id: string;
  companyId: string;
  name: string;
  code: string;
  phoneNumber: string | null;
  location: LocationDto;
  isActive: boolean;
}

export interface CreateBranchRequest {
  companyId: string;
  name: string;
  code: string;
  phoneNumber: string | null;
  location: LocationDto;
}

export interface UpdateBranchRequest extends Omit<CreateBranchRequest, 'companyId'> {
  id: string;
}

// Users -----------------------------------------------------------

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: string[];
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
}

export interface UpdateUserRequest {
  fullName: string;
  isActive: boolean;
  roles: string[];
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface RoleDto {
  name: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

// Catalog ----------------------------------------------------------

export interface CategoryDto {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  displayOrder: number;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {
  id: string;
}

export interface UnitGroupDto {
  id: string;
  name: string;
  unitCount: number;
  isActive: boolean;
}

export interface CreateUnitGroupRequest {
  name: string;
}

export interface UpdateUnitGroupRequest extends CreateUnitGroupRequest {
  id: string;
}

export interface UnitDto {
  id: string;
  groupId: string;
  groupName: string;
  code: string;
  name: string;
  conversionFactor: number;
  isBase: boolean;
  isActive: boolean;
}

export interface CreateUnitRequest {
  groupId: string;
  code: string;
  name: string;
  conversionFactor: number;
}

export interface UpdateUnitRequest extends CreateUnitRequest {
  id: string;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  unitId: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  basePriceAmount: number;
  basePriceCurrency: string;
  isActive: boolean;
  isAvailable: boolean;
  isStockTracked: boolean;
}

export interface CreateProductRequest {
  categoryId: string;
  unitId: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  basePriceAmount: number;
  basePriceCurrency: string;
  isStockTracked: boolean;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: string;
}

// Inventory --------------------------------------------------------

export enum StockMovementType {
  Purchase = 0,
  Adjustment = 1,
  Wastage = 2,
  Sale = 3,
  TransferIn = 4,
  TransferOut = 5
}

export interface StockBalanceDto {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productSku: string;
  productName: string;
  productUnitCode: string;
  quantity: number;
  lastMovementAt: string;
}

export interface StockMovementDto {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productSku: string;
  productName: string;
  type: StockMovementType;
  typeName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  quantityInProductUnit: number;
  productUnitCode: string;
  reference: string | null;
  notes: string | null;
  occurredAt: string;
  createdBy: string | null;
}

export interface RecordStockMovementRequest {
  branchId: string;
  productId: string;
  unitId: string;
  type: StockMovementType;
  quantity: number;
  reference: string | null;
  notes: string | null;
  occurredAt: string | null;
}
