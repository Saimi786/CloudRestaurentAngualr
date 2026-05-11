export enum BusinessType {
  Restaurant = 0,
  Retail = 1,
  Wholesale = 2
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
  logoUrl: string | null;
}

export enum ReceiptTemplate {
  Compact = 0,
  Classic = 1
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
  receiptTemplate: ReceiptTemplate;
  receiptFooterText: string | null;
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
  receiptTemplate?: ReceiptTemplate | null;
  receiptFooterText?: string | null;
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
  branchIds: string[];
  maxDiscountPercent: number | null;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  branchIds?: string[];
  maxDiscountPercent?: number | null;
}

export interface UpdateUserRequest {
  fullName: string;
  isActive: boolean;
  roles: string[];
  branchIds?: string[];
  maxDiscountPercent?: number | null;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface RoleDto {
  name: string;
}

export interface RoleDetailsDto {
  id: string;
  name: string;
  isBuiltIn: boolean;
  userCount: number;
  permissions: string[];
}

export interface PermissionDescriptor {
  key: string;
  area: string;
}

// Business Settings ---------------------------------------------

/** Reward points expiry unit on the API: Day=0, Month=1, Year=2. */
export enum RewardPointsExpiryUnit {
  Day = 0,
  Month = 1,
  Year = 2,
}

export interface BusinessSettingsDto {
  defaultCurrency: string;
  defaultTimezone: string;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  taxLabel: string;
  defaultTaxRateId: string | null;
  // Reward points (UP-aligned)
  rewardPointsEnabled: boolean;
  rewardPointsName: string;
  rewardPointsAmountPerPoint: number;
  rewardPointsMinOrderForEarn: number;
  rewardPointsMaxPerOrder: number | null;
  rewardPointsRedeemValue: number;
  rewardPointsMinOrderForRedeem: number;
  rewardPointsMinRedeem: number | null;
  rewardPointsMaxRedeem: number | null;
  rewardPointsExpiryPeriod: number | null;
  rewardPointsExpiryUnit: RewardPointsExpiryUnit;
  // Prefixes
  salesPrefix: string;
  purchasePrefix: string;
  expensePrefix: string;
  customerPrefix: string;
  posShowStockLevel: boolean;
}

export type UpdateBusinessSettingsRequest = BusinessSettingsDto;

// Platform (SuperAdmin) ----------------------------------------

export interface PlatformTenantListItem {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  plan: SubscriptionPlan;
  isActive: boolean;
  logoUrl: string | null;
  createdAt: string;
  companyCount: number;
  branchCount: number;
  userCount: number;
}

export interface PlatformTenantDetails extends PlatformTenantListItem {
  adminEmail: string | null;
}

export interface CreatePlatformTenantRequest {
  name: string;
  slug: string;
  businessType: BusinessType;
  plan: SubscriptionPlan;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
}

export interface UpdatePlatformTenantRequest {
  name: string;
  plan: SubscriptionPlan;
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
  parentCategoryId: string | null;
  parentName: string | null;
  kitchenStationId: string | null;
  depth: number;
  fullPath: string;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  displayOrder: number;
  parentCategoryId?: string | null;
  kitchenStationId?: string | null;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {
  id: string;
}

// Kitchen Stations -------------------------------------------------

export interface KitchenStationDto {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  displayOrder: number;
  description: string | null;
  isActive: boolean;
}

export interface CreateKitchenStationRequest {
  branchId: string;
  name: string;
  displayOrder: number;
  description: string | null;
}

export interface UpdateKitchenStationRequest {
  id: string;
  name: string;
  displayOrder: number;
  description: string | null;
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

export enum ProductType {
  Goods = 0,
  Service = 1,
  Combo = 2,
  Modifier = 3
}

export interface ProductDto {
  id: string;
  categoryId: string;
  unitId: string;
  brandId: string | null;
  taxRateId: string | null;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  basePriceAmount: number;
  basePriceCurrency: string;
  costPriceAmount: number | null;
  costPriceCurrency: string | null;
  type: ProductType;
  typeName: string;
  imageUrl: string | null;
  hsnCode: string | null;
  reorderPoint: number | null;
  weight: number | null;
  isTaxable: boolean;
  isSold: boolean;
  isPurchased: boolean;
  isActive: boolean;
  isAvailable: boolean;
  isStockTracked: boolean;
}

export interface CreateProductRequest {
  categoryId: string;
  unitId: string;
  brandId?: string | null;
  taxRateId?: string | null;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  basePriceAmount: number;
  basePriceCurrency: string;
  costPriceAmount?: number | null;
  costPriceCurrency?: string | null;
  type?: ProductType;
  imageUrl?: string | null;
  hsnCode?: string | null;
  reorderPoint?: number | null;
  weight?: number | null;
  isTaxable?: boolean;
  isSold?: boolean;
  isPurchased?: boolean;
  isStockTracked: boolean;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: string;
}

// Tax --------------------------------------------------------------

export interface TaxRateDto {
  id: string;
  name: string;
  percentage: number;
  isCompound: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateTaxRateRequest {
  name: string;
  percentage: number;
  isCompound: boolean;
  isDefault: boolean;
}

export interface UpdateTaxRateRequest extends CreateTaxRateRequest {
  id: string;
}

// Brands -----------------------------------------------------------

export interface BrandDto {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface CreateBrandRequest {
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface UpdateBrandRequest extends CreateBrandRequest {
  id: string;
}

// Customers / Contacts --------------------------------------------

export enum ContactType {
  Customer = 0,
  Supplier = 1,
  Both = 2,
  WalkIn = 3
}

export enum Gender {
  Male = 0,
  Female = 1,
  Other = 2
}

export interface AddressDto {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

export interface CustomerDto {
  id: string;
  type: ContactType;
  typeName: string;
  fullName: string;
  supplierBusinessName: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  notes: string | null;
  openingBalanceAmount: number;
  openingBalanceCurrency: string;
  currentBalanceAmount: number;
  currentBalanceCurrency: string;
  creditLimitAmount: number | null;
  creditLimitCurrency: string | null;
  billingAddress: AddressDto;
  shippingAddress: AddressDto;
  customerGroupId: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  genderName: string | null;
  totalRewardPoints: number;
  totalRewardPointsUsed: number;
  totalRewardPointsExpired: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  type?: ContactType;
  supplierBusinessName?: string | null;
  taxNumber?: string | null;
  openingBalanceAmount?: number;
  openingBalanceCurrency?: string;
  creditLimitAmount?: number | null;
  creditLimitCurrency?: string | null;
  billingAddress?: AddressDto | null;
  shippingAddress?: AddressDto | null;
  customerGroupId?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: string;
}

export interface LoyaltyPointsRequest {
  points: number;
}

// Customer Groups --------------------------------------------------

export interface CustomerGroupDto {
  id: string;
  name: string;
  discountPercent: number;
  description: string | null;
  isActive: boolean;
}

export interface CreateCustomerGroupRequest {
  name: string;
  discountPercent: number;
  description: string | null;
}

export interface UpdateCustomerGroupRequest extends CreateCustomerGroupRequest {
  id: string;
}

// Pricing ----------------------------------------------------------

export enum DaysOfWeekFlags {
  None      = 0,
  Sunday    = 1,
  Monday    = 2,
  Tuesday   = 4,
  Wednesday = 8,
  Thursday  = 16,
  Friday    = 32,
  Saturday  = 64,
  All       = 127
}

export interface PriceRuleDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string | null;
  branchName: string | null;
  name: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number;
  overridePriceAmount: number;
  overridePriceCurrency: string;
  priority: number;
  isActive: boolean;
}

export interface CreatePriceRuleRequest {
  productId: string;
  branchId: string | null;
  name: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: number;
  overridePriceAmount: number;
  overridePriceCurrency: string;
  priority: number;
}

export interface UpdatePriceRuleRequest extends Omit<CreatePriceRuleRequest, 'productId'> {
  id: string;
}

export interface ResolvedPriceDto {
  amount: number;
  currency: string;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
}

// Mix & Match Groups ----------------------------------------------

export enum MixMatchType {
  DiscountAmount = 0,
  PercentDiscount = 1,
  FixedPrice = 2
}

export interface MixMatchGroupDto {
  id: string;
  name: string;
  type: MixMatchType;
  typeName: string;
  quantity: number;
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  priority: number;
  stackable: boolean;
  productCount: number;
  isActive: boolean;
}

export interface MixMatchProductDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  costPriceAmount: number | null;
  retailPriceAmount: number;
  currency: string;
  netMarginPercent: number | null;
}

export interface MixMatchGroupDetailDto {
  id: string;
  name: string;
  type: MixMatchType;
  typeName: string;
  quantity: number;
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  priority: number;
  stackable: boolean;
  isActive: boolean;
  products: MixMatchProductDto[];
}

export interface CreateMixMatchGroupRequest {
  name: string;
  type: MixMatchType;
  quantity: number;
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  priority: number;
  stackable: boolean;
  productIds: string[];
}

export interface UpdateMixMatchGroupRequest extends CreateMixMatchGroupRequest {
  id: string;
}

// Restaurant: Floor Plans + Tables --------------------------------

export enum TableStatus {
  Available = 0,
  Occupied = 1,
  Reserved = 2,
  OutOfService = 3
}

export interface FloorPlanDto {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  displayOrder: number;
  tableCount: number;
  isActive: boolean;
}

export interface CreateFloorPlanRequest {
  branchId: string;
  name: string;
  displayOrder: number;
}

export interface UpdateFloorPlanRequest {
  id: string;
  name: string;
  displayOrder: number;
}

export interface TableDto {
  id: string;
  floorPlanId: string;
  floorPlanName: string;
  branchId: string;
  branchName: string;
  code: string;
  capacity: number;
  status: TableStatus;
  statusName: string;
  isActive: boolean;
}

export interface CreateTableRequest {
  floorPlanId: string;
  code: string;
  capacity: number;
}

export interface UpdateTableRequest {
  id: string;
  floorPlanId: string;
  code: string;
  capacity: number;
}

// Orders + POS -----------------------------------------------------

export enum OrderType { DineIn = 0, Takeaway = 1, Delivery = 2 }
export enum OrderStatus { Open = 0, Closed = 1, Voided = 2 }
export enum PaymentMethod { Cash = 0, Card = 1, BankTransfer = 2, Wallet = 3 }

export interface OrderLineModifierDto {
  id: string;
  modifierId: string;
  name: string;
  priceAdjustmentAmount: number;
}

export interface OrderLineDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPriceAmount: number;
  currency: string;
  notes: string | null;
  subtotal: number;
  taxRateId: string | null;
  taxRatePercentage: number;
  taxAmount: number;
  lineGrandTotal: number;
  modifiers: OrderLineModifierDto[];
}

export interface PaymentDto {
  id: string;
  method: PaymentMethod;
  methodName: string;
  amount: number;
  currency: string;
  reference: string | null;
  paidAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string | null;
  branchId: string;
  branchName: string;
  tableId: string | null;
  tableCode: string | null;
  customerId: string | null;
  customerName: string | null;
  type: OrderType;
  typeName: string;
  status: OrderStatus;
  statusName: string;
  currency: string;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  promotionDiscountAmount: number;
  grandTotalAmount: number;
  paidTotal: number;
  balance: number;
  rewardPointsEarned: number;
  rewardPointsRedeemed: number;
  rewardPointsRedeemedAmount: number;
  lines: OrderLineDto[];
  payments: PaymentDto[];
  promotions: OrderPromotionDto[];
}

export interface OrderPromotionDto {
  id: string;
  sourceGroupId: string;
  name: string;
  description: string | null;
  amount: number;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string | null;
  branchId: string;
  branchName: string;
  tableCode: string | null;
  customerName: string | null;
  type: OrderType;
  typeName: string;
  status: OrderStatus;
  statusName: string;
  currency: string;
  lineCount: number;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  grandTotalAmount: number;
  balance: number;
  openedAt: string;
  closedAt: string | null;
}

export interface OpenOrderRequest {
  branchId: string;
  tableId: string | null;
  customerId: string | null;
  type: OrderType;
  notes: string | null;
}

export interface AddOrderLineRequest {
  productId: string;
  quantity: number;
  notes: string | null;
  modifierIds: string[];
}

export interface AddPaymentRequest {
  method: PaymentMethod;
  amount: number;
  reference: string | null;
}

// Kitchen ----------------------------------------------------------

export enum KitchenTicketStatus { Pending = 0, Preparing = 1, Ready = 2, Served = 3 }

export interface KitchenTicketLineDto {
  productName: string;
  quantity: number;
  notes: string | null;
  kitchenStationId: string | null;
  kitchenStationName: string | null;
  modifiers: string[];
}

export interface KitchenTicketDto {
  id: string;
  orderId: string;
  orderNumber: string | null;
  branchId: string;
  branchName: string;
  tableCode: string | null;
  orderType: OrderType;
  orderTypeName: string;
  status: KitchenTicketStatus;
  statusName: string;
  openedAt: string;
  readyAt: string | null;
  servedAt: string | null;
  minutesOpen: number;
  involvedStationIds: string[];
  bumpedStationIds: string[];
  lines: KitchenTicketLineDto[];
}

// Cash Registers / Shifts -----------------------------------------

export enum ShiftStatus { Open = 0, Closed = 1 }

export enum ShiftMovementType {
  Sale = 0,
  Refund = 1,
  PaidOut = 2,
  CashIn = 3,
  CashOut = 4
}

export interface CashRegisterDto {
  id: string;
  branchId: string;
  branchName: string;
  code: string;
  name: string;
  isActive: boolean;
  activeShiftId: string | null;
}

export interface CreateCashRegisterRequest {
  branchId: string;
  code: string;
  name: string;
}

export interface UpdateCashRegisterRequest {
  id: string;
  code: string;
  name: string;
}

export interface CashRegisterShiftMovementDto {
  id: string;
  type: ShiftMovementType;
  typeName: string;
  amount: number;
  sourceId: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CashRegisterShiftDto {
  id: string;
  cashRegisterId: string;
  cashRegisterCode: string;
  cashRegisterName: string;
  branchId: string;
  branchName: string;
  openedByUserId: string;
  openedByUserName: string;
  openedAt: string;
  openingAmount: number;
  currency: string;
  closedByUserId: string | null;
  closedByUserName: string | null;
  closedAt: string | null;
  declaredClosingAmount: number | null;
  expectedClosingAmount: number | null;
  overShortAmount: number | null;
  notes: string | null;
  status: ShiftStatus;
  statusName: string;
  saleTotal: number;
  refundTotal: number;
  paidOutTotal: number;
  cashInTotal: number;
  cashOutTotal: number;
  movements: CashRegisterShiftMovementDto[];
}

export interface CashRegisterShiftSummaryDto {
  id: string;
  cashRegisterId: string;
  cashRegisterCode: string;
  openedByUserName: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  declaredClosingAmount: number | null;
  overShortAmount: number | null;
  status: ShiftStatus;
  statusName: string;
}

export interface OpenShiftRequest {
  cashRegisterId: string;
  openingAmount: number;
  currency: string;
}

export interface CloseShiftRequest {
  declaredClosingAmount: number;
  notes: string | null;
}

export interface AddShiftMovementRequest {
  type: ShiftMovementType;
  amount: number;
  reference: string | null;
  notes: string | null;
}

// Refunds ----------------------------------------------------------

export interface RefundLineDto {
  id: string;
  orderLineId: string;
  productId: string;
  productName: string;
  quantity: number;
  restock: boolean;
}

export interface RefundDto {
  id: string;
  orderId: string;
  orderNumber: string | null;
  branchId: string;
  refundedByUserId: string;
  refundedByUserName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  methodName: string;
  reason: string | null;
  refundedAt: string;
  lines: RefundLineDto[];
}

export interface RefundLineInput {
  orderLineId: string;
  quantity: number;
  restock: boolean;
}

export interface RefundOrderRequest {
  amount: number;
  method: PaymentMethod;
  reason: string | null;
  lines: RefundLineInput[] | null;
}

// Expenses ---------------------------------------------------------

export interface ExpenseDto {
  id: string;
  branchId: string;
  branchName: string;
  expenseAccountId: string;
  expenseAccountCode: string;
  expenseAccountName: string;
  reference: string;
  description: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  methodName: string;
  occurredAt: string;
  createdByUserId: string;
  createdByUserName: string;
}

export interface CreateExpenseRequest {
  branchId: string;
  expenseAccountId: string;
  reference: string;
  description: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  occurredAt: string | null;
}

// Recipe v2 extras -------------------------------------------------

export interface RecipeStepDto {
  id: string;
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
}

export interface RecipeStepInput {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
}

// Waste log --------------------------------------------------------

export enum WasteReason {
  Spoilage = 0,
  Breakage = 1,
  Theft = 2,
  PrepError = 3,
  Other = 99
}

export interface WasteLogDto {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  sku: string;
  productName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  quantityInProductUnit: number;
  productUnitCode: string;
  reason: WasteReason;
  reasonName: string;
  notes: string | null;
  createdByUserId: string;
  occurredAt: string;
}

export interface LogWasteRequest {
  branchId: string;
  productId: string;
  unitId: string;
  quantity: number;
  reason: WasteReason;
  notes: string | null;
  occurredAt: string | null;
}

// Purchase Orders --------------------------------------------------

export enum PurchaseOrderStatus {
  Draft = 0,
  Sent = 1,
  PartialReceived = 2,
  Closed = 3,
  Cancelled = 4
}

export enum SupplierBillStatus {
  Open = 0,
  PartiallyPaid = 1,
  Paid = 2,
  Cancelled = 3
}

export enum SupplierBillPaymentMethod {
  Cash = 0,
  Card = 1,
  BankTransfer = 2,
  Wallet = 3
}

export interface PurchaseOrderLineDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unitId: string;
  unitCode: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  lineTotal: number;
  notes: string | null;
}

export interface PurchaseOrderDto {
  id: string;
  branchId: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  number: string;
  status: PurchaseOrderStatus;
  statusName: string;
  expectedDate: string | null;
  currency: string;
  notes: string | null;
  subtotalAmount: number;
  taxAmount: number;
  grandTotalAmount: number;
  createdAt: string;
  sentAt: string | null;
  closedAt: string | null;
  lines: PurchaseOrderLineDto[];
}

export interface PurchaseOrderSummaryDto {
  id: string;
  number: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  statusName: string;
  expectedDate: string | null;
  grandTotalAmount: number;
  currency: string;
  createdAt: string;
}

export interface PurchaseOrderLineInput {
  productId: string;
  unitId: string;
  orderedQuantity: number;
  unitCost: number;
  notes: string | null;
}

export interface CreatePurchaseOrderRequest {
  branchId: string;
  supplierId: string;
  expectedDate: string | null;
  currency: string;
  notes: string | null;
  lines: PurchaseOrderLineInput[];
}

export interface ReceiveLineInput {
  lineId: string;
  quantity: number;
}

export interface ReceivePurchaseOrderRequest {
  supplierBillReference: string | null;
  billDate: string | null;
  dueDate: string | null;
  lines: ReceiveLineInput[];
}

export enum BillMatchStatus {
  NotMatched = 0,
  Matched = 1,
  OverBilled = 2,
  UnderBilled = 3,
  Disputed = 4
}

export interface SupplierBillDto {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  number: string;
  supplierBillReference: string | null;
  billDate: string;
  dueDate: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  currency: string;
  status: SupplierBillStatus;
  statusName: string;
  matchStatus: BillMatchStatus;
  matchStatusName: string;
  expectedAmount: number | null;
  discrepancyAmount: number | null;
  discrepancyReason: string | null;
  matchedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface UpdateSupplierBillRequest {
  amount: number;
  supplierBillReference: string | null;
  billDate: string;
  dueDate: string | null;
  notes: string | null;
}

// Stock transfer ---------------------------------------------------

export interface TransferStockRequest {
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  unitId: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  occurredAt: string | null;
}

export interface StockTransferResultDto {
  transferOutId: string;
  transferInId: string;
  quantityInProductUnit: number;
  productUnitCode: string;
}

// Reports ----------------------------------------------------------

export interface SalesByDayRow {
  day: string;
  orderCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  grand: number;
}

export interface SalesSummaryDto {
  from: string;
  to: string;
  orderCount: number;
  subtotalTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  refundTotal: number;
  netRevenue: number;
  byDay: SalesByDayRow[];
}

export interface TopProductRow {
  productId: string;
  sku: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface StockValuationRow {
  branchId: string;
  branchName: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number | null;
  value: number | null;
}

export interface StockValuationDto {
  totalValue: number;
  rows: StockValuationRow[];
}

// Modifiers --------------------------------------------------------

export interface ModifierDto {
  id: string;
  name: string;
  priceAdjustmentAmount: number;
  priceAdjustmentCurrency: string;
  displayOrder: number;
  isDefault: boolean;
}

export interface ModifierGroupDto {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
  modifiers: ModifierDto[];
}

export interface ModifierGroupSummaryDto {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  modifierCount: number;
  isActive: boolean;
}

export interface ModifierInput {
  name: string;
  priceAdjustmentAmount: number;
  priceAdjustmentCurrency: string;
  displayOrder: number;
  isDefault: boolean;
}

export interface CreateModifierGroupRequest {
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierInput[];
}

export interface UpdateModifierGroupRequest extends CreateModifierGroupRequest {
  id: string;
}

export interface SetProductModifierGroupsRequest {
  modifierGroupIds: string[];
}

// Recipes ----------------------------------------------------------

export interface RecipeIngredientDto {
  id: string;
  ingredientProductId: string;
  ingredientProductSku: string;
  ingredientProductName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  notes: string | null;
}

export interface RecipeDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  notes: string | null;
  batchYield: number;
  isActive: boolean;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
}

export interface RecipeSummaryDto {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  ingredientCount: number;
  isActive: boolean;
}

export interface RecipeIngredientInput {
  ingredientProductId: string;
  unitId: string;
  quantity: number;
  notes: string | null;
}

export interface CreateRecipeRequest {
  productId: string;
  notes: string | null;
  batchYield: number;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[] | null;
}

export interface UpdateRecipeRequest {
  id: string;
  notes: string | null;
  batchYield: number;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[] | null;
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
